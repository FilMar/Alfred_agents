use crate::hist::episodes::{
    COLLECTION, DEFAULT_LIMIT, DEFAULT_MIN_SCORE, SHOWN_CANDIDATES, derived_id, episode_of,
    period_filter,
};

const SESSION: &str = "0f0f0f0f-1111-2222-3333-444444444444";
const FIRST: &str = "0e0e0e0e-1111-2222-3333-555555555555";
const SECOND: &str = "0d0d0d0d-1111-2222-3333-666666666666";

fn valid_payload() -> serde_json::Value {
    serde_json::json!({
        "session": SESSION,
        "exchanges": [FIRST, SECOND],
        "from": "2024-01-01T00:00:00.000Z",
        "to": "2024-01-01T01:00:00.000Z",
        "summary": "a summary",
        "extractor": 7,
        "model": "claude",
        "created": "2024-01-02T00:00:00.000Z"
    })
}

fn valid_id() -> String {
    derived_id(SESSION, FIRST)
}

fn with(payload: &serde_json::Value, key: &str, value: serde_json::Value) -> serde_json::Value {
    let rest = payload.as_object().cloned().unwrap_or_default().into_iter();
    serde_json::Value::Object(rest.chain([(key.to_string(), value)]).collect())
}

fn without(payload: &serde_json::Value, key: &str) -> serde_json::Value {
    let rest = payload.as_object().cloned().unwrap_or_default().into_iter();
    serde_json::Value::Object(rest.filter(|(k, _)| k != key).collect())
}

fn filter_text(since: Option<&str>, until: Option<&str>) -> String {
    match period_filter(since, until) {
        Ok(Some(filter)) => filter.to_string(),
        _ => panic!("period_filter must build a filter for the days it was given"),
    }
}

#[test]
fn the_collection_and_the_defaults_of_the_spec() {
    assert_eq!(COLLECTION, "tl_episodes");
    assert_eq!(DEFAULT_LIMIT, 10);
    assert_eq!(DEFAULT_MIN_SCORE, 0.30);
    assert_eq!(SHOWN_CANDIDATES, 5);
}

#[test]
fn derived_id_has_the_shape_of_an_id() {
    derived_id(SESSION, FIRST);
}

#[test]
fn derived_id_is_a_lowercase_uuid_for_any_input() {
    let inputs = vec![(SESSION, FIRST), ("a", "b"), ("", "")];
    for (left, right) in inputs {
        let id = derived_id(left, right);
        assert_eq!(id.len(), 36);
        let parts: Vec<&str> = id.split('-').collect();
        assert_eq!(parts.len(), 5);
        let lengths: Vec<usize> = parts.iter().map(|part| part.len()).collect();
        assert_eq!(lengths, vec![8, 4, 4, 4, 12]);
        for part in &parts {
            assert!(
                part.chars()
                    .all(|c| c.is_ascii_digit() || ('a'..='f').contains(&c))
            );
        }
    }
    assert_eq!(derived_id(SESSION, FIRST), derived_id(SESSION, FIRST));
    assert_ne!(derived_id(SESSION, FIRST), derived_id(SESSION, SECOND));
    assert_ne!(derived_id(SESSION, FIRST), derived_id(FIRST, SESSION));
}

#[test]
fn episode_of_gives_the_id_given() {
    let _ = episode_of(&valid_id(), &valid_payload());
}

#[test]
fn episode_of_keeps_from_before_to() {
    let payload = with(
        &valid_payload(),
        "to",
        serde_json::json!("2024-01-01T00:00:00.000Z"),
    );
    let _ = episode_of(&valid_id(), &payload);
}

#[test]
fn episode_of_reads_the_payload_it_was_given() {
    let episode = episode_of(&valid_id(), &valid_payload()).unwrap();
    assert_eq!(episode.id, valid_id());
    assert_eq!(episode.session, SESSION);
    assert_eq!(episode.exchanges, vec![FIRST, SECOND]);
    assert_eq!(episode.from, "2024-01-01T00:00:00.000Z");
    assert_eq!(episode.to, "2024-01-01T01:00:00.000Z");
    assert_eq!(episode.summary, "a summary");
    assert_eq!(episode.extractor, 7);
    assert_eq!(episode.model, "claude");
    assert_eq!(episode.created, "2024-01-02T00:00:00.000Z");
}

#[test]
fn episode_of_accepts_the_edges_of_a_valid_payload() {
    let payload = serde_json::json!({
        "session": SESSION,
        "exchanges": [FIRST],
        "from": "2024-01-01T00:00:00.000Z",
        "to": "2024-01-01T00:00:00.000Z",
        "summary": "s",
        "extractor": 1,
        "model": "m",
        "created": "2024-01-02T00:00:00.000Z"
    });
    let episode = episode_of(&valid_id(), &payload).unwrap();
    assert_eq!(episode.exchanges, vec![FIRST]);
    assert_eq!(episode.extractor, 1);
    assert_eq!(episode.from, episode.to);
}

#[test]
fn episode_of_rejects_each_wrong_field() {
    let base = valid_payload();
    let id = valid_id();
    let wrong = vec![
        serde_json::json!("not an object"),
        serde_json::json!(42),
        serde_json::json!(null),
        serde_json::json!([FIRST]),
        serde_json::json!({}),
        without(&base, "session"),
        with(&base, "session", serde_json::json!(null)),
        with(&base, "session", serde_json::json!(42)),
        with(&base, "session", serde_json::json!("")),
        with(&base, "session", serde_json::json!("not an id")),
        with(
            &base,
            "session",
            serde_json::json!("0F0F0F0F-1111-2222-3333-444444444444"),
        ),
        with(
            &base,
            "session",
            serde_json::json!("0f0f0f0f-1111-2222-3333-44444444444"),
        ),
        without(&base, "exchanges"),
        with(&base, "exchanges", serde_json::json!(null)),
        with(&base, "exchanges", serde_json::json!("not a list")),
        with(&base, "exchanges", serde_json::json!([])),
        with(&base, "exchanges", serde_json::json!([42])),
        with(&base, "exchanges", serde_json::json!([FIRST, "not an id"])),
        without(&base, "from"),
        with(&base, "from", serde_json::json!(null)),
        with(&base, "from", serde_json::json!(42)),
        with(&base, "from", serde_json::json!("2024-01-01")),
        with(&base, "from", serde_json::json!("2024-01-01T00:00:00Z")),
        with(&base, "from", serde_json::json!("not a time")),
        with(&base, "from", serde_json::json!("2024-01-01T02:00:00.000Z")),
        without(&base, "to"),
        with(&base, "to", serde_json::json!("not a time")),
        with(&base, "to", serde_json::json!("2024-01-02")),
        without(&base, "summary"),
        with(&base, "summary", serde_json::json!(null)),
        with(&base, "summary", serde_json::json!("")),
        with(&base, "summary", serde_json::json!(7)),
        without(&base, "extractor"),
        with(&base, "extractor", serde_json::json!(null)),
        with(&base, "extractor", serde_json::json!(0)),
        with(&base, "extractor", serde_json::json!(-1)),
        with(&base, "extractor", serde_json::json!(1.5)),
        with(&base, "extractor", serde_json::json!("7")),
        without(&base, "model"),
        with(&base, "model", serde_json::json!(null)),
        with(&base, "model", serde_json::json!("")),
        with(&base, "model", serde_json::json!(3)),
        without(&base, "created"),
        with(&base, "created", serde_json::json!(null)),
        with(&base, "created", serde_json::json!("2024-01-02")),
        with(&base, "created", serde_json::json!("not a time")),
    ];
    for payload in &wrong {
        match episode_of(&id, payload) {
            Err(reason) => assert!(!reason.is_empty()),
            Ok(_) => panic!("episode_of accepted a wrong payload"),
        }
    }
}

#[test]
fn episode_of_rejects_an_id_that_is_not_derived_from_the_payload() {
    let payload = valid_payload();
    assert!(episode_of(&derived_id(SESSION, SECOND), &payload).is_err());
    assert!(episode_of("00000000-0000-0000-0000-000000000000", &payload).is_err());
    assert!(episode_of("not an id", &payload).is_err());
    assert!(episode_of("", &payload).is_err());
}

#[test]
fn period_filter_is_none_without_days() {
    assert!(matches!(period_filter(None, None), Ok(None)));
}

#[test]
fn period_filter_bounds_to_with_since_and_from_with_until() {
    let since_only = filter_text(Some("2024-01-01"), None);
    assert!(since_only.contains("\"to\""));
    assert!(since_only.contains("gte"));
    assert!(since_only.contains("2024-01-01T00:00:00.000Z"));
    assert!(!since_only.contains("23:59:59.999Z"));
    assert!(!since_only.contains("\"from\""));

    let until_only = filter_text(None, Some("2024-01-31"));
    assert!(until_only.contains("\"from\""));
    assert!(until_only.contains("lte"));
    assert!(until_only.contains("2024-01-31T23:59:59.999Z"));
    assert!(!until_only.contains("00:00:00.000Z"));
    assert!(!until_only.contains("\"to\""));

    let whole_period = filter_text(Some("2024-01-01"), Some("2024-01-31"));
    assert!(whole_period.contains("\"to\""));
    assert!(whole_period.contains("gte"));
    assert!(whole_period.contains("2024-01-01T00:00:00.000Z"));
    assert!(whole_period.contains("\"from\""));
    assert!(whole_period.contains("lte"));
    assert!(whole_period.contains("2024-01-31T23:59:59.999Z"));
}

#[test]
fn period_filter_accepts_since_equal_to_until() {
    let text = filter_text(Some("2024-01-01"), Some("2024-01-01"));
    assert!(text.contains("2024-01-01T00:00:00.000Z"));
    assert!(text.contains("2024-01-01T23:59:59.999Z"));
}

#[test]
fn period_filter_rejects_since_after_until() {
    assert!(period_filter(Some("2024-01-02"), Some("2024-01-01")).is_err());
    assert!(period_filter(Some("2025-01-01"), Some("2024-12-31")).is_err());
}

#[test]
fn period_filter_rejects_a_day_that_is_not_a_day() {
    let not_days = vec![
        "abc",
        "",
        "2024-1-1",
        "2024-01-1",
        "2024/01/01",
        " 2024-01-01",
        "2024-01-01 ",
        "2024-01-01T00:00:00.000Z",
        "20240101",
    ];
    for day in not_days {
        assert!(period_filter(Some(day), None).is_err());
        assert!(period_filter(None, Some(day)).is_err());
        assert!(period_filter(Some(day), Some("2024-01-01")).is_err());
        assert!(period_filter(Some("2024-01-01"), Some(day)).is_err());
    }
}
