use crate::hist::validate::{is_day, is_id, is_timestamp, js};

#[allow(unused_imports)]
use super::*;

#[test]
fn is_id_matches_the_id_form() {
    let cases: Vec<(&str, bool)> = vec![
        (ID, true),
        (OTHER_ID, true),
        ("01234567-89ab-cdef-0123-456789abcde", false),
        ("01234567-89ab-cdef-0123-456789abcdeff", false),
        ("012345678-9ab-cdef-0123-456789abcdef", false),
        ("01234567-89ab-cdef-0123456789abcdef", false),
        ("g1234567-89ab-cdef-0123-456789abcdef", false),
        ("01234567-89AB-CDEF-0123-456789ABCDEF", false),
        ("", false),
    ];
    for (text, expected) in cases {
        assert_eq!(is_id(text), expected, "text: {text}");
    }
}

#[test]
fn is_timestamp_matches_the_timestamp_form() {
    let cases: Vec<(&str, bool)> = vec![
        (TS, true),
        ("2026-12-31T23:59:59.999Z", true),
        ("2026-01-02T03:04:05Z", false),
        ("2026-01-02T03:04:05.0Z", false),
        ("2026-01-02T03:04:05.00Z", false),
        ("2026-01-02T03:04:05.0001Z", false),
        ("2026-01-02T03:04:05.006", false),
        ("2026-01-02T03:04:05.006z", false),
        ("2026-01-02 03:04:05.006Z", false),
        ("x026-01-02T03:04:05.006Z", false),
        ("2026-01-02T03:04:05.006ZZ", false),
        ("", false),
    ];
    for (text, expected) in cases {
        assert_eq!(is_timestamp(text), expected, "text: {text}");
    }
}

#[test]
fn is_day_matches_the_day_form() {
    let cases: Vec<(&str, bool)> = vec![
        (DAY, true),
        ("2026-12-31", true),
        ("2026-1-02", false),
        ("2026-01-2", false),
        ("2026-01-0", false),
        ("2026-01-022", false),
        ("2026-01-02T", false),
        ("2026/01/02", false),
        ("x026-01-02", false),
        ("", false),
    ];
    for (text, expected) in cases {
        assert_eq!(is_day(text), expected, "text: {text}");
    }
}

#[test]
fn js_prints_values_like_javascript() {
    let cases: Vec<(Option<serde_json::Value>, &str)> = vec![
        (None, "undefined"),
        (Some(serde_json::Value::Null), "null"),
        (Some(serde_json::json!("hi")), "hi"),
        (Some(serde_json::json!("")), ""),
        (Some(serde_json::json!(42)), "42"),
        (Some(serde_json::json!(-7)), "-7"),
        (Some(serde_json::json!(1.5)), "1.5"),
        (Some(serde_json::json!(true)), "true"),
        (Some(serde_json::json!(false)), "false"),
        (Some(serde_json::json!([1, "a"])), "1,a"),
        (Some(serde_json::json!({})), "[object Object]"),
    ];
    for (value, expected) in cases {
        assert_eq!(js(value.as_ref()), expected, "value: {value:?}");
    }
}

#[test]
fn json_fields_must_be_strings_as_in_tl() {
    let extractor = json!({"why": "x", "config": {}, "created": TS});
    let message = crate::hist::validate::new_extractor(&extractor);
    assert_eq!(message.as_deref(), Some("config must be JSON"));
    let message = crate::hist::validate::new_extraction(&extraction_row(json!({"body": {}})));
    assert_eq!(message.as_deref(), Some("body must be JSON"));
}
