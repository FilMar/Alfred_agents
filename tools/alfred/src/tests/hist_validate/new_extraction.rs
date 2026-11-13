use crate::hist::validate::new_extraction;

#[allow(unused_imports)]
use super::*;

#[test]
fn new_extraction_identity_and_payload_errors() {
    let cases: Vec<(serde_json::Value, Option<&str>)> = vec![
        (
            serde_json::json!({}),
            Some("extractor_id is not a row id: undefined"),
        ),
        (
            serde_json::json!({"extractor_id": 0, "run": "", "exchange_id": "x", "kind": "x"}),
            Some("extractor_id is not a row id: 0"),
        ),
        (
            serde_json::json!({"extractor_id": 1}),
            Some("run is required"),
        ),
        (
            serde_json::json!({"extractor_id": 1, "run": ""}),
            Some("run is required"),
        ),
        (
            serde_json::json!({"extractor_id": 1, "run": "r"}),
            Some("exchange_id is not an id: undefined"),
        ),
        (
            serde_json::json!({"extractor_id": 1, "run": "r", "exchange_id": "x"}),
            Some("exchange_id is not an id: x"),
        ),
        (
            serde_json::json!({"extractor_id": 1, "run": "r", "exchange_id": ID}),
            Some("kind is not note or rule: undefined"),
        ),
        (
            serde_json::json!({"extractor_id": 1, "run": "r", "exchange_id": ID, "kind": "x"}),
            Some("kind is not note or rule: x"),
        ),
        (
            serde_json::json!({"extractor_id": 1, "run": "r", "exchange_id": ID, "kind": "note"}),
            Some("quote is required unless a check dropped the candidate"),
        ),
        (
            serde_json::json!({
                "extractor_id": 1,
                "run": "r",
                "exchange_id": ID,
                "kind": "note",
                "quote": ""
            }),
            Some("quote is required unless a check dropped the candidate"),
        ),
        (
            serde_json::json!({
                "extractor_id": 1,
                "run": "r",
                "exchange_id": ID,
                "kind": "note",
                "dropped_by": "check:x"
            }),
            Some("body must be JSON"),
        ),
        (
            serde_json::json!({
                "extractor_id": 1,
                "run": "r",
                "exchange_id": ID,
                "kind": "note",
                "dropped_by": "critic:x"
            }),
            Some("quote is required unless a check dropped the candidate"),
        ),
        (
            serde_json::json!({"extractor_id": 1, "run": "r", "exchange_id": ID, "kind": "note", "quote": "q"}),
            Some("body must be JSON"),
        ),
        (
            serde_json::json!({
                "extractor_id": 1,
                "run": "r",
                "exchange_id": ID,
                "kind": "note",
                "quote": "q",
                "body": "nope"
            }),
            Some("body must be JSON"),
        ),
        (
            serde_json::json!({
                "extractor_id": 1,
                "run": "r",
                "exchange_id": ID,
                "kind": "note",
                "quote": "q",
                "body": "{}"
            }),
            Some("created is not ISO-8601 UTC: undefined"),
        ),
        (
            serde_json::json!({
                "extractor_id": 1,
                "run": "r",
                "exchange_id": ID,
                "kind": "note",
                "quote": "q",
                "body": "{}",
                "probabilities": null
            }),
            Some("created is not ISO-8601 UTC: undefined"),
        ),
        (
            serde_json::json!({
                "extractor_id": 1,
                "run": "r",
                "exchange_id": ID,
                "kind": "note",
                "quote": "q",
                "body": "{}",
                "probabilities": "nope",
                "created": TS
            }),
            Some("probabilities must be JSON"),
        ),
        (
            serde_json::json!({
                "extractor_id": 1,
                "run": "r",
                "exchange_id": ID,
                "kind": "note",
                "quote": "q",
                "body": "{}",
                "created": "x"
            }),
            Some("created is not ISO-8601 UTC: x"),
        ),
        (
            serde_json::json!({
                "extractor_id": 1,
                "run": "r",
                "exchange_id": ID,
                "kind": "note",
                "quote": "q",
                "body": "{}",
                "created": TS
            }),
            None,
        ),
        (
            serde_json::json!({
                "extractor_id": 1,
                "run": "r",
                "exchange_id": ID,
                "kind": "rule",
                "quote": "q",
                "body": "{}",
                "created": TS
            }),
            None,
        ),
    ];
    for (row, expected) in cases {
        assert_eq!(new_extraction(&row).as_deref(), expected, "row: {row}");
    }
}
