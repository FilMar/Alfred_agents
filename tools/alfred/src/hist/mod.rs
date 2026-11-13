pub mod cli;
pub mod command;
pub mod db;
pub mod episodes;
pub mod ingest;
mod js;
pub mod routes;
pub mod stats;
pub mod validate;

use serde::{Deserialize, Serialize};
use serde_json::Value;

pub const DEFAULT_LIMIT: i64 = 100;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Session {
    pub id: String,
    pub started: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub harness: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub host: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Exchange {
    pub id: String,
    pub session: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub parent: Option<String>,
    pub timestamp: String,
    pub kind: String,
    pub actor: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tokens_in: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tokens_out: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tokens_cache_read: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tokens_cache_write: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub distilled: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub meta: Option<Value>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Contents {
    pub exchange_id: String,
    pub input: String,
    pub output: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tools: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct NewExtractor {
    #[serde(default)]
    pub parent: Option<i64>,
    pub why: String,
    pub config: String,
    pub created: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Extractor {
    pub id: i64,
    pub parent: Option<i64>,
    pub why: String,
    pub active: bool,
    pub config: String,
    pub created: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct NewExtraction {
    pub extractor_id: i64,
    pub run: String,
    pub exchange_id: String,
    pub kind: String,
    pub body: String,
    pub quote: String,
    #[serde(default)]
    pub dropped_by: Option<String>,
    #[serde(default)]
    pub probabilities: Option<String>,
    #[serde(default)]
    pub verdict: Option<String>,
    #[serde(default)]
    pub of: Option<String>,
    #[serde(default)]
    pub saved_id: Option<String>,
    pub created: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Extraction {
    pub id: i64,
    #[serde(flatten)]
    pub row: NewExtraction,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Episode {
    pub id: String,
    pub session: String,
    pub exchanges: Vec<String>,
    pub from: String,
    pub to: String,
    pub summary: String,
    pub extractor: i64,
    pub model: String,
    pub created: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct EpisodeHit {
    pub episode: Episode,
    pub score: f32,
}

#[derive(Debug, Default, Deserialize)]
pub struct SessionQuery {
    pub harness: Option<String>,
    pub limit: Option<String>,
}

#[derive(Debug, Default, Deserialize)]
pub struct ExchangeQuery {
    pub session: Option<String>,
    pub kind: Option<String>,
    pub since: Option<String>,
    pub until: Option<String>,
    pub distilled: Option<String>,
    pub limit: Option<String>,
}

#[derive(Debug, Default, Deserialize)]
pub struct ExtractionQuery {
    pub extractor_id: Option<String>,
    pub run: Option<String>,
    pub exchange_id: Option<String>,
    pub kept: Option<String>,
}

#[derive(Debug, Default, Deserialize)]
pub struct EpisodeQuery {
    pub q: String,
    pub limit: Option<u32>,
    pub min_score: Option<f32>,
    pub since: Option<String>,
    pub until: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Health {
    pub ok: bool,
    pub sessions: i64,
    pub exchanges: i64,
    pub contents: i64,
}

#[derive(Debug, thiserror::Error)]
pub enum HistError {
    #[error("{0}")]
    BadInput(String),
    #[error("{0}")]
    NotFound(String),
    #[error("ambiguous id {prefix}: {count} episodes match")]
    Ambiguous {
        prefix: String,
        count: usize,
        ids: Vec<String>,
    },
    #[error("archive: {0}")]
    Db(#[from] rusqlite::Error),
    #[error("bad episode {id}: {reason}")]
    BadEpisode { id: String, reason: String },
    #[error(transparent)]
    Upstream(#[from] crate::upstream::Upstream),
}

pub(crate) fn int_param(raw: Option<&str>) -> Option<i64> {
    let result: Option<i64> = raw.and_then(|raw| {
        let s = raw.trim_start();
        let skip = usize::from(s.starts_with('+') || s.starts_with('-'));
        let digits = &s[skip..];
        let end = digits
            .bytes()
            .position(|b| !b.is_ascii_digit())
            .unwrap_or(digits.len());
        if end == 0 {
            None
        } else {
            s[..skip + end].parse::<i64>().ok()
        }
    });
    result
}

pub(crate) fn bool_param(raw: Option<&str>) -> Option<bool> {
    let result: Option<bool> = match raw {
        Some("true") => Some(true),
        Some("false") => Some(false),
        _ => None,
    };
    debug_assert!(
        result.is_none() || matches!(raw, Some("true" | "false")),
        "bool_param: only true or false"
    );
    result
}
