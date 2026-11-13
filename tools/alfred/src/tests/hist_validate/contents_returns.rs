use crate::hist::validate::{contents, new_extraction, new_extractor};

#[allow(unused_imports)]
use super::*;

#[test]
fn contents_returns_the_first_tl_error() {
    let cases: Vec<(serde_json::Value, Option<&str>)> = vec![
        (
            serde_json::json!({}),
            Some("contents.exchange_id is not an id: undefined"),
        ),
        (
            serde_json::json!({"exchange_id": "x", "input": 5, "output": 7, "tools": ""}),
            Some("contents.exchange_id is not an id: x"),
        ),
        (
            serde_json::json!({"exchange_id": "x"}),
            Some("contents.exchange_id is not an id: x"),
        ),
        (
            serde_json::json!({"exchange_id": ID}),
            Some("contents.input is required"),
        ),
        (
            serde_json::json!({"exchange_id": ID, "input": 5}),
            Some("contents.input is required"),
        ),
        (
            serde_json::json!({"exchange_id": ID, "input": ""}),
            Some("contents.output is required"),
        ),
        (
            serde_json::json!({"exchange_id": ID, "input": "a"}),
            Some("contents.output is required"),
        ),
        (
            serde_json::json!({"exchange_id": ID, "input": "a", "output": 7}),
            Some("contents.output is required"),
        ),
        (
            serde_json::json!({"exchange_id": ID, "input": "", "output": "b"}),
            None,
        ),
        (
            serde_json::json!({"exchange_id": ID, "input": "a", "output": "b"}),
            None,
        ),
        (
            serde_json::json!({"exchange_id": ID, "input": "a", "output": "b", "tools": ""}),
            Some("contents.tools is not a non-empty string"),
        ),
        (
            serde_json::json!({"exchange_id": ID, "input": "a", "output": "b", "tools": "x"}),
            None,
        ),
    ];
    for (row, expected) in cases {
        assert_eq!(contents(&row).as_deref(), expected, "row: {row}");
    }
}

#[test]
fn new_extractor_message_is_not_empty() {
    let row = serde_json::json!({});
    let _ = new_extractor(&row);
}

#[test]
fn new_extractor_returns_the_first_tl_error() {
    let cases: Vec<(serde_json::Value, Option<&str>)> = vec![
        (serde_json::json!({}), Some("why is required")),
        (
            serde_json::json!({"why": "", "config": "nope", "created": "x", "parent": 0}),
            Some("why is required"),
        ),
        (serde_json::json!({"why": "x"}), Some("config must be JSON")),
        (
            serde_json::json!({"why": "x", "config": "nope"}),
            Some("config must be JSON"),
        ),
        (
            serde_json::json!({"why": "x", "config": "{}"}),
            Some("created is not ISO-8601 UTC: undefined"),
        ),
        (
            serde_json::json!({"why": "x", "config": "{}", "created": "x"}),
            Some("created is not ISO-8601 UTC: x"),
        ),
        (
            serde_json::json!({"why": "x", "config": "{}", "created": TS, "parent": 0}),
            Some("parent is not a row id: 0"),
        ),
        (
            serde_json::json!({"why": "x", "config": "{}", "created": TS, "parent": -1}),
            Some("parent is not a row id: -1"),
        ),
        (
            serde_json::json!({"why": "x", "config": "{}", "created": TS, "parent": "5"}),
            Some("parent is not a row id: 5"),
        ),
        (
            serde_json::json!({"why": "x", "config": "{}", "created": TS, "parent": 1}),
            None,
        ),
        (
            serde_json::json!({"why": "x", "config": "{}", "created": TS, "parent": null}),
            None,
        ),
        (
            serde_json::json!({"why": "x", "config": "{}", "created": TS}),
            None,
        ),
        (
            serde_json::json!({"why": "w", "config": "{\"model\":\"m\"}", "created": TS, "parent": 1}),
            None,
        ),
    ];
    for (row, expected) in cases {
        assert_eq!(new_extractor(&row).as_deref(), expected, "row: {row}");
    }
}

#[test]
fn new_extraction_message_is_not_empty() {
    let row = serde_json::json!({});
    let _ = new_extraction(&row);
}
