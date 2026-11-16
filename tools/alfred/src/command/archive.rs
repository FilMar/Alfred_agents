use std::time::Duration;

use jiff::Timestamp;
use serde::{Deserialize, Serialize};
use serde_json::Value;

use super::job::Status;
use super::spool::Spool;
use crate::client::{Client, ClientError};
use crate::hist::ingest::harness::Harness;
use crate::hist::ingest::line::Line;
use crate::hist::ingest::transcript::{join_body, join_tools};
use crate::hist::validate::is_timestamp;
use crate::hist::{Contents, Exchange, Session};

pub const DEADLINE: Duration = Duration::from_secs(2);

#[derive(Debug, Clone, PartialEq)]
pub struct FinishedRun {
    pub id: String,
    pub label: String,
    pub task: String,
    pub skill: Option<String>,
    pub thinking: Option<String>,
    pub timeout_s: Option<u32>,
    pub status: Status,
    pub started_at: Timestamp,
    pub finished_at: Timestamp,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RunRows {
    pub session: Session,
    pub exchange: Exchange,
    pub contents: Contents,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Archived {
    Sent,
    Spooled,
    Lost,
}

pub fn rows(run: &FinishedRun, messages: &[Value], host: Option<&str>, cwd: &str) -> RunRows {
    let pi = Harness::Pi;
    let lines = answer_lines(messages);
    let body: Vec<&Line> = lines.iter().collect();
    let [tokens_in, tokens_out, cache_read, cache_write] = pi.tokens_of(&body);
    let cost: f64 = body
        .iter()
        .filter_map(|line| pi.usage(line)?.cost.as_ref()?.total)
        .sum();
    let id = crate::hist::episodes::derived_id(&run.id, "run");
    let texts: Vec<String> = body.iter().map(|line| pi.text_of(line)).collect();
    let tools: Vec<String> = body.iter().map(|line| pi.tools_of(line)).collect();
    let started = iso(run.started_at);
    let result = RunRows {
        session: Session {
            id: run.id.clone(),
            started: started.clone(),
            harness: Some(pi.name().to_string()),
            host: host.map(str::to_string),
            path: Some(cwd.to_string()),
        },
        exchange: Exchange {
            id: id.clone(),
            session: run.id.clone(),
            parent: None,
            timestamp: started,
            kind: "subtask".to_string(),
            actor: run.label.clone(),
            model: pi.model(&body),
            tokens_in: Some(tokens_in),
            tokens_out: Some(tokens_out),
            tokens_cache_read: Some(cache_read),
            tokens_cache_write: Some(cache_write),
            distilled: None,
            meta: Some(meta(run, cost)),
        },
        contents: Contents {
            exchange_id: id,
            input: run.task.clone(),
            output: join_body(&texts),
            tools: join_tools(&tools),
        },
    };
    debug_assert!(
        result.exchange.kind == "subtask",
        "archive.rows: kind is subtask"
    );
    debug_assert!(
        result.exchange.actor == run.label,
        "archive.rows: the actor is the label"
    );
    debug_assert!(
        result.session.harness.as_deref() == Some("pi"),
        "archive.rows: the harness is pi"
    );
    debug_assert!(
        result.exchange.id == crate::hist::episodes::derived_id(&run.id, "run"),
        "archive.rows: the id derives from the run"
    );
    debug_assert!(
        is_timestamp(&result.session.started),
        "archive.rows: the start is a hist timestamp"
    );
    result
}

fn answer_lines(messages: &[Value]) -> Vec<Line> {
    messages
        .iter()
        .filter_map(|message| {
            serde_json::from_value(serde_json::json!({"type": "message", "message": message})).ok()
        })
        .filter(|line| !Harness::Pi.is_opener(line))
        .collect()
}

fn iso(at: Timestamp) -> String {
    at.strftime("%Y-%m-%dT%H:%M:%S%.3fZ").to_string()
}

fn meta(run: &FinishedRun, cost: f64) -> Value {
    let duration_s =
        (run.finished_at.as_millisecond() - run.started_at.as_millisecond() + 500) / 1000;
    let optional = [
        run.timeout_s.map(|s| ("timeout_s", Value::from(s))),
        run.thinking.clone().map(|t| ("thinking", Value::from(t))),
        run.skill.clone().map(|s| ("skill", Value::from(s))),
        (cost > 0.0).then(|| ("cost_usd", Value::from(cost))),
    ];
    let fixed = [
        ("status", Value::from(run.status.text())),
        ("finished_at", Value::from(iso(run.finished_at))),
        ("duration_s", Value::from(duration_s)),
    ];
    Value::Object(
        fixed
            .into_iter()
            .chain(optional.into_iter().flatten())
            .map(|(key, value)| (key.to_string(), value))
            .collect(),
    )
}

pub async fn send(client: &Client, rows: &RunRows) -> Result<(), ClientError> {
    let _: Value = client.post("/hist/sessions", &[&rows.session]).await?;
    let _: Value = client.post("/hist/exchanges", &[&rows.exchange]).await?;
    let _: Value = client.post("/hist/contents", &[&rows.contents]).await?;
    Ok(())
}

pub async fn archive(
    client: Option<&Client>,
    rows: &RunRows,
    name: &str,
    spool: &Spool,
) -> Archived {
    let sent = match client {
        Some(client) => match tokio::time::timeout(DEADLINE, send(client, rows)).await {
            Ok(Ok(())) => true,
            Ok(Err(err)) => {
                eprintln!("warn: archive unreachable, run spooled: {err}");
                false
            }
            Err(_) => {
                eprintln!("warn: archive unreachable, run spooled: no answer in 2s");
                false
            }
        },
        None => false,
    };
    let result = if sent {
        Archived::Sent
    } else {
        match spool.write(name, rows) {
            Ok(()) => Archived::Spooled,
            Err(err) => {
                eprintln!("warn: run not spooled either, history lost: {err}");
                Archived::Lost
            }
        }
    };
    debug_assert!(
        result != Archived::Spooled || spool.path(name).exists(),
        "archive.archive: a spooled run has its spool file"
    );
    result
}
