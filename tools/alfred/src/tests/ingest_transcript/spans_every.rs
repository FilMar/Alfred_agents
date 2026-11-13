use crate::hist::ingest::transcript::{
    join_body, join_tools, parse_lines, spans, stringify, text_of,
};
use serde_json::{Value, json};

#[allow(unused_imports)]
use super::*;

#[test]
fn spans_every_span_opens_with_an_opener() {
    let lines = vec![
        json!({"kind": "answer"}),
        json!({"kind": "other"}),
        json!({"kind": "opener"}),
        json!({"kind": "answer"}),
    ];
    let _ = spans(&lines, tag_opener, tag_answer);
}

#[test]
fn spans_no_line_counted_twice() {
    let lines = vec![
        json!({"kind": "answer"}),
        json!({"kind": "other"}),
        json!({"kind": "opener"}),
        json!({"kind": "answer"}),
        json!({"kind": "opener"}),
    ];
    let _ = spans(&lines, tag_opener, tag_answer);
}

#[test]
fn parse_lines_skips_empty_and_invalid_lines() {
    assert!(parse_lines("").is_empty());
    assert!(parse_lines("\n\n").is_empty());
    assert!(parse_lines("not json").is_empty());
    assert!(parse_lines("not json\n{\nalso not").is_empty());
}

#[test]
fn parse_lines_reads_one_json_value_per_line() {
    assert_eq!(parse_lines("{\"a\":1}"), vec![json!({"a": 1})]);
    assert_eq!(parse_lines("{\"a\":1}\n"), vec![json!({"a": 1})]);
    assert_eq!(
        parse_lines("{\"a\":1}\n{\"b\":2}\n"),
        vec![json!({"a": 1}), json!({"b": 2})]
    );
    assert_eq!(
        parse_lines("{\"a\":1}\n\nbad\n  \n{\"b\":2}"),
        vec![json!({"a": 1}), json!({"b": 2})]
    );
}

#[test]
fn parse_lines_keeps_any_json_value() {
    assert_eq!(parse_lines("5"), vec![json!(5)]);
    assert_eq!(parse_lines("true"), vec![json!(true)]);
    assert_eq!(parse_lines("null"), vec![json!(null)]);
    assert_eq!(parse_lines("[1, 2]"), vec![json!([1, 2])]);
    assert_eq!(parse_lines("\"text\""), vec![json!("text")]);
}

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
fn join_body_no_empty_part_joined() {
    let _ = join_body(&strings(&["", "a", ""]));
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
fn join_tools_never_an_empty_text() {
    let _ = join_tools(&strings(&["", ""]));
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

#[test]
fn text_of_finds_the_string_at_the_path() {
    assert_eq!(
        text_of(&json!({"a": {"b": "x"}}), &["a", "b"]),
        Some("x".to_string())
    );
    assert_eq!(
        text_of(&json!({"a": {"b": {"c": "deep"}}}), &["a", "b", "c"]),
        Some("deep".to_string())
    );
    assert_eq!(text_of(&json!("whole"), &[]), Some("whole".to_string()));
}

#[test]
fn text_of_is_none_when_the_value_at_the_path_is_not_a_string() {
    assert_eq!(text_of(&json!({}), &["missing"]), None);
    assert_eq!(text_of(&json!({"a": 3}), &["a"]), None);
    assert_eq!(text_of(&json!({"a": null}), &["a"]), None);
    assert_eq!(text_of(&json!({"a": ["x"]}), &["a"]), None);
    assert_eq!(text_of(&json!({"a": {"b": "x"}}), &["a"]), None);
    assert_eq!(text_of(&json!({"a": {"b": "x"}}), &["a", "b", "c"]), None);
    assert_eq!(text_of(&json!({"a": {"b": "x"}}), &["missing", "b"]), None);
}
