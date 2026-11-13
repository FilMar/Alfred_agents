#[allow(unused_imports)]
use super::*;

#[test]
fn claude_model_is_the_last_answer_model() {
    let first = json!({"type": "assistant", "message": {"model": "m1"}});
    let second = json!({"type": "assistant", "message": {"model": "m2"}});
    assert_eq!((CLAUDE.model)(&[&first, &second]).as_deref(), Some("m2"));
}

#[test]
fn claude_model_skips_models_starting_with_angle() {
    let synthetic = json!({"type": "assistant", "message": {"model": "<synthetic>"}});
    assert_eq!((CLAUDE.model)(&[&synthetic]).as_deref(), None);
    let bare = json!({"type": "assistant", "message": {"model": "<"}});
    assert_eq!((CLAUDE.model)(&[&bare]).as_deref(), None);
    let real = json!({"type": "assistant", "message": {"model": "claude-4"}});
    assert_eq!(
        (CLAUDE.model)(&[&synthetic, &real]).as_deref(),
        Some("claude-4")
    );
}

#[test]
fn claude_model_reads_answers_only_and_none_without_models() {
    assert_eq!((CLAUDE.model)(&[]).as_deref(), None);
    let no_model = json!({"type": "assistant", "message": {"content": []}});
    assert_eq!((CLAUDE.model)(&[&no_model]).as_deref(), None);
    let answer = json!({"type": "assistant", "message": {"model": "a"}});
    let user = json!({"type": "user", "message": {"role": "user", "model": "u"}});
    assert_eq!((CLAUDE.model)(&[&answer, &user]).as_deref(), Some("a"));
}

#[test]
fn pi_opener_is_user_message_line() {
    let cases = [
        (
            json!({"type": "message", "message": {"role": "user"}}),
            true,
        ),
        (
            json!({"type": "message", "message": {"role": "user", "content": [{"type": "text", "text": "hi"}]}}),
            true,
        ),
        (
            json!({"type": "message", "message": {"role": "assistant"}}),
            false,
        ),
        (
            json!({"type": "message", "message": {"role": "toolResult"}}),
            false,
        ),
        (json!({"type": "message", "message": {}}), false),
        (json!({"type": "message"}), false),
        (json!({"type": "session"}), false),
        (json!({"message": {"role": "user"}}), false),
        (json!({}), false),
    ];
    for (line, expected) in cases {
        assert_eq!((PI.is_opener)(&line), expected, "line: {line}");
    }
}

#[test]
fn pi_answer_is_assistant_message_line() {
    let cases = [
        (
            json!({"type": "message", "message": {"role": "assistant"}}),
            true,
        ),
        (
            json!({"type": "message", "message": {"role": "user"}}),
            false,
        ),
        (json!({"type": "message", "message": {}}), false),
        (json!({"type": "compaction"}), false),
        (json!({}), false),
    ];
    for (line, expected) in cases {
        assert_eq!((PI.is_answer)(&line), expected, "line: {line}");
    }
}

#[test]
fn pi_spends_on_answers_and_compactions() {
    let cases = [
        (
            json!({"type": "message", "message": {"role": "assistant"}}),
            true,
        ),
        (json!({"type": "compaction", "usage": {"input": 1}}), true),
        (
            json!({"type": "message", "message": {"role": "user"}}),
            false,
        ),
        (json!({"type": "message", "message": {}}), false),
        (json!({"type": "session"}), false),
    ];
    for (line, expected) in cases {
        assert_eq!((PI.spends)(&line), expected, "line: {line}");
    }
}

#[test]
fn pi_usage_prefers_message_usage_and_falls_back_to_the_line_usage() {
    let answer = json!({
        "type": "message",
        "message": {"role": "assistant", "usage": {"input": 1}}
    });
    assert_eq!((PI.usage)(&answer), Some([1, 0, 0, 0]));
    let compaction = json!({"type": "compaction", "usage": {"output": 2}});
    assert_eq!((PI.usage)(&compaction), Some([0, 2, 0, 0]));
    let both = json!({
        "type": "message",
        "message": {"role": "assistant", "usage": {"input": 1}},
        "usage": {"input": 2}
    });
    assert_eq!((PI.usage)(&both), Some([1, 0, 0, 0]));
    let fallback = json!({
        "type": "message",
        "message": {"role": "assistant"},
        "usage": {"cacheRead": 4}
    });
    assert_eq!((PI.usage)(&fallback), Some([0, 0, 4, 0]));
    let no_usage = json!({"type": "message", "message": {"role": "assistant"}});
    assert_eq!((PI.usage)(&no_usage), None);
    let bare = json!({"type": "compaction"});
    assert_eq!((PI.usage)(&bare), None);
}

#[test]
fn pi_part_text_takes_text_parts_except_tool_result_role() {
    let part = json!({"type": "text", "text": "hello"});
    assert_eq!((PI.part_text)(&part, None).as_deref(), Some("hello"));
    assert_eq!(
        (PI.part_text)(&part, Some("assistant")).as_deref(),
        Some("hello")
    );
    assert_eq!(
        (PI.part_text)(&part, Some("user")).as_deref(),
        Some("hello")
    );
    assert_eq!((PI.part_text)(&part, Some("toolResult")), None);
    let call = json!({"type": "toolCall", "name": "Read", "arguments": {}});
    assert_eq!((PI.part_text)(&call, None), None);
}

#[test]
fn pi_part_tool_formats_tool_calls() {
    assert_eq!(
        (PI.part_tool)(
            &json!({"type": "toolCall", "name": "Read", "arguments": {"path": "/x"}}),
            None
        )
        .as_deref(),
        Some(r#"[tool Read] {"path":"/x"}"#)
    );
    assert_eq!(
        (PI.part_tool)(
            &json!({"type": "toolCall", "name": "Read", "input": {"path": "/x"}}),
            None
        )
        .as_deref(),
        Some(r#"[tool Read] {"path":"/x"}"#)
    );
    assert_eq!(
        (PI.part_tool)(
            &json!({"type": "toolCall", "name": "Read", "arguments": {"a": 1}, "input": {"b": 2}}),
            None
        )
        .as_deref(),
        Some(r#"[tool Read] {"a":1}"#)
    );
    assert_eq!(
        (PI.part_tool)(&json!({"type": "toolCall", "input": {"x": 1}}), None).as_deref(),
        Some(r#"[tool ?] {"x":1}"#)
    );
    assert_eq!(
        (PI.part_tool)(&json!({"type": "toolCall", "name": "X"}), None).as_deref(),
        Some("[tool X] ")
    );
    assert_eq!(
        (PI.part_tool)(
            &json!({"type": "toolCall", "name": "X", "arguments": "raw"}),
            None
        )
        .as_deref(),
        Some("[tool X] raw")
    );
}

#[test]
fn pi_part_tool_formats_tool_result_text_parts() {
    assert_eq!(
        (PI.part_tool)(
            &json!({"type": "text", "text": "tool output"}),
            Some("toolResult")
        )
        .as_deref(),
        Some("[result] tool output")
    );
    assert_eq!(
        (PI.part_tool)(&json!({"type": "text", "text": "x"}), None),
        None
    );
    assert_eq!(
        (PI.part_tool)(&json!({"type": "text", "text": "x"}), Some("assistant")),
        None
    );
}

#[test]
fn pi_session_takes_first_session_line_with_string_id_and_timestamp() {
    let lines = vec![
        json!({"type": "message", "id": "m1", "timestamp": "t1", "message": {"role": "user"}}),
        json!({
            "type": "session",
            "id": "ps1",
            "timestamp": "2025-06-01T10:00:00.000Z",
            "cwd": "/home/u/project"
        }),
    ];
    let head = (PI.session)(&lines).unwrap();
    assert_eq!(head.id, "ps1");
    assert_eq!(head.started, "2025-06-01T10:00:00.000Z");
    assert_eq!(head.cwd.as_deref(), Some("/home/u/project"));
}

#[test]
fn pi_session_skips_session_lines_missing_string_id_or_timestamp() {
    let lines = vec![
        json!({"type": "session"}),
        json!({"type": "session", "id": "bad"}),
        json!({"type": "session", "timestamp": "t"}),
        json!({"type": "session", "id": 5, "timestamp": "t"}),
        json!({"type": "session", "id": "ps2", "timestamp": "t2"}),
    ];
    let head = (PI.session)(&lines).unwrap();
    assert_eq!(head.id, "ps2");
    assert_eq!(head.started, "t2");
}

#[test]
fn pi_session_is_none_without_a_session_line() {
    let lines = vec![
        json!({"type": "message", "id": "x", "timestamp": "t", "message": {"role": "user"}}),
        json!({"type": "compaction"}),
    ];
    assert!((PI.session)(&lines).is_none());
    assert!((PI.session)(&[]).is_none());
}

#[test]
fn pi_exchange_id_depends_only_on_session_and_opener_id() {
    let opener = json!({"type": "message", "id": "opener-1", "message": {"role": "user"}});
    let same_id = json!({"id": "opener-1"});
    assert_eq!(
        (PI.exchange_id)("session-1", &opener),
        (PI.exchange_id)("session-1", &same_id)
    );
    let other_id = json!({"id": "opener-2"});
    assert_ne!(
        (PI.exchange_id)("session-1", &opener),
        (PI.exchange_id)("session-1", &other_id)
    );
    assert_ne!(
        (PI.exchange_id)("session-1", &opener),
        (PI.exchange_id)("session-2", &opener)
    );
}
