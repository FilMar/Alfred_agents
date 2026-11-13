use crate::hist::ingest::transcript::{MAIN_ACTOR, line_text, line_tools, parse, spans};
use serde_json::{Value, json};

#[allow(unused_imports)]
use super::*;

#[test]
fn main_actor_is_alfredo() {
    assert_eq!(MAIN_ACTOR, "alfredo");
}

#[test]
fn parse_no_session_no_exchanges() {
    let lines = vec![
        json!({
            "type": "message",
            "id": "m1",
            "timestamp": "2025-01-01T00:00:00.000Z",
            "message": {"role": "user", "content": "redo the ingest"}
        }),
        json!({
            "type": "message",
            "timestamp": "2025-01-01T00:00:01.000Z",
            "message": {
                "role": "assistant",
                "content": [{"type": "text", "text": "done"}],
                "usage": {"input": 3, "output": 1}
            }
        }),
    ];
    let _ = parse(&pi_format(), &lines, Some("box"));
}

#[test]
fn parse_contents_of_the_same_exchange() {
    let lines = vec![
        json!({
            "type": "user",
            "origin": {"kind": "human"},
            "cwd": "/tmp/probe",
            "sessionId": "sess-1",
            "timestamp": "2025-01-01T00:00:00.000Z",
            "uuid": "u1",
            "message": {"role": "user", "content": "first question"}
        }),
        json!({
            "type": "assistant",
            "sessionId": "sess-1",
            "timestamp": "2025-01-01T00:00:01.000Z",
            "uuid": "a1",
            "message": {
                "role": "assistant",
                "model": "claude-probe",
                "content": [{"type": "text", "text": "first answer"}]
            },
            "usage": {
                "input_tokens": 10,
                "output_tokens": 2,
                "cache_read_input_tokens": 0,
                "cache_creation_input_tokens": 0
            }
        }),
        json!({
            "type": "user",
            "origin": {"kind": "human"},
            "sessionId": "sess-1",
            "timestamp": "2025-01-01T00:00:02.000Z",
            "uuid": "u2",
            "message": {
                "role": "user",
                "content": [{"type": "text", "text": "second question"}]
            }
        }),
        json!({
            "type": "user",
            "sessionId": "sess-1",
            "timestamp": "2025-01-01T00:00:03.000Z",
            "uuid": "r1",
            "message": {
                "role": "user",
                "content": [{"type": "tool_result", "content": "grep output"}]
            }
        }),
        json!({
            "type": "assistant",
            "sessionId": "sess-1",
            "timestamp": "2025-01-01T00:00:04.000Z",
            "uuid": "a2",
            "message": {
                "role": "assistant",
                "model": "claude-probe",
                "content": [
                    {"type": "tool_use", "name": "grep", "input": {"q": "x"}},
                    {"type": "text", "text": "second answer"}
                ]
            },
            "usage": {
                "input_tokens": 5,
                "output_tokens": 1,
                "cache_read_input_tokens": 3,
                "cache_creation_input_tokens": 2
            }
        }),
    ];
    let _ = parse(&claude_format(), &lines, Some("box"));
}

#[test]
fn parse_the_session_names_its_harness() {
    let lines = vec![json!({
        "type": "user",
        "origin": {"kind": "human"},
        "cwd": "/tmp/probe",
        "sessionId": "sess-1",
        "timestamp": "2025-01-01T00:00:00.000Z",
        "uuid": "u1",
        "message": {"role": "user", "content": "hello"}
    })];
    let _ = parse(&claude_format(), &lines, None);
}

#[test]
fn line_text_returns_string_content_as_is() {
    let format = probe_format();
    assert_eq!(
        line_text(
            &format,
            &json!({"message": {"role": "user", "content": "plain"}})
        ),
        "plain"
    );
    assert_eq!(
        line_text(
            &format,
            &json!({"message": {"role": "user", "content": ""}})
        ),
        ""
    );
    assert_eq!(
        line_text(&format, &json!({"message": {"content": "no role"}})),
        "no role"
    );
}

#[test]
fn line_text_joins_text_parts_with_one_newline() {
    let line = json!({"message": {"role": "user", "content": [
        {"say": "a"},
        {"other": 1},
        {"say": "b"}
    ]}});
    assert_eq!(line_text(&probe_format(), &line), "a\nb");
}

#[test]
fn line_text_drops_empty_part_texts() {
    let line = json!({"message": {"role": "user", "content": [
        {"blank": true},
        {"say": "a"},
        {"say": ""},
        {"blank": true}
    ]}});
    assert_eq!(line_text(&probe_format(), &line), "a");
    let spaced = json!({"message": {"role": "user", "content": [
        {"say": "a"},
        {"blank": true},
        {"say": "b"}
    ]}});
    assert_eq!(line_text(&probe_format(), &spaced), "a\nb");
}

#[test]
fn line_text_is_empty_without_text_parts() {
    let format = probe_format();
    assert_eq!(line_text(&format, &json!({"type": "user"})), "");
    assert_eq!(
        line_text(
            &format,
            &json!({"message": {"role": "user", "content": []}})
        ),
        ""
    );
    assert_eq!(
        line_text(
            &format,
            &json!({"message": {"role": "user", "content": [{"other": 1}]}})
        ),
        ""
    );
    assert_eq!(
        line_text(
            &format,
            &json!({"message": {"role": "user", "content": [{"blank": true}]}})
        ),
        ""
    );
    assert_eq!(
        line_text(&format, &json!({"message": {"role": "user", "content": 5}})),
        ""
    );
}

#[test]
fn line_text_passes_the_message_role_to_part_text() {
    let format = probe_format();
    let muted = json!({"message": {"role": "mute", "content": [{"say": "a"}]}});
    assert_eq!(line_text(&format, &muted), "");
    let speaking = json!({"message": {"role": "user", "content": [{"say": "a"}]}});
    assert_eq!(line_text(&format, &speaking), "a");
}

#[test]
fn line_tools_joins_tool_parts_with_one_newline() {
    let line = json!({"message": {"role": "assistant", "content": [
        {"tool": "grep"},
        {"other": 1},
        {"tool": "read"}
    ]}});
    assert_eq!(
        line_tools(&probe_format(), &line),
        "[tool grep]\n[tool read]"
    );
}

#[test]
fn line_tools_is_empty_without_tool_parts() {
    let format = probe_format();
    assert_eq!(
        line_tools(
            &format,
            &json!({"message": {"role": "assistant", "content": "text"}})
        ),
        ""
    );
    assert_eq!(
        line_tools(
            &format,
            &json!({"message": {"role": "assistant", "content": []}})
        ),
        ""
    );
    assert_eq!(
        line_tools(
            &format,
            &json!({"message": {"role": "assistant", "content": [{"other": 1}]}})
        ),
        ""
    );
    assert_eq!(line_tools(&format, &json!({"type": "assistant"})), "");
}

#[test]
fn line_tools_passes_the_message_role_to_part_tool() {
    let format = probe_format();
    let results = json!({"message": {"role": "toolResult", "content": [
        {"tool": "grep"},
        {"result": true}
    ]}});
    assert_eq!(line_tools(&format, &results), "[tool grep]\n[result]");
    let plain = json!({"message": {"role": "user", "content": [{"result": true}]}});
    assert_eq!(line_tools(&format, &plain), "");
}

#[test]
fn spans_empty_input_yields_no_spans() {
    let lines: Vec<Value> = Vec::new();
    let (found, orphans) = spans(&lines, tag_opener, tag_answer);
    assert!(found.is_empty());
    assert_eq!(orphans, 0);
}

#[test]
fn spans_counts_leading_answers_as_orphans() {
    let lines = vec![json!({"kind": "answer"}), json!({"kind": "answer"})];
    let (found, orphans) = spans(&lines, tag_opener, tag_answer);
    assert!(found.is_empty());
    assert_eq!(orphans, 2);
}

#[test]
fn spans_drops_leading_others() {
    let lines = vec![json!({"kind": "other"}), json!({"kind": "answer"})];
    let (found, orphans) = spans(&lines, tag_opener, tag_answer);
    assert!(found.is_empty());
    assert_eq!(orphans, 1);
}

#[test]
fn spans_opener_collects_answers_and_others_in_its_body() {
    let lines = vec![
        json!({"kind": "opener", "n": 1}),
        json!({"kind": "answer", "n": 2}),
        json!({"kind": "other", "n": 3}),
    ];
    let (found, orphans) = spans(&lines, tag_opener, tag_answer);
    assert_eq!(orphans, 0);
    assert_eq!(found.len(), 1);
    assert_eq!(found[0].opener, &lines[0]);
    assert_eq!(found[0].body, vec![&lines[1], &lines[2]]);
}

#[test]
fn spans_a_new_opener_closes_the_open_span() {
    let lines = vec![
        json!({"kind": "opener", "n": 1}),
        json!({"kind": "answer", "n": 2}),
        json!({"kind": "opener", "n": 3}),
        json!({"kind": "other", "n": 4}),
    ];
    let (found, orphans) = spans(&lines, tag_opener, tag_answer);
    assert_eq!(orphans, 0);
    assert_eq!(found.len(), 2);
    assert_eq!(found[0].opener, &lines[0]);
    assert_eq!(found[0].body, vec![&lines[1]]);
    assert_eq!(found[1].opener, &lines[2]);
    assert_eq!(found[1].body, vec![&lines[3]]);
}

#[test]
fn spans_only_answers_before_the_first_opener_are_orphans() {
    let lines = vec![
        json!({"kind": "answer", "n": 0}),
        json!({"kind": "opener", "n": 1}),
        json!({"kind": "answer", "n": 2}),
    ];
    let (found, orphans) = spans(&lines, tag_opener, tag_answer);
    assert_eq!(orphans, 1);
    assert_eq!(found.len(), 1);
    assert_eq!(found[0].opener, &lines[1]);
    assert_eq!(found[0].body, vec![&lines[2]]);
}
