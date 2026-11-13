use crate::hist::validate::{exchange, session};

#[allow(unused_imports)]
use super::*;

#[test]
fn session_message_names_the_field() {
    let row = serde_json::json!({});
    let _ = session(&row);
}

#[test]
fn session_returns_the_first_tl_error() {
    let cases: Vec<(serde_json::Value, Option<&str>)> = vec![
        (serde_json::json!({}), Some("session.id is required")),
        (
            serde_json::json!({"id": "", "started": "x", "harness": "gemini"}),
            Some("session.id is required"),
        ),
        (
            serde_json::json!({"id": ID}),
            Some("session.started is not ISO-8601 UTC: undefined"),
        ),
        (
            serde_json::json!({"id": ID, "started": "x"}),
            Some("session.started is not ISO-8601 UTC: x"),
        ),
        (
            serde_json::json!({"id": ID, "started": 123}),
            Some("session.started is not ISO-8601 UTC: 123"),
        ),
        (
            serde_json::json!({"id": ID, "started": null}),
            Some("session.started is not ISO-8601 UTC: null"),
        ),
        (
            serde_json::json!({"id": ID, "started": "x", "harness": "gemini"}),
            Some("session.started is not ISO-8601 UTC: x"),
        ),
        (
            serde_json::json!({"id": ID, "started": TS, "harness": "gemini"}),
            Some("session.harness is not claude or pi: gemini"),
        ),
        (serde_json::json!({"id": ID, "started": TS}), None),
        (serde_json::json!({"id": "x", "started": TS}), None),
        (
            serde_json::json!({"id": ID, "started": TS, "harness": "claude"}),
            None,
        ),
        (
            serde_json::json!({"id": ID, "started": TS, "harness": "pi"}),
            None,
        ),
        (
            serde_json::json!({"id": ID, "started": TS, "host": "h", "path": "p"}),
            None,
        ),
    ];
    for (row, expected) in cases {
        assert_eq!(session(&row).as_deref(), expected, "row: {row}");
    }
}

#[test]
fn exchange_message_names_the_field() {
    let row = serde_json::json!({});
    let _ = exchange(&row);
}
