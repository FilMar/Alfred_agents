use crate::hist::{Contents, Exchange, Session, bool_param, int_param};

#[allow(unused_imports)]
use super::*;

#[test]
fn int_param_reads_like_javascript_parse_int() {
    let cases: &[(Option<&str>, Option<i64>)] = &[
        (Some("10abc"), Some(10)),
        (Some("3.7"), Some(3)),
        (Some("abc"), None),
        (Some(""), None),
        (None, None),
        (Some(" 42"), Some(42)),
        (Some("\t42"), Some(42)),
        (Some("   "), None),
        (Some("+42"), Some(42)),
        (Some(" -7"), Some(-7)),
        (Some("  -12px"), Some(-12)),
        (Some("-0"), Some(0)),
        (Some("+"), None),
        (Some("+-1"), None),
        (Some("- 1"), None),
        (Some("007"), Some(7)),
        (Some("0x10"), Some(0)),
        (Some("abc123"), None),
        (Some("9223372036854775807"), Some(i64::MAX)),
        (Some("-9223372036854775808"), Some(i64::MIN)),
    ];
    for &(raw, want) in cases {
        assert_eq!(int_param(raw), want, "int_param({raw:?})");
    }
}

#[test]
fn bool_param_reads_only_true_and_false() {
    let cases: &[(Option<&str>, Option<bool>)] = &[
        (Some("true"), Some(true)),
        (Some("false"), Some(false)),
        (None, None),
        (Some("TRUE"), None),
        (Some("False"), None),
        (Some("1"), None),
        (Some("0"), None),
        (Some("yes"), None),
        (Some("no"), None),
        (Some(""), None),
        (Some(" "), None),
        (Some(" true"), None),
        (Some("true "), None),
        (Some("truetrue"), None),
        (Some("falsey"), None),
    ];
    for &(raw, want) in cases {
        assert_eq!(bool_param(raw), want, "bool_param({raw:?})");
    }
}

#[test]
fn params_never_panic_on_any_input() {
    for raw in [
        "",
        " ",
        "\t",
        "abc",
        "+",
        "-",
        "+-1",
        "10abc",
        " 42 ",
        "é",
        "日本語42",
        "\u{00a0}5",
        "٣٣",
        "99999999999999999999999",
        "-9223372036854775809",
        "true",
        "TRUE",
        "false",
    ] {
        int_param(Some(raw));
        bool_param(Some(raw));
    }
    int_param(None);
    bool_param(None);
}

#[test]
fn session_json_omits_absent_fields_and_round_trips() {
    let minimal = Session {
        id: "00000000-0000-0000-0000-000000000001".to_string(),
        started: "2026-01-02T03:04:05.000Z".to_string(),
        harness: None,
        host: None,
        path: None,
    };
    let got = serde_json::to_value(&minimal).unwrap();
    let want: serde_json::Value = serde_json::from_str(
        r#"{"id":"00000000-0000-0000-0000-000000000001","started":"2026-01-02T03:04:05.000Z"}"#,
    )
    .unwrap();
    assert_eq!(got, want);

    let full = Session {
        id: "00000000-0000-0000-0000-000000000001".to_string(),
        started: "2026-01-02T03:04:05.000Z".to_string(),
        harness: Some("claude".to_string()),
        host: Some("box".to_string()),
        path: Some("/w".to_string()),
    };
    let got = serde_json::to_value(&full).unwrap();
    let want: serde_json::Value = serde_json::from_str(
        r#"{"id":"00000000-0000-0000-0000-000000000001","started":"2026-01-02T03:04:05.000Z","harness":"claude","host":"box","path":"/w"}"#,
    )
    .unwrap();
    assert_eq!(got, want);
}

#[test]
fn exchange_json_omits_absent_fields_and_round_trips() {
    let minimal = Exchange {
        id: "00000000-0000-0000-0000-000000000011".to_string(),
        session: "00000000-0000-0000-0000-000000000001".to_string(),
        parent: None,
        timestamp: "2026-01-02T03:04:05.000Z".to_string(),
        kind: "chat".to_string(),
        actor: "user".to_string(),
        model: None,
        tokens_in: None,
        tokens_out: None,
        tokens_cache_read: None,
        tokens_cache_write: None,
        distilled: None,
        meta: None,
    };
    let got = serde_json::to_value(&minimal).unwrap();
    let want: serde_json::Value = serde_json::from_str(
        r#"{"id":"00000000-0000-0000-0000-000000000011","session":"00000000-0000-0000-0000-000000000001","timestamp":"2026-01-02T03:04:05.000Z","kind":"chat","actor":"user"}"#,
    )
    .unwrap();
    assert_eq!(got, want);

    let full = Exchange {
        id: "00000000-0000-0000-0000-000000000011".to_string(),
        session: "00000000-0000-0000-0000-000000000001".to_string(),
        parent: Some("00000000-0000-0000-0000-000000000010".to_string()),
        timestamp: "2026-01-02T03:04:05.000Z".to_string(),
        kind: "subtask".to_string(),
        actor: "assistant".to_string(),
        model: Some("m".to_string()),
        tokens_in: Some(10),
        tokens_out: Some(20),
        tokens_cache_read: Some(30),
        tokens_cache_write: Some(40),
        distilled: Some("2026-01-02T03:04:06.000Z".to_string()),
        meta: Some(serde_json::from_str(r#"{"turn":1}"#).unwrap()),
    };
    let got = serde_json::to_value(&full).unwrap();
    let want: serde_json::Value = serde_json::from_str(
        r#"{"id":"00000000-0000-0000-0000-000000000011","session":"00000000-0000-0000-0000-000000000001","parent":"00000000-0000-0000-0000-000000000010","timestamp":"2026-01-02T03:04:05.000Z","kind":"subtask","actor":"assistant","model":"m","tokens_in":10,"tokens_out":20,"tokens_cache_read":30,"tokens_cache_write":40,"distilled":"2026-01-02T03:04:06.000Z","meta":{"turn":1}}"#,
    )
    .unwrap();
    assert_eq!(got, want);
}

#[test]
fn contents_json_omits_absent_tools_and_round_trips() {
    let minimal = Contents {
        exchange_id: "00000000-0000-0000-0000-000000000011".to_string(),
        input: "in".to_string(),
        output: "out".to_string(),
        tools: None,
    };
    let got = serde_json::to_value(&minimal).unwrap();
    let want: serde_json::Value = serde_json::from_str(
        r#"{"exchange_id":"00000000-0000-0000-0000-000000000011","input":"in","output":"out"}"#,
    )
    .unwrap();
    assert_eq!(got, want);

    let full = Contents {
        exchange_id: "00000000-0000-0000-0000-000000000011".to_string(),
        input: "in".to_string(),
        output: "out".to_string(),
        tools: Some("[]".to_string()),
    };
    let got = serde_json::to_value(&full).unwrap();
    let want: serde_json::Value = serde_json::from_str(
        r#"{"exchange_id":"00000000-0000-0000-0000-000000000011","input":"in","output":"out","tools":"[]"}"#,
    )
    .unwrap();
    assert_eq!(got, want);
}
