use std::collections::{HashMap, HashSet};

use serde::{Deserialize, Serialize};

use super::Exchange;
use crate::sorted::sorted_by_key;

pub const PROMPTS_LIMIT: i64 = 100_000;
pub const COST_LIMIT: i64 = 5_000;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Prompt {
    pub exchange: String,
    pub timestamp: String,
    pub text: String,
}

#[derive(Debug, Clone, PartialEq, Default, Serialize, Deserialize)]
pub struct CostRow {
    pub key: String,
    pub exchanges: i64,
    pub tokens_in: i64,
    pub tokens_out: i64,
    pub tokens_cache_read: i64,
    pub tokens_cache_write: i64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum By {
    Day,
    Session,
    Model,
}

pub fn prompts_of(sources: &[(Exchange, String)]) -> Vec<Prompt> {
    let result: Vec<Prompt> = {
        let kept: Vec<Prompt> = sources
            .iter()
            .filter(|(exchange, input)| {
                let human = match exchange.meta.as_ref().and_then(|meta| meta.get("trigger")) {
                    None => true,
                    Some(serde_json::Value::String(trigger)) => trigger.as_str() == "human",
                    Some(_) => false,
                };
                human && !input.trim().is_empty()
            })
            .map(|(exchange, input)| Prompt {
                exchange: exchange.id.clone(),
                timestamp: exchange.timestamp.clone(),
                text: input.trim().to_string(),
            })
            .collect();
        let ordered = sorted_by_key(kept, |p| (p.timestamp.clone(), p.exchange.clone()));
        let first: HashMap<&str, &str> = ordered
            .iter()
            .rev()
            .map(|p| (p.text.as_str(), p.exchange.as_str()))
            .collect();
        ordered
            .iter()
            .filter(|p| first[p.text.as_str()] == p.exchange)
            .cloned()
            .collect()
    };
    debug_assert!(
        result
            .iter()
            .all(|p| !p.text.is_empty() && p.text == p.text.trim()),
        "prompts_of: trimmed, not empty"
    );
    debug_assert!(
        result
            .windows(2)
            .all(|w| (&w[0].timestamp, &w[0].exchange) < (&w[1].timestamp, &w[1].exchange)),
        "prompts_of: oldest first"
    );
    debug_assert!(no_repeat(&result), "prompts_of: no text twice");
    result
}

pub fn sum_by(exchanges: &[Exchange], by: By) -> Vec<CostRow> {
    let key = |exchange: &Exchange| match by {
        By::Day => exchange.timestamp.chars().take(10).collect::<String>(),
        By::Session => exchange.session.clone(),
        By::Model => exchange
            .model
            .clone()
            .unwrap_or_else(|| "unknown".to_string()),
    };
    let result: Vec<CostRow> = sorted_by_key(exchanges.iter().collect(), |e| key(e))
        .chunk_by(|a, b| key(a) == key(b))
        .map(|group| CostRow {
            key: key(group[0]),
            exchanges: i64::try_from(group.len()).unwrap_or(i64::MAX),
            tokens_in: group.iter().filter_map(|e| e.tokens_in).sum(),
            tokens_out: group.iter().filter_map(|e| e.tokens_out).sum(),
            tokens_cache_read: group.iter().filter_map(|e| e.tokens_cache_read).sum(),
            tokens_cache_write: group.iter().filter_map(|e| e.tokens_cache_write).sum(),
        })
        .collect();
    debug_assert!(
        result.iter().map(|r| r.exchanges).sum::<i64>()
            == i64::try_from(exchanges.len()).unwrap_or(i64::MAX),
        "sum_by: every exchange counted once"
    );
    debug_assert!(
        result.windows(2).all(|w| w[0].key < w[1].key),
        "sum_by: sorted by key"
    );
    result
}

pub fn by_of(raw: Option<&str>) -> Option<By> {
    match raw {
        None | Some("day") => Some(By::Day),
        Some("session") => Some(By::Session),
        Some("model") => Some(By::Model),
        Some(_) => None,
    }
}

fn no_repeat(prompts: &[Prompt]) -> bool {
    let texts: HashSet<&str> = prompts.iter().map(|p| p.text.as_str()).collect();
    texts.len() == prompts.len()
}
