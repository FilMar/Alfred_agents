use crate::distill::session_run::session_failures;
use crate::distill::target::ExchangeReport;

fn exchange(failures: &[&str]) -> ExchangeReport {
    ExchangeReport {
        exchange: "e1".to_string(),
        extraction: "ok",
        rules: 0,
        kept: 0,
        critic_failed: 0,
        passed: 0,
        verdicts: Vec::new(),
        twins: 0,
        saved: Vec::new(),
        failures: failures.iter().map(|f| (*f).to_string()).collect(),
    }
}

#[test]
fn a_failed_split_is_the_first_failure() {
    assert_eq!(
        session_failures(false, &[]),
        vec!["split failed".to_string()]
    );
}

#[test]
fn the_exchange_failures_follow_in_order() {
    let exchanges = [
        exchange(&["critic failed"]),
        exchange(&["save: down", "record: x"]),
    ];
    assert_eq!(
        session_failures(true, &exchanges),
        vec!["critic failed", "save: down", "record: x"]
    );
}
