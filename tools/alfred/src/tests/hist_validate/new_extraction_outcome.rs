use crate::hist::validate::new_extraction;

#[allow(unused_imports)]
use super::*;

#[test]
fn new_extraction_outcome_errors() {
    let cases: Vec<(serde_json::Value, Option<&str>)> = vec![
        (
            serde_json::json!({
                "extractor_id": "3",
                "run": "r",
                "exchange_id": ID,
                "kind": "note",
                "quote": "q",
                "body": "{}",
                "created": TS
            }),
            Some("extractor_id is not a row id: 3"),
        ),
        (
            serde_json::json!({
                "extractor_id": 2.5,
                "run": "r",
                "exchange_id": ID,
                "kind": "note",
                "quote": "q",
                "body": "{}",
                "created": TS
            }),
            Some("extractor_id is not a row id: 2.5"),
        ),
        (
            serde_json::json!({
                "extractor_id": 1,
                "run": "r",
                "exchange_id": ID,
                "kind": "note",
                "quote": "q",
                "body": "{}",
                "created": TS,
                "dropped_by": "other:y"
            }),
            Some("dropped_by is not a known reason: other:y"),
        ),
        (
            serde_json::json!({
                "extractor_id": 1,
                "run": "r",
                "exchange_id": ID,
                "kind": "note",
                "quote": "q",
                "body": "{}",
                "created": TS,
                "dropped_by": "check"
            }),
            Some("dropped_by is not a known reason: check"),
        ),
        (
            serde_json::json!({
                "extractor_id": 1,
                "run": "r",
                "exchange_id": ID,
                "kind": "note",
                "quote": "q",
                "body": "{}",
                "created": TS,
                "dropped_by": "check:"
            }),
            Some("dropped_by is not a known reason: check:"),
        ),
        (
            serde_json::json!({
                "extractor_id": 1,
                "run": "r",
                "exchange_id": ID,
                "kind": "note",
                "quote": "q",
                "body": "{}",
                "created": TS,
                "dropped_by": "critic:"
            }),
            Some("dropped_by is not a known reason: critic:"),
        ),
        (
            serde_json::json!({
                "extractor_id": 1,
                "run": "r",
                "exchange_id": ID,
                "kind": "note",
                "quote": "q",
                "body": "{}",
                "created": TS,
                "dropped_by": "check:x"
            }),
            None,
        ),
        (
            serde_json::json!({
                "extractor_id": 1,
                "run": "r",
                "exchange_id": ID,
                "kind": "note",
                "quote": "q",
                "body": "{}",
                "created": TS,
                "dropped_by": "critic:x"
            }),
            None,
        ),
        (
            serde_json::json!({
                "extractor_id": 1,
                "run": "r",
                "exchange_id": ID,
                "kind": "note",
                "quote": "q",
                "body": "{}",
                "created": TS,
                "dropped_by": "check:x",
                "verdict": "v"
            }),
            Some("a dropped candidate has no verdict"),
        ),
        (
            serde_json::json!({
                "extractor_id": 1,
                "run": "r",
                "exchange_id": ID,
                "kind": "note",
                "quote": "q",
                "body": "{}",
                "created": TS,
                "dropped_by": "critic:x",
                "verdict": "v"
            }),
            Some("a dropped candidate has no verdict"),
        ),
        (
            serde_json::json!({
                "extractor_id": 1,
                "run": "r",
                "exchange_id": ID,
                "kind": "note",
                "quote": "q",
                "body": "{}",
                "created": TS,
                "saved_id": ID
            }),
            Some("a saved candidate has a verdict"),
        ),
        (
            serde_json::json!({
                "extractor_id": 1,
                "run": "r",
                "exchange_id": ID,
                "kind": "note",
                "quote": "q",
                "body": "{}",
                "created": TS,
                "saved_id": ID,
                "of": ID
            }),
            Some("a saved candidate has a verdict"),
        ),
        (
            serde_json::json!({
                "extractor_id": 1,
                "run": "r",
                "exchange_id": ID,
                "kind": "note",
                "quote": "q",
                "body": "{}",
                "created": TS,
                "of": ID
            }),
            Some("a pointer comes with a verdict"),
        ),
        (
            serde_json::json!({
                "extractor_id": 1,
                "run": "r",
                "exchange_id": ID,
                "kind": "note",
                "quote": "q",
                "body": "{}",
                "created": TS,
                "verdict": "keep"
            }),
            None,
        ),
        (
            serde_json::json!({
                "extractor_id": 1,
                "run": "r",
                "exchange_id": ID,
                "kind": "note",
                "quote": "q",
                "body": "{}",
                "created": TS,
                "verdict": "keep",
                "saved_id": ID
            }),
            None,
        ),
        (
            serde_json::json!({
                "extractor_id": 1,
                "run": "r",
                "exchange_id": ID,
                "kind": "note",
                "quote": "q",
                "body": "{}",
                "created": TS,
                "verdict": "keep",
                "of": ID
            }),
            None,
        ),
        (
            serde_json::json!({
                "extractor_id": 1,
                "run": "r",
                "exchange_id": ID,
                "kind": "note",
                "quote": "q",
                "body": "{}",
                "created": TS,
                "verdict": "keep",
                "saved_id": ID,
                "of": ID
            }),
            None,
        ),
        (
            serde_json::json!({
                "extractor_id": 1,
                "run": "r",
                "exchange_id": ID,
                "kind": "note",
                "quote": "q",
                "body": "{}",
                "created": TS,
                "dropped_by": "check:x",
                "probabilities": "{}"
            }),
            Some("a check drop has no probabilities"),
        ),
        (
            serde_json::json!({
                "extractor_id": 1,
                "run": "r",
                "exchange_id": ID,
                "kind": "note",
                "quote": "q",
                "body": "{}",
                "created": TS,
                "dropped_by": "critic:x",
                "probabilities": "{}"
            }),
            None,
        ),
        (
            serde_json::json!({
                "extractor_id": 1,
                "run": "r",
                "exchange_id": ID,
                "kind": "note",
                "quote": "q",
                "body": "{}",
                "created": TS,
                "verdict": "keep",
                "saved_id": ID,
                "probabilities": "{\"keep\":0.9}"
            }),
            None,
        ),
    ];
    for (row, expected) in cases {
        assert_eq!(new_extraction(&row).as_deref(), expected, "row: {row}");
    }
}
