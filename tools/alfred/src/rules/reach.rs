use serde::{Deserialize, Serialize};

pub const MAX_PROMPTS: usize = 10_000;
pub const SEARCHES_IN_FLIGHT: usize = 8;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ReachRequest {
    pub prompts: Vec<String>,
    pub limit: Option<u32>,
    pub min_score: Option<f32>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ReachRule {
    pub id: String,
    #[serde(rename = "if")]
    pub if_: String,
    pub reached: u32,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ReachReply {
    pub prompts: u32,
    pub rules: Vec<ReachRule>,
    pub unreached: Vec<ReachRule>,
}

pub fn reach_of(rules: &[(String, String)], found: &[Vec<String>]) -> ReachReply {
    use std::collections::HashMap;
    let mut counts = HashMap::new();
    for ids in found {
        for id in ids {
            *counts.entry(id.as_str()).or_insert(0) += 1;
        }
    }
    let mut counted: Vec<ReachRule> = rules
        .iter()
        .map(|(id, if_)| ReachRule {
            id: id.clone(),
            if_: if_.clone(),
            reached: counts.get(id.as_str()).copied().unwrap_or(0),
        })
        .collect();
    counted.sort_by(|a, b| a.reached.cmp(&b.reached).then_with(|| a.id.cmp(&b.id)));
    let unreached: Vec<ReachRule> = counted.iter().filter(|r| r.reached == 0).cloned().collect();
    let result: ReachReply = ReachReply {
        prompts: found.len() as u32,
        rules: counted,
        unreached,
    };
    debug_assert!(
        result.rules.len() == rules.len(),
        "reach_of: every rule once"
    );
    debug_assert!(
        result.prompts as usize == found.len(),
        "reach_of: prompts is the number of searches"
    );
    debug_assert!(
        result.unreached.iter().all(|r| r.reached == 0),
        "reach_of: unreached rules have zero"
    );
    debug_assert!(
        result
            .rules
            .windows(2)
            .all(|w| (w[0].reached, &w[0].id) <= (w[1].reached, &w[1].id)),
        "reach_of: sorted by reached then id"
    );
    result
}
