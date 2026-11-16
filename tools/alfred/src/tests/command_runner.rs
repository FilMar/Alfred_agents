use std::num::NonZeroU32;

use crate::command::job::{JobPaths, Status};
use crate::command::runner::{LOG_RESULT_MAX, Route, execute, route, sanitize, stream, truncate};
use crate::command::sandbox::Launch;
use crate::command::spec::{Label, RunParts, RunSpec};

#[test]
fn route_sends_text_delta_to_out() {
    let line = r#"{"type":"message_update","assistantMessageEvent":{"type":"text_delta","delta":"hello world"}}"#;
    assert_eq!(route(line), Route::Out("hello world".to_string()));
}

#[test]
fn route_sends_thinking_delta_to_log() {
    let line = r#"{"type":"message_update","assistantMessageEvent":{"type":"thinking_delta","delta":"hmm"}}"#;
    assert_eq!(route(line), Route::Log("hmm".to_string()));
}

#[test]
fn route_formats_tool_execution_start() {
    let line = r#"{"type":"tool_execution_start","toolName":"bash","args":{"command":"ls"}}"#;
    assert_eq!(
        route(line),
        Route::Log("\n[tool:bash] {\"command\":\"ls\"}\n".to_string())
    );
}

#[test]
fn route_formats_tool_execution_end() {
    let line =
        r#"{"type":"tool_execution_end","toolName":"bash","result":{"ok":true},"isError":false}"#;
    assert_eq!(
        route(line),
        Route::Log("[tool:bash] → {\"ok\":true}\n".to_string())
    );
}

#[test]
fn route_marks_tool_execution_end_errors() {
    let line = r#"{"type":"tool_execution_end","toolName":"read","result":{"error":"bad"},"isError":true}"#;
    assert_eq!(
        route(line),
        Route::Log("[tool:read] → ERROR: {\"error\":\"bad\"}\n".to_string())
    );
}

#[test]
fn route_keeps_a_result_at_the_limit() {
    let json = format!("{{\"data\":\"{}\"}}", "a".repeat(LOG_RESULT_MAX - 11));
    let line = format!(
        "{{\"type\":\"tool_execution_end\",\"toolName\":\"bash\",\"result\":{json},\"isError\":false}}"
    );
    assert_eq!(route(&line), Route::Log(format!("[tool:bash] → {json}\n")));
}

#[test]
fn route_truncates_a_result_just_over_the_limit() {
    let json = format!("{{\"data\":\"{}\"}}", "a".repeat(LOG_RESULT_MAX - 10));
    let line = format!(
        "{{\"type\":\"tool_execution_end\",\"toolName\":\"bash\",\"result\":{json},\"isError\":false}}"
    );
    let expected = format!("[tool:bash] → {}… [+1 chars]\n", &json[..LOG_RESULT_MAX]);
    assert_eq!(route(&line), Route::Log(expected));
}

#[test]
fn route_carries_agent_end_messages() {
    let line = r#"{"type":"agent_end","messages":[{"role":"assistant","content":"a"},{"role":"user","content":"b"}]}"#;
    match route(line) {
        Route::End(messages) => {
            assert_eq!(messages.len(), 2);
            assert_eq!(messages[0]["role"].as_str(), Some("assistant"));
            assert_eq!(messages[0]["content"].as_str(), Some("a"));
            assert_eq!(messages[1]["role"].as_str(), Some("user"));
            assert_eq!(messages[1]["content"].as_str(), Some("b"));
        }
        other => panic!("route: agent_end carries messages, got {other:?}"),
    }
}

#[test]
fn route_skips_unknown_events() {
    assert_eq!(route(r#"{"type":"turn_start"}"#), Route::Skip);
}

#[test]
fn route_skips_other_assistant_events() {
    let line =
        r#"{"type":"message_update","assistantMessageEvent":{"type":"message_end","delta":"x"}}"#;
    assert_eq!(route(line), Route::Skip);
}

#[test]
fn sanitize_keeps_printable_ascii_tabs_and_newlines() {
    assert_eq!(sanitize(""), "");
    assert_eq!(sanitize("a b~c"), "a b~c");
    assert_eq!(sanitize("a\tb\nc\rd"), "a\tb\nc\rd");
}

#[test]
fn sanitize_drops_chars_outside_the_allowed_set() {
    assert_eq!(sanitize("\u{0}\u{1}\u{b}\u{c}\u{7f}"), "");
    assert_eq!(sanitize("a\u{1f}b"), "ab");
}

#[test]
fn sanitize_strips_ansi_codes_with_params() {
    assert_eq!(sanitize("\u{1b}[1;32mgreen\u{1b}[0mplain"), "greenplain");
}

#[test]
fn sanitize_strips_ansi_codes_ending_in_any_letter() {
    assert_eq!(sanitize("a\u{1b}[2Kb"), "ab");
}

#[test]
fn sanitize_keeps_multibyte_text() {
    assert_eq!(sanitize("café → \u{80}"), "café → \u{80}");
}

#[test]
fn sanitize_strips_codes_and_drops_controls_together() {
    assert_eq!(sanitize("\u{1b}[31mcafé\u{1b}[0m\tok\u{7}"), "café\tok");
}

#[test]
fn truncate_keeps_text_under_the_limit() {
    assert_eq!(truncate("", LOG_RESULT_MAX), "");
    assert_eq!(truncate("short", LOG_RESULT_MAX), "short");
}

#[test]
fn truncate_keeps_text_at_the_limit() {
    let text = "a".repeat(LOG_RESULT_MAX);
    assert_eq!(truncate(&text, LOG_RESULT_MAX), text);
}

#[test]
fn truncate_cuts_text_just_over_the_limit() {
    let text = "a".repeat(LOG_RESULT_MAX + 1);
    let expected = format!("{}… [+1 chars]", "a".repeat(LOG_RESULT_MAX));
    assert_eq!(truncate(&text, LOG_RESULT_MAX), expected);
}

#[test]
fn truncate_counts_chars_not_bytes() {
    let text = format!("{}é", "a".repeat(LOG_RESULT_MAX - 1));
    assert_eq!(truncate(&text, LOG_RESULT_MAX), text);
}

fn fixture(name: &str, script: &str, timeout: Option<u32>) -> (Launch, JobPaths, RunSpec) {
    let dir = std::env::temp_dir().join(format!("alfred-test-{name}-{}", std::process::id()));
    std::fs::create_dir_all(&dir).unwrap();
    let label = Label::of(Some("white-core"), None).unwrap();
    let paths = JobPaths::new(&dir, &label, 1, "abcd");
    let spec = RunSpec::of(RunParts {
        task: "task".to_string(),
        hat: Some("white-core".to_string()),
        hat_text: Some("hat".to_string()),
        timeout: timeout.and_then(NonZeroU32::new),
        ..RunParts::default()
    })
    .unwrap();
    let launch = Launch {
        program: "/bin/sh".into(),
        args: vec!["-c".into(), script.into()],
    };
    (launch, paths, spec)
}

const TEXT: &str = r#"printf '%s\n' '{"type":"message_update","assistantMessageEvent":{"type":"text_delta","delta":"hi"}}'"#;
const END: &str = r#"printf '%s\n' '{"type":"agent_end","messages":[{"role":"assistant","content":"a"},{"role":"user","content":"b"}]}'"#;
const LOG: &str = r#"printf '%s\n' '{"type":"message_update","assistantMessageEvent":{"type":"thinking_delta","delta":"hmm"}}'
printf '%s\n' '{"type":"tool_execution_start","toolName":"bash","args":{"command":"ls"}}'
printf '%s\n' '{"type":"tool_execution_end","toolName":"bash","result":{"ok":true},"isError":false}'"#;
const ANSI: &str = r#"printf '%s\n' '{"type":"message_update","assistantMessageEvent":{"type":"thinking_delta","delta":"\u001b[31mred\u001b[0mx\u0007"}}'"#;

type Case = (
    &'static str,
    &'static str,
    Option<u32>,
    &'static str,
    Option<&'static str>,
    Option<&'static str>,
    usize,
);

#[tokio::test]
async fn stream_outcome_table() {
    let cases: [Case; 6] = [
        ("done", TEXT, None, "Done", Some("hi\n"), None, 0),
        ("end", END, None, "Done", Some("\n"), None, 2),
        (
            "log",
            LOG,
            None,
            "Done",
            None,
            Some("hmm\n[tool:bash] {\"command\":\"ls\"}\n[tool:bash] → {\"ok\":true}\n"),
            0,
        ),
        ("ansi", ANSI, None, "Done", None, Some("redx"), 0),
        ("exit", "exit 3", None, "Error", None, None, 0),
        ("slow", "sleep 5", Some(1), "Timeout", None, None, 0),
    ];
    for (name, script, timeout, status, out, log, messages) in cases {
        let (launch, paths, spec) = fixture(name, script, timeout);
        let ended = stream(&launch, &paths, &spec).await;
        assert!(
            format!("{:?}", ended.status).starts_with(status),
            "{name}: {:?}",
            ended.status
        );
        assert_eq!(ended.messages.len(), messages, "{name}");
        if let Some(o) = out {
            assert_eq!(std::fs::read_to_string(paths.out()).unwrap(), o, "{name}");
        }
        if let Some(l) = log {
            assert_eq!(std::fs::read_to_string(paths.log()).unwrap(), l, "{name}");
        }
    }
}

#[tokio::test]
async fn stream_ends_error_when_the_launch_fails() {
    let (_, paths, spec) = fixture("nolaunch", "", None);
    let launch = Launch {
        program: "/nonexistent/alfred-no-such-program".into(),
        args: Vec::new(),
    };
    let ended = stream(&launch, &paths, &spec).await;
    assert!(matches!(ended.status, Status::Error(_)));
}

#[tokio::test]
async fn execute_writes_a_terminal_status_when_pi_cannot_start() {
    let (_, paths, spec) = fixture("execfail", "", None);
    let cwd = std::env::temp_dir().join("alfred/definitely/not/here");
    execute(&spec, &paths, &cwd, &std::env::temp_dir()).await;
}
