pub mod cli;
pub mod embed;
pub mod near;
pub mod qdrant;
pub mod reach;
pub mod refine;
pub mod routes;
pub mod store;

use jiff::Timestamp;
use serde::{Deserialize, Serialize};

pub const VECTOR_SIZE: usize = 768;
pub const SHOWN_CANDIDATES: usize = 5;

#[derive(Debug, Clone, PartialEq, Default, Serialize, Deserialize)]
pub struct RuleBody {
    #[serde(rename = "if")]
    pub if_: String,
    #[serde(rename = "do")]
    pub do_: Vec<String>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub exchange: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub embed_model: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub when: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub hits: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_hit: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub archived_at: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Rule {
    pub id: String,
    #[serde(flatten)]
    pub body: RuleBody,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Found {
    #[serde(flatten)]
    pub rule: Rule,
    pub score: f32,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct SearchOptions {
    pub q: String,
    pub limit: Option<u32>,
    pub tags: Option<String>,
    pub min_score: Option<f32>,
    pub hits: Option<bool>,
    pub archived: Option<bool>,
    pub timeout: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AddRequest {
    #[serde(rename = "if")]
    pub if_: String,
    #[serde(rename = "do")]
    pub do_: String,
    #[serde(default)]
    pub tags: Vec<String>,
    pub exchange: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AppendRequest {
    #[serde(rename = "do")]
    pub do_: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DeleteReply {
    pub id: String,
    pub deleted: bool,
}

#[derive(Debug, thiserror::Error)]
pub enum RulesError {
    #[error("no rule: {0}")]
    NoRule(String),
    #[error("ambiguous id {prefix}: {count} rules match")]
    Ambiguous {
        prefix: String,
        count: usize,
        ids: Vec<String>,
    },
    #[error("bad input: {0}")]
    BadInput(String),
    #[error("{service} failed: {message}")]
    Upstream {
        service: &'static str,
        message: String,
    },
    #[error("search took more than {0} ms")]
    Timeout(u64),
    #[error("more than {0} items")]
    TooMany(u32),
}

pub fn normalize_tags(raw: &[String]) -> Vec<String> {
    let result: Vec<String> = raw
        .iter()
        .flat_map(|value| value.split(','))
        .map(str::trim)
        .filter(|tag| !tag.is_empty())
        .map(std::string::ToString::to_string)
        .collect();
    debug_assert!(
        result.iter().all(|t| !t.is_empty() && !t.contains(',')),
        "normalize_tags: no empty tag, no comma"
    );
    result
}

pub(crate) fn is_full_id(id: &str) -> bool {
    let result: bool = {
        let groups: Vec<&str> = id.split('-').collect();
        groups.len() == 5
            && [8usize, 4, 4, 4, 12]
                .iter()
                .zip(&groups)
                .all(|(len, group)| {
                    group.len() == *len && group.bytes().all(|b| b.is_ascii_hexdigit())
                })
    };
    result
}

pub(crate) fn match_prefix<'a>(prefix: &str, ids: &'a [String]) -> Vec<&'a str> {
    let result: Vec<&str> = ids
        .iter()
        .map(String::as_str)
        .filter(|id| id.starts_with(prefix))
        .collect();
    debug_assert!(
        result.iter().all(|id| id.starts_with(prefix)),
        "match_prefix: every id starts with the prefix"
    );
    result
}

pub(crate) fn iso(at: Timestamp) -> String {
    let result: String = {
        let dt = at.to_zoned(jiff::tz::TimeZone::UTC).datetime();
        format!(
            "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}.{:03}Z",
            dt.year(),
            dt.month(),
            dt.day(),
            dt.hour(),
            dt.minute(),
            dt.second(),
            dt.millisecond()
        )
    };
    debug_assert!(result.ends_with('Z'), "iso: ends with Z");
    debug_assert!(result.len() == 24, "iso: millisecond precision");
    result
}
