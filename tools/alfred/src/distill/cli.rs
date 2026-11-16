use std::path::PathBuf;
use std::time::Duration;

use clap::{Args, Subcommand};
use jiff::Timestamp;
use serde_json::Value;

use super::config::Config;
use super::run::Options;
use super::twin::SAME_SESSION_CUTOFF;
use crate::client::{Client, ClientError, pretty};
use crate::hist::Extractor as Row;

#[derive(Debug, Clone, PartialEq, Args)]
pub struct DistillArgs {
    pub session: Option<String>,
    #[arg(long, default_value = "active")]
    pub extractor: String,
    #[arg(long)]
    pub active: bool,
    #[arg(long)]
    pub max_saved: Option<u32>,
    #[arg(long, default_value_t = SAME_SESSION_CUTOFF)]
    pub same_session_cutoff: f32,
    #[arg(long)]
    pub status: bool,
}

#[derive(Debug, Clone, PartialEq, Subcommand)]
pub enum ExtractorCommand {
    Add {
        file: PathBuf,
        #[arg(long)]
        why: String,
        #[arg(long)]
        parent: Option<i64>,
    },
    Show {
        #[arg(default_value = "active")]
        id: String,
    },
    Activate {
        id: i64,
    },
}

pub async fn distill(client: &Client, args: &DistillArgs) -> Result<String, ClientError> {
    if args.status {
        client
            .get::<Value>("/distill/status", &[])
            .await
            .map(|status| pretty(&status))
    } else {
        async {
            let options = options_of(args)?;
            let progress = client.post::<Options, Value>("/distill", &options).await?;
            let run = progress["run"].as_str().unwrap_or_default().to_string();
            wait(client, &run).await.map(|report| pretty(&report))
        }
        .await
    }
}

pub const POLL: Duration = Duration::from_secs(5);
pub const MAX_POLLS: u32 = 17_280;

pub async fn wait(client: &Client, run: &str) -> Result<Value, ClientError> {
    let mut found: Result<Option<Value>, ClientError> = Ok(None);
    let mut polls: u32 = 0;
    while matches!(found, Ok(None)) && polls < MAX_POLLS {
        tokio::time::sleep(POLL).await;
        found = client
            .get::<Value>("/distill/status", &[])
            .await
            .map(|status| finished(&status, run));
        polls += 1;
    }
    let result: Result<Value, ClientError> = found.and_then(|report| {
        report.ok_or_else(|| {
            ClientError::Input("distill: the run is still going, see --status".to_string())
        })
    });
    debug_assert!(
        result
            .as_ref()
            .map_or(true, |r| r["run"].as_str() == Some(run)),
        "wait: the report is of the run started"
    );
    result
}

pub fn finished(status: &Value, run: &str) -> Option<Value> {
    let running = status["running"]["run"].as_str() == Some(run);
    let last = status["last"]["run"].as_str() == Some(run);
    let result: Option<Value> = (!running && last).then(|| status["last"].clone());
    debug_assert!(
        result.is_none() || status["running"]["run"].as_str() != Some(run),
        "finished: a running run is not finished"
    );
    result
}

pub fn options_of(args: &DistillArgs) -> Result<Options, ClientError> {
    let extractor = match args.extractor.as_str() {
        "active" => Ok(None),
        other => other.parse::<i64>().map(Some).map_err(|_| {
            ClientError::Input(format!(
                "--extractor must be a row id or active, got {other}"
            ))
        }),
    };
    let result: Result<Options, ClientError> = match (extractor, args.max_saved) {
        (_, Some(0)) => Err(ClientError::Input(
            "--max-saved must be a positive integer".to_string(),
        )),
        (Err(e), _) => Err(e),
        (Ok(extractor), max_saved) => Ok(Options {
            session: args.session.clone(),
            extractor,
            active: args.active,
            max_saved,
            same_session_cutoff: Some(args.same_session_cutoff),
        }),
    };
    debug_assert!(
        result.as_ref().map_or(true, |o| o.active == args.active),
        "options_of: the mode is the one asked"
    );
    debug_assert!(
        result.as_ref().map_or(true, |o| o.session == args.session),
        "options_of: the session is the one asked"
    );
    result
}

pub async fn extractor(
    client: &Client,
    command: &ExtractorCommand,
    now: Timestamp,
) -> Result<String, ClientError> {
    match command {
        ExtractorCommand::Add { file, why, parent } => {
            async {
                let text = std::fs::read_to_string(file).map_err(|e| {
                    ClientError::Input(format!("cannot read {}: {e}", file.display()))
                })?;
                let config = config_of(&text).map_err(ClientError::Input)?;
                add(client, &config, why, *parent, now)
                    .await
                    .map(|row| pretty(&row))
            }
            .await
        }
        ExtractorCommand::Show { id } => client
            .get::<Row>(&format!("/hist/extractors/{id}"), &[])
            .await
            .map(|row| pretty(&row)),
        ExtractorCommand::Activate { id } => {
            async {
                let path = format!("/hist/extractors/{id}");
                client
                    .patch::<Value, Value>(&path, &serde_json::json!({ "active": true }))
                    .await?;
                client.get::<Row>(&path, &[]).await.map(|row| pretty(&row))
            }
            .await
        }
    }
}

pub async fn add(
    client: &Client,
    config: &Config,
    why: &str,
    parent: Option<i64>,
    now: Timestamp,
) -> Result<Row, ClientError> {
    debug_assert!(!why.trim().is_empty(), "add: why is not blank");
    let row = crate::hist::NewExtractor {
        parent,
        why: why.to_string(),
        config: serde_json::to_string(config).expect("add: the config serializes"),
        created: crate::rules::iso(now),
    };
    let result: Result<Row, ClientError> = async {
        let added = client.post::<_, Value>("/hist/extractors", &row).await?;
        let id = added["id"].as_i64().unwrap_or_default();
        client
            .get::<Row>(&format!("/hist/extractors/{id}"), &[])
            .await
    }
    .await;
    debug_assert!(
        result.as_ref().map_or(true, |r| !r.active),
        "add: a new row is inactive"
    );
    debug_assert!(
        result
            .as_ref()
            .map_or(true, |r| config_of(&r.config).as_ref() == Ok(config)),
        "add: the row read back holds the config given"
    );
    debug_assert!(
        result.as_ref().map_or(true, |r| r.parent == parent),
        "add: the row read back holds the parent"
    );
    debug_assert!(
        result.as_ref().map_or(true, |r| r.why == why),
        "add: the row read back holds why"
    );
    result
}

pub fn config_of(text: &str) -> Result<Config, String> {
    let result: Result<Config, String> = serde_json::from_str::<Config>(text)
        .map_err(|e| format!("the file is not an extractor config: {e}"))
        .and_then(|config| super::config::bad_config(&config).map_or(Ok(config), Err));
    debug_assert!(
        result
            .as_ref()
            .map_or(true, |c| super::config::bad_config(c).is_none()),
        "config_of: the config passes the check"
    );
    result
}
