use serde_json::json;

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
    let _ = parse(Harness::Pi, &ls(&lines), Some("box"));
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
    let _ = parse(Harness::Claude, &ls(&lines), Some("box"));
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
    let _ = parse(Harness::Claude, &ls(&lines), None);
}

#[test]
fn text_and_tools_of_a_line_per_harness() {
    let claude = l(json!({"message": {"role": "user", "content": [
        {"type": "text", "text": "a"}, {"type": "text", "text": ""}, {"type": "text", "text": "b"},
        {"type": "tool_use", "name": "grep", "input": {"q": "x", "a": 1}}, {"type": "tool_result", "content": "out"}
    ]}}));
    assert_eq!(Harness::Claude.text_of(&claude), "a\nb");
    assert_eq!(
        Harness::Claude.tools_of(&claude),
        "[tool grep] {\"q\":\"x\",\"a\":1}\n[result] out"
    );
    let pi_result =
        l(json!({"message": {"role": "toolResult", "content": [{"type": "text", "text": "r"}]}}));
    assert_eq!(Harness::Pi.text_of(&pi_result), "");
    assert_eq!(Harness::Pi.tools_of(&pi_result), "[result] r");
    let pi_call = l(
        json!({"message": {"role": "assistant", "content": [{"type": "toolCall", "name": "ls", "arguments": null, "input": {"p": "."}}]}}),
    );
    assert_eq!(Harness::Pi.tools_of(&pi_call), "[tool ls] {\"p\":\".\"}");
    let plain = l(json!({"message": {"role": "user", "content": "as is"}}));
    assert_eq!(Harness::Claude.text_of(&plain), "as is");
    assert_eq!(Harness::Claude.tools_of(&plain), "");
}

#[test]
fn spans_split_on_openers_and_count_leading_answers() {
    let kind = |k: &str| match k {
        "o" => json!({"type": "user", "origin": {"kind": "human"}}),
        "a" => json!({"type": "assistant"}),
        _ => json!({"type": "system"}),
    };
    let cases: &[(&str, &[usize], u32)] = &[
        ("", &[], 0),
        ("aa", &[], 2),
        ("xa", &[], 1),
        ("oax", &[2], 0),
        ("oaox", &[1, 1], 0),
        ("aoa", &[1], 1),
    ];
    for &(seq, bodies, orphans) in cases {
        let lines = ls(&seq
            .chars()
            .map(|c| kind(&c.to_string()))
            .collect::<Vec<_>>());
        let (found, counted) = spans(&lines, Harness::Claude);
        assert_eq!(
            found.iter().map(|s| s.body.len()).collect::<Vec<_>>(),
            bodies,
            "spans of {seq:?}"
        );
        assert_eq!(counted, orphans, "orphans of {seq:?}");
    }
}

#[test]
fn parse_lines_reads_one_object_per_line_and_skips_the_rest() {
    let cases: &[(&str, usize)] = &[
        ("", 0),
        ("\n\n", 0),
        ("not json", 0),
        ("{\"a\":1}", 1),
        ("{\"a\":1}\n", 1),
        ("{\"a\":1}\n\nbad\n  \n{\"b\":2}", 2),
        ("5", 0),
    ];
    for &(text, count) in cases {
        assert_eq!(parse_lines(text).len(), count, "parse_lines({text:?})");
    }
}
