use crate::hist::validate::new_extraction;

#[allow(unused_imports)]
use super::*;

#[test]
fn new_extraction_outcome_errors() {
    let cases = [
        (
            extraction_row(json!({"extractor_id": "3"})),
            Some("extractor_id is not a row id: 3"),
        ),
        (
            extraction_row(json!({"extractor_id": 2.5})),
            Some("extractor_id is not a row id: 2.5"),
        ),
        (
            extraction_row(json!({"dropped_by": "other:y"})),
            Some("dropped_by is not a known reason: other:y"),
        ),
        (
            extraction_row(json!({"dropped_by": "check"})),
            Some("dropped_by is not a known reason: check"),
        ),
        (
            extraction_row(json!({"dropped_by": "check:"})),
            Some("dropped_by is not a known reason: check:"),
        ),
        (
            extraction_row(json!({"dropped_by": "critic:"})),
            Some("dropped_by is not a known reason: critic:"),
        ),
        (extraction_row(json!({"dropped_by": "check:x"})), None),
        (extraction_row(json!({"dropped_by": "critic:x"})), None),
        (
            extraction_row(json!({"dropped_by": "check:x", "verdict": "v"})),
            Some("a dropped candidate has no verdict"),
        ),
        (
            extraction_row(json!({"dropped_by": "critic:x", "verdict": "v"})),
            Some("a dropped candidate has no verdict"),
        ),
        (
            extraction_row(json!({"saved_id": ID})),
            Some("a saved candidate has a verdict"),
        ),
        (
            extraction_row(json!({"saved_id": ID, "of": ID})),
            Some("a saved candidate has a verdict"),
        ),
        (
            extraction_row(json!({"of": ID})),
            Some("a pointer comes with a verdict"),
        ),
        (extraction_row(json!({"verdict": "keep"})), None),
        (
            extraction_row(json!({"verdict": "keep", "saved_id": ID})),
            None,
        ),
        (extraction_row(json!({"verdict": "keep", "of": ID})), None),
        (
            extraction_row(json!({"verdict": "keep", "saved_id": ID, "of": ID})),
            None,
        ),
        (
            extraction_row(json!({"dropped_by": "check:x", "probabilities": "{}"})),
            Some("a check drop has no probabilities"),
        ),
        (
            extraction_row(json!({"dropped_by": "critic:x", "probabilities": "{}"})),
            None,
        ),
        (
            extraction_row(
                json!({"verdict": "keep", "saved_id": ID, "probabilities": "{\"keep\":0.9}"}),
            ),
            None,
        ),
    ];
    for (row, expected) in cases {
        assert_eq!(new_extraction(&row).as_deref(), expected, "row: {row}");
    }
}
