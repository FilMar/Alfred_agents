use serde::{Deserialize, Serialize};

use crate::sorted::sorted_by_key;

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
    let counted = sorted_by_key(
        rules
            .iter()
            .map(|(id, if_)| ReachRule {
                id: id.clone(),
                if_: if_.clone(),
                reached: u32::try_from(found.iter().flatten().filter(|x| *x == id).count())
                    .unwrap_or(u32::MAX),
            })
            .collect(),
        |r| (r.reached, r.id.clone()),
    );
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
