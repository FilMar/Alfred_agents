use std::path::PathBuf;

use super::EpisodeHit;
pub use super::command::HistCommand;
use super::ingest::{self, Roots, Summary, hostname, modified_at};
use crate::client::{Client, ClientError, pretty};

pub const SHORT_ID: usize = 8;

type Request = (String, Vec<(&'static str, String)>);

pub async fn run(command: HistCommand) -> Result<String, ClientError> {
    match command {
        HistCommand::Ingest {
            transcript,
            session,
            all,
            since,
            refresh,
        } => ingest(transcript, session, all, since, refresh).await,
        HistCommand::Search {
            query,
            limit,
            min_score,
            since,
            until,
            json,
        } => search(query, limit, min_score, since, until, json).await,
        HistCommand::Show { id, tools } => show(&id, tools).await,
        HistCommand::Distilled { ids } => distilled(&ids).await,
        other => {
            let (path, query) = request_of(other)?;
            let reply: serde_json::Value = get_json(&Client::from_env()?, &path, &query).await?;
            Ok(pretty(&reply))
        }
    }
}

pub(crate) fn request_of(command: HistCommand) -> Result<Request, ClientError> {
    match command {
        HistCommand::Sessions { limit, harness } => sessions_request(limit, harness),
        HistCommand::Episode { id } => Ok((format!("/hist/episodes/{id}"), Vec::new())),
        HistCommand::Cost {
            by,
            since,
            session,
            limit,
        } => cost_request(by, since, session, limit),
        HistCommand::Prompts { since, until } => Ok((
            "/hist/prompts".into(),
            pairs([("since", since), ("until", until)]),
        )),
        HistCommand::Pending { limit } => Ok((
            "/hist/exchanges".into(),
            pairs([
                ("distilled", Some("false".into())),
                ("limit", Some(limit.to_string())),
            ]),
        )),
        HistCommand::Extractions {
            extractor,
            run,
            exchange,
            kept,
        } => {
            let kept = kept.then(|| "true".to_string());
            let found = [
                ("extractor_id", extractor.map(|e| e.to_string())),
                ("run", run),
                ("exchange_id", exchange),
                ("kept", kept),
            ];
            Ok(("/hist/extractions".into(), pairs(found)))
        }
        HistCommand::Ingest { .. }
        | HistCommand::Search { .. }
        | HistCommand::Show { .. }
        | HistCommand::Distilled { .. } => {
            unreachable!("hist.request_of: run handles ingest, search, show and distilled")
        }
    }
}

fn sessions_request(limit: i64, harness: Option<String>) -> Result<Request, ClientError> {
    if harness
        .as_deref()
        .is_some_and(|h| !matches!(h, "claude" | "pi"))
    {
        return Err(input("--harness must be claude or pi."));
    }
    Ok((
        "/hist/sessions".into(),
        pairs([("limit", Some(limit.to_string())), ("harness", harness)]),
    ))
}

fn cost_request(
    by: String,
    since: Option<String>,
    session: Option<String>,
    limit: i64,
) -> Result<Request, ClientError> {
    if !matches!(by.as_str(), "day" | "session" | "model") {
        return Err(input("--by must be session, day or model."));
    }
    Ok((
        "/hist/cost".into(),
        pairs([
            ("by", Some(by)),
            ("limit", Some(limit.to_string())),
            ("since", since),
            ("session", session),
        ]),
    ))
}

fn pairs<const N: usize>(
    found: [(&'static str, Option<String>); N],
) -> Vec<(&'static str, String)> {
    found
        .into_iter()
        .filter_map(|(key, value)| value.map(|v| (key, v)))
        .collect()
}

async fn ingest(
    transcript: Option<PathBuf>,
    session: Option<String>,
    all: bool,
    since: Option<String>,
    refresh: bool,
) -> Result<String, ClientError> {
    let roots = Roots::from_env();
    let paths: Vec<PathBuf> = match (transcript, session, all) {
        (Some(path), None, false) => vec![path],
        (None, Some(id), false) => vec![roots.find(&id).ok_or_else(|| {
            input(&format!(
                "No transcript for session {id} under {} or {}",
                roots.claude.display(),
                roots.pi.display()
            ))
        })?],
        (None, None, true) => roots
            .all()
            .into_iter()
            .filter(|p| {
                since
                    .as_ref()
                    .is_none_or(|s| modified_at(p).is_some_and(|m| m >= *s))
            })
            .collect(),
        _ => {
            return Err(input(
                "Use exactly one of --transcript, --session or --all.",
            ));
        }
    };
    let client = Client::from_env()?;
    let host = hostname();
    let mut total = Summary::default();
    for path in &paths {
        total = total.plus(ingest::transcript(&client, path, refresh, host.as_deref()).await?);
    }
    Ok(pretty(&total))
}

async fn search(
    query: String,
    limit: u32,
    min_score: f32,
    since: Option<String>,
    until: Option<String>,
    json: bool,
) -> Result<String, ClientError> {
    let client = Client::from_env()?;
    let period: Vec<(&str, String)> = [since.map(|s| ("since", s)), until.map(|u| ("until", u))]
        .into_iter()
        .flatten()
        .collect();
    let ask = |limit: String, min: String| {
        [
            vec![("q", query.clone()), ("limit", limit), ("min_score", min)],
            period.clone(),
        ]
        .concat()
    };
    let hits: Vec<EpisodeHit> = get_json(
        &client,
        "/hist/search",
        &ask(limit.to_string(), min_score.to_string()),
    )
    .await?;
    if hits.is_empty() && min_score > 0.0 && !json {
        let best: Vec<EpisodeHit> =
            get_json(&client, "/hist/search", &ask("1".into(), "0".into())).await?;
        if let Some(top) = best.first() {
            eprintln!("{}", low_score_hint(min_score, top.score));
        }
    }
    Ok(if json {
        pretty(&hits)
    } else {
        render_episodes(&hits)
    })
}

async fn show(id: &str, tools: bool) -> Result<String, ClientError> {
    let client = Client::from_env()?;
    let exchange: serde_json::Map<String, serde_json::Value> =
        get_json(&client, &format!("/hist/exchanges/{id}"), &[]).await?;
    let query: Vec<(&str, String)> = if tools {
        vec![("tools", "true".into())]
    } else {
        Vec::new()
    };
    let contents: super::Contents =
        get_json(&client, &format!("/hist/contents/{id}"), &query).await?;
    let texts = [
        ("input", Some(contents.input)),
        ("output", Some(contents.output)),
    ];
    let shown: serde_json::Map<String, serde_json::Value> = exchange
        .into_iter()
        .chain(
            texts
                .into_iter()
                .chain([("tools", contents.tools)])
                .filter_map(|(k, v)| Some((k.to_string(), v?.into()))),
        )
        .collect();
    Ok(pretty(&shown))
}

async fn distilled(ids: &[String]) -> Result<String, ClientError> {
    let client = Client::from_env()?;
    let at = crate::rules::iso(jiff::Timestamp::now());
    for id in ids {
        let _: serde_json::Value = client
            .patch(
                &format!("/hist/exchanges/{id}"),
                &serde_json::json!({ "distilled": at }),
            )
            .await?;
    }
    Ok(pretty(
        &serde_json::json!({ "distilled": ids.len(), "at": at }),
    ))
}

fn input(message: &str) -> ClientError {
    ClientError::Input(message.to_owned())
}

pub(crate) fn render_episodes(hits: &[EpisodeHit]) -> String {
    let result: String = hits
        .iter()
        .map(|hit| {
            let short: String = hit.episode.id.chars().take(SHORT_ID).collect();
            let day: String = hit.episode.from.chars().take(10).collect();
            format!("-- {short} {day}\n{}\n", hit.episode.summary)
        })
        .collect::<Vec<String>>()
        .concat();
    debug_assert!(
        hits.is_empty() == result.is_empty(),
        "render_episodes: empty only for no hits"
    );
    debug_assert!(
        result.matches("-- ").count() >= hits.len(),
        "render_episodes: one block per episode"
    );
    result
}

pub(crate) fn low_score_hint(min_score: f32, best: f32) -> String {
    let result: String = format!(
        "No episode scores {} or more. The best is {:.3}: try --min-score {:.1}.",
        min_score,
        best,
        (best * 10.0).floor() / 10.0
    );
    debug_assert!(
        result.starts_with("No episode scores "),
        "low_score_hint: the tl wording"
    );
    result
}

pub(crate) async fn get_json<T: serde::de::DeserializeOwned>(
    client: &Client,
    path: &str,
    query: &[(&str, String)],
) -> Result<T, ClientError> {
    let query: Vec<(&str, &str)> = query.iter().map(|(k, v)| (*k, v.as_str())).collect();
    client.get(path, &query).await
}
