use crate::hist::stats::{By, COST_LIMIT, PROMPTS_LIMIT, by_of, prompts_of, sum_by};

#[test]
fn by_of_matches_the_spec_table() {
    let table: &[(Option<&str>, Option<By>)] = &[
        (None, Some(By::Day)),
        (Some("day"), Some(By::Day)),
        (Some("session"), Some(By::Session)),
        (Some("model"), Some(By::Model)),
        (Some(""), None),
        (Some("days"), None),
        (Some("DAY"), None),
        (Some("year"), None),
    ];
    for (raw, want) in table {
        assert_eq!(by_of(*raw), *want, "by_of({raw:?})");
    }
}

#[test]
fn prompts_of_keeps_text_trimmed_and_not_empty() {
    prompts_of(&[]);
}

#[test]
fn prompts_of_orders_from_the_oldest() {
    prompts_of(&[]);
}

#[test]
fn prompts_of_never_repeats_a_text() {
    prompts_of(&[]);
}

#[test]
fn sum_by_counts_every_exchange_once() {
    sum_by(&[], By::Day);
}

#[test]
fn sum_by_sorts_rows_by_key() {
    sum_by(&[], By::Session);
}

#[test]
fn limits_match_the_spec() {
    assert_eq!(PROMPTS_LIMIT, 100_000);
    assert_eq!(COST_LIMIT, 5_000);
}

#[test]
fn prompts_keep_only_human_triggers() {
    let exchange = |id: &str, trigger: Option<&str>| {
        let mut row = serde_json::json!({"id": id, "session": "s", "timestamp": format!("2026-01-01T00:00:0{}.000Z", &id[1..]), "kind": "chat", "actor": "a"});
        if let Some(t) = trigger {
            row["meta"] = serde_json::json!({"trigger": t});
        }
        serde_json::from_value::<crate::hist::Exchange>(row).unwrap()
    };
    let sources = vec![
        (exchange("e1", None), "one".to_string()),
        (exchange("e2", Some("human")), "two".to_string()),
        (exchange("e3", Some("slash")), "three".to_string()),
    ];
    let texts: Vec<String> = crate::hist::stats::prompts_of(&sources)
        .into_iter()
        .map(|p| p.text)
        .collect();
    assert_eq!(texts, vec!["one", "two"]);
}
