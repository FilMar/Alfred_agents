use std::time::Duration;

use super::near::NearPair;
use super::reach::{ReachReply, ReachRequest};
use super::refine::{ApplyReply, RefineReport};
use super::{AddRequest, AppendRequest, DeleteReply, Found, Rule, SearchOptions};
use crate::client::{Client, ClientError};

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
    let result: Result<String, ClientError> = match found {
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
    };
    result
}

pub async fn add(client: &Client, request: &AddRequest) -> Result<String, ClientError> {
    let reply: Rule = client.post("/rules", request).await?;
    Ok(pretty(&reply))
}

pub async fn list(client: &Client, tags: &[String]) -> Result<String, ClientError> {
    let joined = tags.join(",");
    let query: Vec<(&str, &str)> = if joined.is_empty() {
        Vec::new()
    } else {
        vec![("tags", joined.as_str())]
    };
    let reply: Result<Vec<Rule>, ClientError> = client.get("/rules", &query).await;
    let result: Result<String, ClientError> = reply.map(|reply| pretty(&reply));
    result
}

pub async fn meta(client: &Client, id: &str) -> Result<String, ClientError> {
    let reply: Rule = client.get(&format!("/rules/{id}"), &[]).await?;
    Ok(pretty(&reply))
}

pub async fn delete(client: &Client, id: &str) -> Result<String, ClientError> {
    let reply: DeleteReply = client.delete(&format!("/rules/{id}")).await?;
    Ok(pretty(&reply))
}

pub async fn append_do(
    client: &Client,
    id: &str,
    request: &AppendRequest,
) -> Result<String, ClientError> {
    let reply: Rule = client.post(&format!("/rules/{id}/do"), request).await?;
    Ok(pretty(&reply))
}

pub async fn refine(client: &Client, apply: bool) -> Result<String, ClientError> {
    let result: Result<String, ClientError> = if apply {
        client
            .post::<_, ApplyReply>("/rules/refine", &())
            .await
            .map(|r| pretty(&r))
    } else {
        client
            .get::<RefineReport>("/rules/refine", &[])
            .await
            .map(|r| pretty(&r))
    };
    result
}

pub async fn near(client: &Client, min: f32, limit: u32) -> Result<String, ClientError> {
    let query = [("min", min.to_string()), ("limit", limit.to_string())];
    let query: Vec<(&str, &str)> = query.iter().map(|(k, v)| (*k, v.as_str())).collect();
    let reply: Vec<NearPair> = client.get("/rules/near", &query).await?;
    Ok(pretty(&reply))
}

pub async fn reach(client: &Client, request: &ReachRequest) -> Result<String, ClientError> {
    let reply: ReachReply = client.post("/rules/reach", request).await?;
    Ok(pretty(&reply))
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

fn pretty<T: serde::Serialize>(value: &T) -> String {
    serde_json::to_string_pretty(value).map_or_else(|e| e.to_string(), |s| s + "\n")
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
    Add {
        #[arg(long = "if")]
        if_: String,
        #[arg(long = "do")]
        do_: String,
        #[arg(long)]
        tags: Vec<String>,
        #[arg(long)]
        exchange: Option<String>,
    },
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
    let result: Result<String, ClientError> = match command {
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
    };
    result
}

async fn dispatch(client: &Client, command: RulesCommand) -> Result<String, ClientError> {
    match command {
        RulesCommand::Add {
            if_,
            do_,
            tags,
            exchange,
        } => {
            add(
                client,
                &AddRequest {
                    if_,
                    do_,
                    tags,
                    exchange,
                },
            )
            .await
        }
        RulesCommand::List { tags } => list(client, &tags).await,
        RulesCommand::Meta { id } => meta(client, &id).await,
        RulesCommand::Delete { id } => delete(client, &id).await,
        RulesCommand::AppendDo { id, do_ } => append_do(client, &id, &AppendRequest { do_ }).await,
        RulesCommand::Refine { apply } => refine(client, apply).await,
        RulesCommand::Near { min, limit } => near(client, min, limit).await,
        RulesCommand::Reach { limit, min_score } => {
            let mut stdin = String::new();
            std::io::Read::read_to_string(&mut std::io::stdin(), &mut stdin)
                .map_err(|e| ClientError::Input(e.to_string()))?;
            let prompts = prompts_of(&stdin).map_err(ClientError::Input)?;
            reach(
                client,
                &ReachRequest {
                    prompts,
                    limit: Some(limit),
                    min_score: Some(min_score),
                },
            )
            .await
        }
        RulesCommand::Search { .. } | RulesCommand::Guide => {
            unreachable!("rules.cli.dispatch: run handles search and guide")
        }
    }
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
