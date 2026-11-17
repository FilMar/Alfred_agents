use jiff::Timestamp;

use super::ask::Answer;
use super::config::Extractor;
use super::decide_step::{Step, apply, judge};
use super::novelty::Ruling;
use super::record::Outcome;
use super::rule::{Checked, RuleCandidate};
use super::save::{Budget, Mode};
use super::twin::{Known, SessionList};
use crate::chat::Chat;
use crate::embed::Embedder;
use crate::rules::Rule;
use crate::rules::store::Rules;

#[derive(Debug, Clone, Copy)]
pub struct Tools<'a> {
    pub chat: &'a Chat,
    pub rules: &'a Rules,
    pub embedder: &'a Embedder,
    pub extractor: &'a Extractor,
    pub mode: Mode,
    pub cutoff: Option<f32>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Carry {
    pub list: SessionList,
    pub budget: Budget,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Decision {
    outcomes: Vec<Outcome>,
    answer: Option<Answer>,
    rulings: Vec<Ruling>,
    failures: Vec<String>,
    carry: Carry,
}

impl Decision {
    pub fn outcomes(&self) -> &[Outcome] {
        &self.outcomes
    }

    pub fn answer(&self) -> Option<&Answer> {
        self.answer.as_ref()
    }

    pub fn rulings(&self) -> &[Ruling] {
        &self.rulings
    }

    pub fn failures(&self) -> &[String] {
        &self.failures
    }

    pub fn into_carry(self) -> Carry {
        self.carry
    }
}

pub async fn decide(
    tools: &Tools<'_>,
    exchange_id: &str,
    checked: &[Checked],
    outcomes: Vec<Outcome>,
    carry: Carry,
    now: Timestamp,
) -> Decision {
    debug_assert!(
        crate::hist::validate::is_id(exchange_id),
        "decide: exchange_id is an exchange id"
    );
    debug_assert!(
        checked.len() == outcomes.len(),
        "decide: one outcome per checked rule"
    );
    let judgeables = judgeables_of(&outcomes);
    let budget = carry.budget;
    let result: Decision = {
        let critic: Vec<String> = outcomes
            .iter()
            .filter(|o| o.is_open() && !o.is_judged())
            .map(|_| "critic failed".to_string())
            .collect();
        let candidates: Vec<&RuleCandidate> = judgeables
            .iter()
            .map(|&at| checked[at].candidate())
            .collect();
        let judged = if candidates.is_empty() {
            None
        } else {
            Some(judge(tools, &candidates, &carry.list).await)
        };
        match judged {
            Some(Ok(judged)) => {
                let step = Step {
                    exchange_id,
                    judgeables: &judgeables,
                    candidates: &candidates,
                    now,
                };
                let applied = apply(tools, &step, &judged, outcomes, carry).await;
                Decision {
                    outcomes: applied.outcomes,
                    answer: judged.answer,
                    rulings: judged.rulings,
                    failures: [critic, applied.failures].concat(),
                    carry: applied.carry,
                }
            }
            stopped => Decision {
                outcomes,
                answer: None,
                rulings: Vec::new(),
                failures: [critic, stopped.and_then(Result::err).into_iter().collect()].concat(),
                carry,
            },
        }
    };
    debug_assert!(
        result.rulings.is_empty() || result.rulings.len() == judgeables.len(),
        "decide: one ruling per judgeable, or none"
    );
    debug_assert!(
        !result.rulings.is_empty() || judgeables.is_empty() || !result.failures.is_empty(),
        "decide: judgeables with no ruling carry a failure"
    );
    debug_assert!(
        tools.mode == Mode::Active || saves_nothing(&result, budget),
        "decide: shadow saves nothing and spends no budget"
    );
    result
}

pub fn judgeables_of(outcomes: &[Outcome]) -> Vec<usize> {
    let result: Vec<usize> = outcomes
        .iter()
        .enumerate()
        .filter(|(_, o)| o.is_open() && o.is_judged())
        .map(|(at, _)| at)
        .collect();
    debug_assert!(
        result.iter().all(|&at| outcomes[at].is_open()),
        "judgeables_of: only an open outcome goes to novelty"
    );
    debug_assert!(
        result.iter().all(|&at| outcomes[at].is_judged()),
        "judgeables_of: only a judged outcome goes to novelty"
    );
    debug_assert!(
        result.windows(2).all(|w| w[0] < w[1]),
        "judgeables_of: in outcome order, once each"
    );
    result
}

pub async fn neighbours_of(
    rules: &Rules,
    candidate: &RuleCandidate,
    top_k: u32,
) -> Result<Vec<Known>, String> {
    debug_assert!(top_k > 0, "neighbours_of: top_k is above 0");
    let options = crate::rules::SearchOptions {
        q: candidate.if_.clone(),
        limit: Some(top_k),
        hits: Some(false),
        ..crate::rules::SearchOptions::default()
    };
    let result: Result<Vec<Known>, String> = rules
        .search(&options, Timestamp::now())
        .await
        .map(|found| found.iter().map(|f| neighbour_of(&f.rule)).collect())
        .map_err(|e| e.to_string());
    debug_assert!(
        result.as_ref().map_or(true, |n| n.len() <= top_k as usize),
        "neighbours_of: at most top_k neighbours"
    );
    result
}

pub fn neighbour_of(rule: &Rule) -> Known {
    debug_assert!(
        !rule.body.if_.trim().is_empty(),
        "neighbour_of: the rule has an if"
    );
    debug_assert!(!rule.body.do_.is_empty(), "neighbour_of: the rule has a do");
    Known::neighbour(
        rule.id.clone(),
        format!("SE {} ALLORA {}", rule.body.if_, rule.body.do_.join("; ")),
    )
}

pub fn known_for(neighbours: Vec<Known>, list: &SessionList) -> Vec<Known> {
    let count = neighbours.len() + list.items().len();
    let result: Vec<Known> = neighbours
        .into_iter()
        .fold(Vec::<Known>::new(), |seen, n| {
            if seen.iter().chain(list.items()).any(|k| k.key() == n.key()) {
                seen
            } else {
                seen.into_iter().chain([n]).collect()
            }
        })
        .into_iter()
        .chain(list.items().iter().cloned())
        .collect();
    debug_assert!(result.len() <= count, "known_for: nothing is invented");
    debug_assert!(
        result.ends_with(list.items()),
        "known_for: the session items come last, in order"
    );
    debug_assert!(unique_keys(&result), "known_for: no neighbour twice");
    result
}

fn unique_keys(known: &[Known]) -> bool {
    known
        .iter()
        .map(Known::key)
        .collect::<std::collections::HashSet<_>>()
        .len()
        == known.len()
}

fn saves_nothing(decision: &Decision, before: Budget) -> bool {
    decision.carry.budget == before && decision.outcomes.iter().all(|o| o.saved_id().is_none())
}
