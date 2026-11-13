use crate::hist::{Extraction, Extractor, NewExtraction};

#[allow(unused_imports)]
use super::*;

#[test]
fn new_extraction_defaults_the_optional_fields() {
    let row: NewExtraction = serde_json::from_str(
        r#"{"extractor_id":1,"run":"r1","exchange_id":"00000000-0000-0000-0000-000000000011","kind":"note","body":"{}","quote":"q","created":"2026-01-02T03:04:05.000Z"}"#,
    )
    .unwrap();
    assert_eq!(row.extractor_id, 1);
    assert_eq!(row.run, "r1");
    assert_eq!(row.kind, "note");
    assert_eq!(row.dropped_by, None);
    assert_eq!(row.probabilities, None);
    assert_eq!(row.verdict, None);
    assert_eq!(row.of, None);
    assert_eq!(row.saved_id, None);

    let row: NewExtraction = serde_json::from_str(
        r#"{"extractor_id":1,"run":"r1","exchange_id":"00000000-0000-0000-0000-000000000011","kind":"rule","body":"{}","quote":"q","dropped_by":"check:no","probabilities":"[0.9]","verdict":"keep","of":"other","saved_id":"00000000-0000-0000-0000-000000000012","created":"2026-01-02T03:04:05.000Z"}"#,
    )
    .unwrap();
    assert_eq!(row.dropped_by, Some("check:no".to_string()));
    assert_eq!(row.probabilities, Some("[0.9]".to_string()));
    assert_eq!(row.verdict, Some("keep".to_string()));
    assert_eq!(row.of, Some("other".to_string()));
    assert_eq!(
        row.saved_id,
        Some("00000000-0000-0000-0000-000000000012".to_string())
    );
}

#[test]
fn extraction_json_flattens_the_row() {
    let extraction = Extraction {
        id: 9,
        row: NewExtraction {
            extractor_id: 1,
            run: "r1".to_string(),
            exchange_id: "00000000-0000-0000-0000-000000000011".to_string(),
            kind: "note".to_string(),
            body: "{}".to_string(),
            quote: "q".to_string(),
            dropped_by: None,
            probabilities: None,
            verdict: None,
            of: None,
            saved_id: None,
            created: "2026-01-02T03:04:05.000Z".to_string(),
        },
    };
    let got = serde_json::to_value(&extraction).unwrap();
    let want: serde_json::Value = serde_json::from_str(
        r#"{"id":9,"extractor_id":1,"run":"r1","exchange_id":"00000000-0000-0000-0000-000000000011","kind":"note","body":"{}","quote":"q","dropped_by":null,"probabilities":null,"verdict":null,"of":null,"saved_id":null,"created":"2026-01-02T03:04:05.000Z"}"#,
    )
    .unwrap();
    assert_eq!(got, want);
    assert!(got.get("row").is_none());
    let back: Extraction = serde_json::from_value(got).unwrap();
    assert_eq!(back, extraction);
}

#[test]
fn extractor_json_keeps_active_as_a_boolean() {
    let extractor = Extractor {
        id: 1,
        parent: None,
        why: "why".to_string(),
        active: true,
        config: "{}".to_string(),
        created: "2026-01-02T03:04:05.000Z".to_string(),
    };
    let got = serde_json::to_value(&extractor).unwrap();
    let want: serde_json::Value = serde_json::from_str(
        r#"{"id":1,"parent":null,"why":"why","active":true,"config":"{}","created":"2026-01-02T03:04:05.000Z"}"#,
    )
    .unwrap();
    assert_eq!(got, want);
    let back: Extractor = serde_json::from_value(got).unwrap();
    assert_eq!(back, extractor);
}
