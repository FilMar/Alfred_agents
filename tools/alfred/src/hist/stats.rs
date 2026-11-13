use serde::{Deserialize, Serialize};

use super::Exchange;

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
        let mut kept: Vec<Prompt> = sources
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
        kept.sort_by(|a, b| (&a.timestamp, &a.exchange).cmp(&(&b.timestamp, &b.exchange)));
        let mut seen = std::collections::HashSet::new();
        kept.retain(|p| seen.insert(p.text.clone()));
        kept
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
    let result: Vec<CostRow> = {
        let mut rows = std::collections::BTreeMap::<String, CostRow>::new();
        for exchange in exchanges {
            let key = match by {
                By::Day => exchange.timestamp.chars().take(10).collect::<String>(),
                By::Session => exchange.session.clone(),
                By::Model => exchange
                    .model
                    .clone()
                    .unwrap_or_else(|| "unknown".to_string()),
            };
            let row = rows.entry(key.clone()).or_insert_with(|| CostRow {
                key,
                ..Default::default()
            });
            row.exchanges += 1;
            row.tokens_in += exchange.tokens_in.unwrap_or(0);
            row.tokens_out += exchange.tokens_out.unwrap_or(0);
            row.tokens_cache_read += exchange.tokens_cache_read.unwrap_or(0);
            row.tokens_cache_write += exchange.tokens_cache_write.unwrap_or(0);
        }
        rows.into_values().collect()
    };
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
    let mut seen = std::collections::HashSet::new();
    prompts.iter().all(|p| seen.insert(p.text.as_str()))
}
