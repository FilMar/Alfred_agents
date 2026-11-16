use jiff::Timestamp;
use serde::Serialize;

use super::critic::Judgement;
use super::decide::{Carry, Decision, Tools, decide};
use super::extract::{Extraction, Target};
use super::novelty::{Ruling, TWIN_REASON};
use super::record::{Outcome, Recorder};
use crate::hist::db::HistDb;
use crate::hist::episodes::Episodes;

#[derive(Debug, Clone, Copy)]
pub struct Context<'a> {
    pub tools: Tools<'a>,
    pub hist: &'a HistDb,
    pub episodes: &'a Episodes,
    pub recorder: &'a Recorder,
    pub vocabulary: &'a [String],
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExchangeReport {
    pub exchange: String,
    pub extraction: &'static str,
    pub rules: u32,
    pub kept: u32,
    pub critic_failed: u32,
    pub passed: u32,
    pub verdicts: Vec<&'static str>,
    pub twins: u32,
    pub saved: Vec<String>,
    pub failures: Vec<String>,
}

pub async fn distill_target(
    context: &Context<'_>,
    target: &Target<'_>,
    carry: Carry,
    now: Timestamp,
) -> (ExchangeReport, Carry) {
    debug_assert!(
        !context.vocabulary.is_empty(),
        "distill_target: the vocabulary is not empty"
    );
    let tools = &context.tools;
    let id = target.turn().id();
    let extraction =
        Extraction::from(tools.chat, target, context.vocabulary, tools.extractor).await;
    let decision = if extraction.answer().is_ok() {
        let outcomes = judged_outcomes(context, target, &extraction).await;
        Some(decide(tools, id, extraction.rules(), outcomes, carry.clone(), now).await)
    } else {
        None
    };
    let outcomes: &[Outcome] = decision.as_ref().map_or(&[], Decision::outcomes);
    let recorded = context
        .recorder
        .write(context.hist, id, outcomes, context.recorder.run())
        .err()
        .map(|e| format!("record: {e}"));
    let report = report_of(id, &extraction, decision.as_ref(), recorded);
    let result: (ExchangeReport, Carry) = (report, decision.map_or(carry, Decision::into_carry));
    debug_assert!(
        result.0.exchange == target.turn().id(),
        "distill_target: the report is of the target turn"
    );
    debug_assert!(
        result.0.extraction == "ok" || result.0.rules == 0,
        "distill_target: a failed extraction judges nothing"
    );
    debug_assert!(
        result.0.extraction == "ok" || !result.0.failures.is_empty(),
        "distill_target: a failed extraction is a failure"
    );
    result
}

pub async fn judged_outcomes(
    context: &Context<'_>,
    target: &Target<'_>,
    extraction: &Extraction,
) -> Vec<Outcome> {
    let tools = &context.tools;
    let mut outcomes: Vec<Outcome> = Vec::with_capacity(extraction.rules().len());
    for checked in extraction.rules() {
        let outcome = Outcome::of(checked);
        let judged = if checked.is_kept() {
            let judgement =
                Judgement::of(tools.chat, target, checked.candidate(), tools.extractor).await;
            match judgement.probabilities() {
                Some(p) => outcome.judged(p.clone(), judgement.drop()),
                None => outcome,
            }
        } else {
            outcome
        };
        outcomes.push(judged);
    }
    let result: Vec<Outcome> = outcomes;
    debug_assert!(
        result.len() == extraction.rules().len(),
        "judged_outcomes: one outcome per extracted rule"
    );
    result
}

pub fn report_of(
    exchange_id: &str,
    extraction: &Extraction,
    decision: Option<&Decision>,
    recorded: Option<String>,
) -> ExchangeReport {
    debug_assert!(
        extraction.answer().is_ok() || decision.is_none(),
        "report_of: a failed extraction has no decision"
    );
    let count = |n: usize| u32::try_from(n).expect("report_of: a count fits a u32");
    let outcomes: &[Outcome] = decision.map_or(&[], Decision::outcomes);
    let rulings: &[Ruling] = decision.map_or(&[], Decision::rulings);
    let ok = extraction.answer().is_ok();
    let result: ExchangeReport = ExchangeReport {
        exchange: exchange_id.to_string(),
        extraction: if ok { "ok" } else { "failed" },
        rules: count(extraction.rules().len()),
        kept: count(extraction.rules().iter().filter(|c| c.is_kept()).count()),
        critic_failed: count(
            outcomes
                .iter()
                .filter(|o| o.is_open() && !o.is_judged())
                .count(),
        ),
        passed: count(outcomes.iter().filter(|o| o.is_open()).count()),
        verdicts: rulings.iter().map(|r| r.verdict().name()).collect(),
        twins: count(
            rulings
                .iter()
                .filter(|r| r.reason() == Some(TWIN_REASON))
                .count(),
        ),
        saved: outcomes
            .iter()
            .filter_map(|o| o.saved_id().map(str::to_string))
            .collect(),
        failures: [(!ok).then(|| format!("extraction failed: {exchange_id}"))]
            .into_iter()
            .flatten()
            .chain(decision.map_or(&[][..], Decision::failures).iter().cloned())
            .chain(recorded)
            .collect(),
    };
    debug_assert!(
        result.saved.len() <= result.passed as usize,
        "report_of: only a passed rule is saved"
    );
    debug_assert!(
        result.passed <= result.kept,
        "report_of: only a kept rule passes"
    );
    debug_assert!(
        result.kept <= result.rules,
        "report_of: only an extracted rule is kept"
    );
    result
}
