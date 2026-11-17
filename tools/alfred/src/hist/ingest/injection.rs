use super::harness::Harness;
use super::transcript::Span;
use crate::hist::Injection;

pub const HEADER: &str = "## Rule matches";
pub const SHORT_ID: usize = 8;
pub const KIND_RULE: &str = "rule";

pub fn is_short_id(text: &str) -> bool {
    text.len() == SHORT_ID
        && text
            .bytes()
            .all(|byte| matches!(byte, b'0'..=b'9' | b'a'..=b'f'))
}

pub fn rules_of(text: &str) -> Vec<(String, String)> {
    let result: Vec<(String, String)> = text
        .trim_start()
        .strip_prefix(HEADER)
        .map(|body| {
            let lines: Vec<&str> = body.split('\n').collect();
            let heads: Vec<(usize, &str)> = lines
                .iter()
                .enumerate()
                .filter_map(|(index, line)| {
                    line.strip_prefix("-- ")
                        .filter(|rest| is_short_id(rest))
                        .map(|id| (index, id))
                })
                .collect();
            heads
                .iter()
                .enumerate()
                .filter_map(|(nth, &(start, id))| {
                    let end = heads.get(nth + 1).map_or(lines.len(), |&(next, _)| next);
                    let actions = lines[start + 1..end]
                        .join("\n")
                        .trim_matches('\n')
                        .to_string();
                    (!actions.is_empty()).then(|| (id.to_string(), actions))
                })
                .collect::<Vec<(String, String)>>()
        })
        .unwrap_or_default();
    debug_assert!(
        text.trim_start().starts_with(HEADER) || result.is_empty(),
        "rules_of: no rules without the header"
    );
    debug_assert!(
        result.iter().all(|(id, _)| is_short_id(id)),
        "rules_of: every ref is a short id"
    );
    debug_assert!(
        result.iter().all(|(_, actions)| !actions.is_empty()),
        "rules_of: every rule has actions"
    );
    result
}

pub fn injections_of(harness: Harness, session: &str, span: &Span) -> Vec<Injection> {
    let rules: Vec<(String, String)> = span
        .body
        .iter()
        .flat_map(|line| harness.injected(line))
        .flat_map(|text| rules_of(text))
        .collect();
    let first = |index: usize, id: &str| rules.iter().take(index).all(|(seen, _)| seen != id);
    let result: Vec<Injection> = harness
        .exchange_id(session, span.opener)
        .map(|exchange| {
            rules
                .iter()
                .enumerate()
                .filter(|(index, (id, _))| first(*index, id))
                .map(|(_, (id, actions))| Injection {
                    exchange_id: exchange.clone(),
                    kind: KIND_RULE.to_string(),
                    reference: id.clone(),
                    text: actions.clone(),
                })
                .collect()
        })
        .unwrap_or_default();
    debug_assert!(
        result.iter().all(|row| row.kind == KIND_RULE),
        "injections_of: every row is a rule"
    );
    debug_assert!(
        rows_of_exchange(
            &result,
            harness.exchange_id(session, span.opener).as_deref()
        ),
        "injections_of: every row is of the exchange of the span"
    );
    debug_assert!(
        distinct_refs(&result),
        "injections_of: a rule once per exchange"
    );
    result
}

fn rows_of_exchange(rows: &[Injection], exchange: Option<&str>) -> bool {
    match exchange {
        Some(id) => rows.iter().all(|row| row.exchange_id == id),
        None => rows.is_empty(),
    }
}

fn distinct_refs(rows: &[Injection]) -> bool {
    rows.iter().all(|row| {
        rows.iter()
            .filter(|other| other.reference == row.reference)
            .count()
            == 1
    })
}
