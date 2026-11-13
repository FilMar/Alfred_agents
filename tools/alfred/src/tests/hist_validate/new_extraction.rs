use crate::hist::validate::new_extraction;

#[allow(unused_imports)]
use super::*;

#[test]
fn new_extraction_identity_and_payload_errors() {
    let cases = [
        (json!({}), Some("extractor_id is not a row id: undefined")),
        (
            json!({"extractor_id": 0, "run": "", "exchange_id": "x", "kind": "x"}),
            Some("extractor_id is not a row id: 0"),
        ),
        (json!({"extractor_id": 1}), Some("run is required")),
        (
            json!({"extractor_id": 1, "run": ""}),
            Some("run is required"),
        ),
        (
            json!({"extractor_id": 1, "run": "r"}),
            Some("exchange_id is not an id: undefined"),
        ),
        (
            json!({"extractor_id": 1, "run": "r", "exchange_id": "x"}),
            Some("exchange_id is not an id: x"),
        ),
        (
            json!({"extractor_id": 1, "run": "r", "exchange_id": ID}),
            Some("kind is not note or rule: undefined"),
        ),
        (
            json!({"extractor_id": 1, "run": "r", "exchange_id": ID, "kind": "x"}),
            Some("kind is not note or rule: x"),
        ),
        (
            json!({"extractor_id": 1, "run": "r", "exchange_id": ID, "kind": "note"}),
            Some("quote is required unless a check dropped the candidate"),
        ),
        (
            json!({"extractor_id": 1, "run": "r", "exchange_id": ID, "kind": "note", "quote": ""}),
            Some("quote is required unless a check dropped the candidate"),
        ),
        (
            json!({"extractor_id": 1, "run": "r", "exchange_id": ID, "kind": "note", "dropped_by": "check:x"}),
            Some("body must be JSON"),
        ),
        (
            json!({"extractor_id": 1, "run": "r", "exchange_id": ID, "kind": "note", "dropped_by": "critic:x"}),
            Some("quote is required unless a check dropped the candidate"),
        ),
        (
            json!({"extractor_id": 1, "run": "r", "exchange_id": ID, "kind": "note", "quote": "q"}),
            Some("body must be JSON"),
        ),
        (
            json!({"extractor_id": 1, "run": "r", "exchange_id": ID, "kind": "note", "quote": "q", "body": "nope"}),
            Some("body must be JSON"),
        ),
        (
            json!({"extractor_id": 1, "run": "r", "exchange_id": ID, "kind": "note", "quote": "q", "body": "{}"}),
            Some("created is not ISO-8601 UTC: undefined"),
        ),
        (
            json!({"extractor_id": 1, "run": "r", "exchange_id": ID, "kind": "note", "quote": "q", "body": "{}", "probabilities": null}),
            Some("created is not ISO-8601 UTC: undefined"),
        ),
        (
            extraction_row(json!({"probabilities": "nope"})),
            Some("probabilities must be JSON"),
        ),
        (
            json!({"extractor_id": 1, "run": "r", "exchange_id": ID, "kind": "note", "quote": "q", "body": "{}", "created": "x"}),
            Some("created is not ISO-8601 UTC: x"),
        ),
        (extraction_row(json!({})), None),
        (
            json!({"extractor_id": 1, "run": "r", "exchange_id": ID, "kind": "rule", "quote": "q", "body": "{}", "created": TS}),
            None,
        ),
    ];
    for (row, expected) in cases {
        assert_eq!(new_extraction(&row).as_deref(), expected, "row: {row}");
    }
}
