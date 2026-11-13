use jiff::Timestamp;
use serde::{Deserialize, Serialize};

use super::Rule;
use crate::sorted::sorted_by;

pub const TRUST_BASE: f64 = 0.5;
pub const HIT_WEIGHT: f64 = 0.05;
pub const HIT_CAP: u32 = 10;
pub const HALF_LIFE_DAYS: f64 = 30.0;
pub const TRUST_FLOOR: f64 = 0.2;
pub const BIN_COUNT: usize = 10;
pub const LOW_TEXT_CHARS: usize = 80;
pub const COUNTERS_START: &str = "2026-10-20T00:00:00.000Z";

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Signals {
    pub hits: u32,
    pub last: Timestamp,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Spread {
    pub bins: Vec<u32>,
    pub total: u32,
    #[serde(rename = "belowFloor")]
    pub below_floor: u32,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct LowRule {
    pub id: String,
    pub trust: f64,
    pub text: String,
    pub when: String,
    pub hits: u32,
    pub hits_related: u32,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Plan {
    pub archive: Vec<LowRule>,
    pub restore: Vec<LowRule>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RefineReport {
    pub spread: Spread,
    pub low: Vec<LowRule>,
    pub plan: Plan,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Applied {
    pub archived: u32,
    pub restored: u32,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ApplyReply {
    #[serde(flatten)]
    pub report: RefineReport,
    pub applied: Applied,
}

pub fn counters_start() -> Timestamp {
    COUNTERS_START
        .parse()
        .expect("refine.counters_start: constant parses")
}

pub fn signals_of(rule: &Rule, start: Timestamp) -> Signals {
    let parsed = |at: &Option<String>| at.as_deref().and_then(|t| t.parse::<Timestamp>().ok());
    let last = match parsed(&rule.body.last_hit) {
        Some(hit) => hit,
        None => parsed(&rule.body.when).map_or(start, |when| when.max(start)),
    };
    let result = Signals {
        hits: rule.body.hits.unwrap_or(0),
        last,
    };
    debug_assert!(
        result.last >= start || rule.body.last_hit.is_some(),
        "signals_of: without a hit the last signal is at least the start"
    );
    result
}

pub fn trust_of(signals: Signals, now: Timestamp) -> f64 {
    let seconds = now.duration_since(signals.last).as_secs_f64().max(0.0);
    let days = seconds / 86_400.0;
    let bonus = HIT_WEIGHT * f64::from(signals.hits.min(HIT_CAP));
    let result = (TRUST_BASE + bonus).min(1.0) * 0.5_f64.powf(days / HALF_LIFE_DAYS);
    debug_assert!(
        (0.0..=1.0).contains(&result),
        "trust_of: trust is between 0 and 1"
    );
    result
}

pub fn spread_of(trusts: &[f64]) -> Spread {
    debug_assert!(
        trusts.iter().all(|t| (0.0..=1.0).contains(t)),
        "spread_of: every trust is between 0 and 1"
    );
    let count = |keep: &dyn Fn(f64) -> bool| {
        u32::try_from(trusts.iter().filter(|t| keep(**t)).count()).unwrap_or(u32::MAX)
    };
    let bins: Vec<u32> = (0..BIN_COUNT)
        .map(|bin| count(&|t| bin_of(t) == bin))
        .collect();
    let below_floor = count(&|t| t < TRUST_FLOOR);
    let total = count(&|_| true);
    let result = Spread {
        bins,
        total,
        below_floor,
    };
    debug_assert!(
        result.bins.iter().sum::<u32>() == result.total,
        "spread_of: bins add up to the total"
    );
    result
}

pub fn refine_report(rules: &[Rule], now: Timestamp) -> RefineReport {
    let start = counters_start();
    let scored: Vec<(&Rule, f64)> = rules
        .iter()
        .map(|r| (r, trust_of(signals_of(r, start), now)))
        .collect();
    let pick = |keep: &dyn Fn(&Rule, f64) -> bool| -> Vec<LowRule> {
        let list: Vec<LowRule> = scored
            .iter()
            .filter(|(r, t)| keep(r, *t))
            .map(|(r, t)| low_rule(r, *t, start))
            .collect();
        sorted_by(list, |a, b| {
            a.trust.total_cmp(&b.trust).then_with(|| a.id.cmp(&b.id))
        })
    };
    let low = pick(&|_, t| t < TRUST_FLOOR);
    let archive = pick(&|r, t| t < TRUST_FLOOR && r.body.archived_at.is_none());
    let restore = pick(&|r, t| t >= TRUST_FLOOR && r.body.archived_at.is_some());
    let trusts: Vec<f64> = scored.iter().map(|(_, t)| *t).collect();
    let result = RefineReport {
        spread: spread_of(&trusts),
        low,
        plan: Plan { archive, restore },
    };
    debug_assert!(
        result.spread.total as usize == rules.len(),
        "refine_report: spread counts every rule"
    );
    debug_assert!(
        plan_holds(&result.plan, rules),
        "refine_report: archive only live rules, restore only archived ones"
    );
    debug_assert!(
        result.low.iter().all(|l| l.trust < TRUST_FLOOR),
        "refine_report: low rules are under the floor"
    );
    debug_assert!(
        result
            .low
            .iter()
            .all(|l| l.text.chars().count() <= LOW_TEXT_CHARS),
        "refine_report: text cut to the limit"
    );
    result
}

fn plan_holds(plan: &Plan, rules: &[Rule]) -> bool {
    let archived = |id: &str| {
        rules
            .iter()
            .any(|r| r.id == id && r.body.archived_at.is_some())
    };
    plan.archive
        .iter()
        .all(|l| l.trust < TRUST_FLOOR && !archived(&l.id))
        && plan
            .restore
            .iter()
            .all(|l| l.trust >= TRUST_FLOOR && archived(&l.id))
}

fn bin_of(trust: f64) -> usize {
    let scaled = (trust * BIN_COUNT as f64).floor();
    let bin = if scaled.is_finite() && scaled > 0.0 {
        scaled as usize
    } else {
        0
    };
    bin.min(BIN_COUNT - 1)
}

fn low_rule(rule: &Rule, trust: f64, start: Timestamp) -> LowRule {
    LowRule {
        id: rule.id.clone(),
        trust,
        text: rule.body.if_.chars().take(LOW_TEXT_CHARS).collect(),
        when: rule.body.when.clone().unwrap_or_else(|| super::iso(start)),
        hits: rule.body.hits.unwrap_or(0),
        hits_related: 0,
    }
}
