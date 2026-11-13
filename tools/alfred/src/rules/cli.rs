use std::time::Duration;

use super::reach::ReachRequest;
use super::{AddRequest, AppendRequest, Found, SearchOptions};
use crate::client::{Client, ClientError, pretty};

pub const GUIDE: &str = include_str!("guide.md");
const SHORT_ID: usize = 8;
const NETWORK_MARGIN_MS: u64 = 500;

pub async fn search(
    client: Client,
    opts: &SearchOptions,
    json: bool,
) -> Result<String, ClientError> {
    let timeout = opts
        .timeout
        .map(|ms| Duration::from_millis(ms + NETWORK_MARGIN_MS));
    let client = match timeout {
        Some(timeout) => client.with_timeout(timeout),
        None => client,
    };
    let found: Result<Vec<Found>, ClientError> = client
        .get(
            "/rules/search",
            &search_query(opts)
                .iter()
                .map(|(k, v)| (*k, v.as_str()))
                .collect::<Vec<_>>(),
        )
        .await;
    match found {
        Ok(found) => Ok(if json {
            pretty(&found)
        } else {
            render_blocks(&found)
        }),
        Err(error) => {
            let timed_out = timeout.is_some()
                && match &error {
                    ClientError::Unreachable { source, .. }
                    | ClientError::BadReply { source, .. } => source.is_timeout(),
                    ClientError::Api { code, .. } => *code == 504,
                    ClientError::NoUrl | ClientError::Input(_) => false,
                };
            if timed_out {
                Ok(String::new())
            } else {
                Err(error)
            }
        }
    }
}

pub(crate) fn render_blocks(found: &[Found]) -> String {
    let mut blocks: Vec<String> = Vec::new();
    for found in found {
        let short: String = found.rule.id.chars().take(SHORT_ID).collect();
        let mut block = format!("-- {short}");
        for line in &found.rule.body.do_ {
            block.push('\n');
            block.push_str(line);
        }
        blocks.push(block);
    }
    let mut result = blocks.join("\n");
    if !result.is_empty() {
        result.push('\n');
    }
    debug_assert!(
        found.is_empty() == result.is_empty(),
        "render_blocks: empty only for no rules"
    );
    debug_assert!(
        result.matches("-- ").count() >= found.len(),
        "render_blocks: one block per rule"
    );
    result
}

pub(crate) fn prompts_of(stdin: &str) -> Result<Vec<String>, String> {
    let result: Result<Vec<String>, String> = serde_json::from_str::<serde_json::Value>(stdin)
        .map_err(|error| error.to_string())
        .and_then(|value| {
            let items = value.as_array().ok_or("expected a list of {text}")?;
            let mut prompts = Vec::new();
            for item in items {
                let text = item
                    .get("text")
                    .and_then(|text| text.as_str())
                    .ok_or("expected a list of {text}")?;
                let text = text.trim();
                if !text.is_empty() {
                    prompts.push(text.to_string());
                }
            }
            Ok(prompts)
        });
    debug_assert!(
        result
            .as_ref()
            .map_or(true, |p| p.iter().all(|t| !t.trim().is_empty())),
        "prompts_of: no blank prompt"
    );
    result
}

#[derive(Debug, clap::Subcommand)]
pub enum RulesCommand {
    Search {
        query: String,
        #[arg(long, default_value_t = 10)]
        limit: u32,
        #[arg(long)]
        tags: Vec<String>,
        #[arg(long)]
        min_score: Option<f32>,
        #[arg(long)]
        json: bool,
        #[arg(long)]
        no_hits: bool,
        #[arg(long)]
        no_archived: bool,
        #[arg(long)]
        timeout: Option<u64>,
    },
    Add(AddRequest),
    List {
        #[arg(long)]
        tags: Vec<String>,
    },
    Meta {
        id: String,
    },
    Delete {
        id: String,
    },
    AppendDo {
        id: String,
        #[arg(long = "do")]
        do_: String,
    },
    Refine {
        #[arg(long)]
        apply: bool,
    },
    Near {
        #[arg(long)]
        min: f32,
        #[arg(long, default_value_t = 100)]
        limit: u32,
    },
    Reach {
        #[arg(long, default_value_t = 2)]
        limit: u32,
        #[arg(long, default_value_t = 0.5)]
        min_score: f32,
    },
    Guide,
}

pub async fn run(command: RulesCommand) -> Result<String, ClientError> {
    match command {
        RulesCommand::Guide => Ok(GUIDE.to_owned()),
        RulesCommand::Search {
            query,
            limit,
            tags,
            min_score,
            json,
            no_hits,
            no_archived,
            timeout,
        } => {
            let options = SearchOptions {
                q: query,
                limit: Some(limit),
                tags: (!tags.is_empty()).then(|| tags.join(",")),
                min_score,
                hits: no_hits.then_some(false),
                archived: no_archived.then_some(false),
                timeout,
            };
            search(Client::from_env()?, &options, json).await
        }
        other => dispatch(&Client::from_env()?, other).await,
    }
}

async fn dispatch(client: &Client, command: RulesCommand) -> Result<String, ClientError> {
    let reply: serde_json::Value = match command {
        RulesCommand::Add(request) => client.post("/rules", &request).await?,
        RulesCommand::List { tags } => {
            let tags = tags.join(",");
            let query: Vec<(&str, &str)> = [("tags", tags.as_str())]
                .into_iter()
                .filter(|(_, v)| !v.is_empty())
                .collect();
            client.get("/rules", &query).await?
        }
        RulesCommand::Meta { id } => client.get(&format!("/rules/{id}"), &[]).await?,
        RulesCommand::Delete { id } => client.delete(&format!("/rules/{id}")).await?,
        RulesCommand::AppendDo { id, do_ } => {
            client
                .post(&format!("/rules/{id}/do"), &AppendRequest { do_ })
                .await?
        }
        RulesCommand::Refine { apply: true } => client.post("/rules/refine", &()).await?,
        RulesCommand::Refine { apply: false } => client.get("/rules/refine", &[]).await?,
        RulesCommand::Near { min, limit } => {
            client
                .get(
                    "/rules/near",
                    &[
                        ("min", min.to_string().as_str()),
                        ("limit", limit.to_string().as_str()),
                    ],
                )
                .await?
        }
        RulesCommand::Reach { limit, min_score } => {
            client
                .post("/rules/reach", &reach_request(limit, min_score)?)
                .await?
        }
        RulesCommand::Search { .. } | RulesCommand::Guide => {
            unreachable!("rules.cli.dispatch: run handles search and guide")
        }
    };
    Ok(pretty(&reply))
}

fn search_query(opts: &SearchOptions) -> Vec<(&'static str, String)> {
    let mut query = vec![("q", opts.q.clone())];
    query.extend(opts.limit.map(|v| ("limit", v.to_string())));
    query.extend(opts.tags.clone().map(|v| ("tags", v)));
    query.extend(opts.min_score.map(|v| ("min_score", v.to_string())));
    query.extend(opts.hits.map(|v| ("hits", v.to_string())));
    query.extend(opts.archived.map(|v| ("archived", v.to_string())));
    query.extend(opts.timeout.map(|v| ("timeout", v.to_string())));
    query
}

fn reach_request(limit: u32, min_score: f32) -> Result<ReachRequest, ClientError> {
    let mut stdin = String::new();
    std::io::Read::read_to_string(&mut std::io::stdin(), &mut stdin)
        .map_err(|e| ClientError::Input(e.to_string()))?;
    let prompts = prompts_of(&stdin).map_err(ClientError::Input)?;
    Ok(ReachRequest {
        prompts,
        limit: Some(limit),
        min_score: Some(min_score),
    })
}
