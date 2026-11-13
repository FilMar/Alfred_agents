#[allow(unused_imports)]
use super::*;

#[test]
fn claude_opener_is_user_line_with_string_origin_kind() {
    let cases = [
        (json!({"type": "user", "origin": {"kind": "slash"}}), true),
        (json!({"type": "user", "origin": {"kind": ""}}), true),
        (json!({"type": "user", "origin": {}}), false),
        (json!({"type": "user"}), false),
        (json!({"type": "user", "origin": {"kind": 3}}), false),
        (json!({"type": "user", "origin": "slash"}), false),
        (
            json!({"type": "assistant", "origin": {"kind": "slash"}}),
            false,
        ),
        (json!({"type": "system"}), false),
        (json!({"origin": {"kind": "slash"}}), false),
        (json!({}), false),
    ];
    for (line, expected) in cases {
        assert_eq!((CLAUDE.is_opener)(&line), expected, "line: {line}");
    }
}

#[test]
fn claude_answer_is_assistant_line() {
    let cases = [
        (json!({"type": "assistant"}), true),
        (
            json!({"type": "assistant", "message": {"role": "assistant"}}),
            true,
        ),
        (json!({"type": "user", "origin": {"kind": "slash"}}), false),
        (json!({"type": "result"}), false),
        (json!({}), false),
    ];
    for (line, expected) in cases {
        assert_eq!((CLAUDE.is_answer)(&line), expected, "line: {line}");
    }
}

#[test]
fn claude_spends_only_on_answers() {
    let cases = [
        (json!({"type": "assistant"}), true),
        (json!({"type": "user", "origin": {"kind": "slash"}}), false),
        (json!({"type": "compaction"}), false),
    ];
    for (line, expected) in cases {
        assert_eq!((CLAUDE.spends)(&line), expected, "line: {line}");
    }
}

#[test]
fn claude_usage_reads_usage_inside_message() {
    let answer = json!({
        "type": "assistant",
        "message": {"model": "m", "usage": {"input_tokens": 3, "output_tokens": 7}}
    });
    assert_eq!((CLAUDE.usage)(&answer), Some([3, 7, 0, 0]));
    let empty_usage = json!({"type": "assistant", "message": {"usage": {}}});
    assert_eq!((CLAUDE.usage)(&empty_usage), Some([0, 0, 0, 0]));
    let no_usage = json!({"type": "assistant", "message": {"model": "m"}});
    assert_eq!((CLAUDE.usage)(&no_usage), None);
    let no_message = json!({"type": "assistant"});
    assert_eq!((CLAUDE.usage)(&no_message), None);
    let top_level = json!({"type": "assistant", "usage": {"input_tokens": 3}});
    assert_eq!((CLAUDE.usage)(&top_level), None);
}

#[test]
fn claude_part_text_maps_text_parts_to_their_text() {
    assert_eq!(
        (CLAUDE.part_text)(&json!({"type": "text", "text": "hello"}), None).as_deref(),
        Some("hello")
    );
    assert_eq!(
        (CLAUDE.part_text)(&json!({"type": "text", "text": ""}), None).as_deref(),
        Some("")
    );
    assert_eq!(
        (CLAUDE.part_text)(&json!({"type": "text"}), None).as_deref(),
        Some("")
    );
    assert_eq!(
        (CLAUDE.part_text)(
            &json!({"type": "tool_use", "name": "Bash", "input": {}}),
            None
        ),
        None
    );
    assert_eq!(
        (CLAUDE.part_text)(&json!({"type": "tool_result", "content": "x"}), None),
        None
    );
    assert_eq!(
        (CLAUDE.part_text)(&json!({"type": "thinking", "thinking": "h"}), None),
        None
    );
}

#[test]
fn claude_part_tool_formats_tool_use() {
    assert_eq!(
        (CLAUDE.part_tool)(
            &json!({"type": "tool_use", "name": "Bash", "input": {"command": "ls"}}),
            None
        )
        .as_deref(),
        Some(r#"[tool Bash] {"command":"ls"}"#)
    );
    assert_eq!(
        (CLAUDE.part_tool)(
            &json!({"type": "tool_use", "name": "X", "input": {"b": 1, "a": 2}}),
            None
        )
        .as_deref(),
        Some(r#"[tool X] {"b":1,"a":2}"#)
    );
    assert_eq!(
        (CLAUDE.part_tool)(
            &json!({"type": "tool_use", "name": "X", "input": {"nested": {"a": [1, 2]}}}),
            None
        )
        .as_deref(),
        Some(r#"[tool X] {"nested":{"a":[1,2]}}"#)
    );
    assert_eq!(
        (CLAUDE.part_tool)(&json!({"type": "tool_use", "input": {}}), None).as_deref(),
        Some(r"[tool ?] {}")
    );
    assert_eq!(
        (CLAUDE.part_tool)(&json!({"type": "tool_use", "name": "X"}), None).as_deref(),
        Some("[tool X] ")
    );
    assert_eq!(
        (CLAUDE.part_tool)(
            &json!({"type": "tool_use", "name": "X", "input": null}),
            None
        )
        .as_deref(),
        Some("[tool X] ")
    );
    assert_eq!(
        (CLAUDE.part_tool)(
            &json!({"type": "tool_use", "name": "X", "input": "raw"}),
            None
        )
        .as_deref(),
        Some("[tool X] raw")
    );
    assert_eq!(
        (CLAUDE.part_tool)(&json!({"type": "tool_use", "name": "X", "input": 42}), None).as_deref(),
        Some("[tool X] 42")
    );
}

#[test]
fn claude_part_tool_formats_tool_result() {
    assert_eq!(
        (CLAUDE.part_tool)(&json!({"type": "tool_result", "content": "done"}), None).as_deref(),
        Some("[result] done")
    );
    assert_eq!(
        (CLAUDE.part_tool)(
            &json!({"type": "tool_result", "content": {"ok": true}}),
            None
        )
        .as_deref(),
        Some(r#"[result] {"ok":true}"#)
    );
    assert_eq!(
        (CLAUDE.part_tool)(
            &json!({"type": "tool_result", "content": [{"type": "text", "text": "done"}]}),
            None
        )
        .as_deref(),
        Some(r#"[result] [{"type":"text","text":"done"}]"#)
    );
    assert_eq!(
        (CLAUDE.part_tool)(&json!({"type": "tool_result"}), None).as_deref(),
        Some("[result] ")
    );
    assert_eq!(
        (CLAUDE.part_tool)(&json!({"type": "text", "text": "hi"}), None),
        None
    );
}

#[test]
fn claude_session_takes_first_line_with_string_session_id_and_timestamp() {
    let lines = vec![
        json!({"type": "user", "message": {"role": "user", "content": "hi"}}),
        json!({
            "type": "user",
            "sessionId": "s1",
            "timestamp": "2025-06-01T10:00:00.000Z",
            "cwd": "/work",
            "origin": {"kind": "slash"}
        }),
    ];
    let head = (CLAUDE.session)(&lines).unwrap();
    assert_eq!(head.id, "s1");
    assert_eq!(head.started, "2025-06-01T10:00:00.000Z");
    assert_eq!(head.cwd.as_deref(), Some("/work"));
}

#[test]
fn claude_session_skips_lines_missing_string_session_id_or_timestamp() {
    let lines = vec![
        json!({"sessionId": 5, "timestamp": "t1"}),
        json!({"sessionId": "s2"}),
        json!({"timestamp": "t3"}),
        json!({"sessionId": "s4", "timestamp": 9}),
        json!({"sessionId": "s5", "timestamp": "t5", "cwd": "/w"}),
    ];
    let head = (CLAUDE.session)(&lines).unwrap();
    assert_eq!(head.id, "s5");
    assert_eq!(head.started, "t5");
    assert_eq!(head.cwd.as_deref(), Some("/w"));
}

#[test]
fn claude_session_keeps_the_first_matching_line() {
    let lines = vec![
        json!({"sessionId": "first", "timestamp": "t1"}),
        json!({"sessionId": "second", "timestamp": "t2"}),
    ];
    let head = (CLAUDE.session)(&lines).unwrap();
    assert_eq!(head.id, "first");
    assert_eq!(head.started, "t1");
}

#[test]
fn claude_session_path_is_none_when_cwd_is_missing_or_empty() {
    let no_cwd = vec![json!({"sessionId": "s", "timestamp": "t"})];
    let head = (CLAUDE.session)(&no_cwd).unwrap();
    assert_eq!(head.cwd.as_deref(), None);
    let empty_cwd = vec![json!({"sessionId": "s", "timestamp": "t", "cwd": ""})];
    let head = (CLAUDE.session)(&empty_cwd).unwrap();
    assert_eq!(head.cwd.as_deref(), None);
    let not_string = vec![json!({"sessionId": "s", "timestamp": "t", "cwd": 7})];
    let head = (CLAUDE.session)(&not_string).unwrap();
    assert_eq!(head.cwd.as_deref(), None);
}

#[test]
fn claude_session_is_none_without_a_matching_line() {
    let lines = vec![
        json!({"type": "assistant"}),
        json!({"sessionId": "s"}),
        json!({"timestamp": "t"}),
    ];
    assert!((CLAUDE.session)(&lines).is_none());
    assert!((CLAUDE.session)(&[]).is_none());
}

#[test]
fn claude_exchange_id_is_the_opener_uuid() {
    let opener =
        json!({"type": "user", "uuid": "u-1", "sessionId": "s", "origin": {"kind": "slash"}});
    let no_session = json!({"type": "user", "uuid": "u-1", "origin": {"kind": "slash"}});
    assert_eq!((CLAUDE.exchange_id)("any-session", &no_session), None);
    assert_eq!(
        (CLAUDE.exchange_id)("any-session", &opener).as_deref(),
        Some("u-1")
    );
    assert_eq!(
        (CLAUDE.exchange_id)("any-session", &json!({"type": "user"})),
        None
    );
}

#[test]
fn claude_meta_is_trigger_when_origin_kind_is_not_empty() {
    let opener = json!({"type": "user", "origin": {"kind": "slash"}});
    assert_eq!(
        (CLAUDE.meta)(&opener, &[]),
        Some(json!({"trigger": "slash"}))
    );
    let empty_kind = json!({"type": "user", "origin": {"kind": ""}});
    assert_eq!((CLAUDE.meta)(&empty_kind, &[]), None);
    let no_origin = json!({"type": "user"});
    assert_eq!((CLAUDE.meta)(&no_origin, &[]), None);
    let no_kind = json!({"type": "user", "origin": {}});
    assert_eq!((CLAUDE.meta)(&no_kind, &[]), None);
}

#[test]
fn the_harnesses_name_themselves() {
    assert_eq!((CLAUDE.harness, PI.harness), ("claude", "pi"));
}
