use serde_json::{Value, json};

use super::*;

#[test]
fn join_body_drops_empty_parts_and_joins_with_two_newlines() {
    assert_eq!(join_body(&strings(&[])), "");
    assert_eq!(join_body(&strings(&[""])), "");
    assert_eq!(join_body(&strings(&["", ""])), "");
    assert_eq!(join_body(&strings(&["a"])), "a");
    assert_eq!(join_body(&strings(&["", "a"])), "a");
    assert_eq!(join_body(&strings(&["a", ""])), "a");
    assert_eq!(join_body(&strings(&["a", "", "b"])), "a\n\nb");
    assert_eq!(join_body(&strings(&["", "a", "", "b", ""])), "a\n\nb");
    assert_eq!(join_body(&strings(&["a", "b", "c"])), "a\n\nb\n\nc");
    assert_eq!(join_body(&strings(&["a\n\nb"])), "a\n\nb");
}

#[test]
fn join_body_keeps_whitespace_parts() {
    assert_eq!(join_body(&strings(&["\n", "a"])), "\n\n\na");
    assert_eq!(join_body(&strings(&["a", "\n"])), "a\n\n\n");
    assert_eq!(join_body(&strings(&[" ", "a"])), " \n\na");
}

#[test]
fn join_tools_is_none_when_the_joined_text_would_be_empty() {
    assert_eq!(join_tools(&strings(&[])), None);
    assert_eq!(join_tools(&strings(&[""])), None);
    assert_eq!(join_tools(&strings(&["", ""])), None);
    assert_eq!(join_tools(&strings(&["", "a", ""])), Some("a".to_string()));
}

#[test]
fn join_tools_joins_the_rest_with_two_newlines() {
    assert_eq!(join_tools(&strings(&["a"])), Some("a".to_string()));
    assert_eq!(
        join_tools(&strings(&["a", "b"])),
        Some("a\n\nb".to_string())
    );
    assert_eq!(
        join_tools(&strings(&["a", "", "b"])),
        Some("a\n\nb".to_string())
    );
}

#[test]
fn stringify_is_empty_for_null_or_absent_values() {
    assert_eq!(stringify(None), "");
    assert_eq!(stringify(Some(&Value::Null)), "");
}

#[test]
fn stringify_returns_strings_as_they_are() {
    assert_eq!(stringify(Some(&json!("hello"))), "hello");
    assert_eq!(stringify(Some(&json!(""))), "");
    assert_eq!(
        stringify(Some(&json!("with \"quotes\""))),
        "with \"quotes\""
    );
    assert_eq!(stringify(Some(&json!("line\nbreak"))), "line\nbreak");
}

#[test]
fn stringify_serializes_other_values_without_spaces() {
    assert_eq!(stringify(Some(&json!(true))), "true");
    assert_eq!(stringify(Some(&json!(false))), "false");
    assert_eq!(stringify(Some(&json!(5))), "5");
    assert_eq!(stringify(Some(&json!(1.5))), "1.5");
    assert_eq!(stringify(Some(&json!([1, "x"]))), r#"[1,"x"]"#);
    assert_eq!(
        stringify(Some(&json!({"a": 1, "b": null}))),
        r#"{"a":1,"b":null}"#
    );
    assert_eq!(
        stringify(Some(&json!({"outer": {"inner": "v"}}))),
        r#"{"outer":{"inner":"v"}}"#
    );
}
