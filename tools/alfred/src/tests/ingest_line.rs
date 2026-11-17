use crate::hist::ingest::line::Line;

fn line(value: serde_json::Value) -> Line {
    serde_json::from_value(value).unwrap()
}

#[test]
fn hook_context_returns_the_hook_texts_of_the_event() {
    let l = line(serde_json::json!({
        "type": "attachment",
        "parentUuid": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "attachment": {
            "type": "hook_additional_context",
            "hookEvent": "UserPromptSubmit",
            "hookName": "UserPromptSubmit",
            "content": [
                "## Rule matches\n-- 9d3685f9\nprima azione\nseconda azione\n-- 58708950\naltra azione"
            ]
        }
    }));
    assert_eq!(
        l.hook_context("UserPromptSubmit"),
        &["## Rule matches\n-- 9d3685f9\nprima azione\nseconda azione\n-- 58708950\naltra azione"]
    );
}

#[test]
fn hook_context_returns_every_text_of_the_content() {
    let l = line(serde_json::json!({
        "attachment": {
            "type": "hook_additional_context",
            "hookEvent": "UserPromptSubmit",
            "content": ["primo testo", "secondo testo"]
        }
    }));
    assert_eq!(
        l.hook_context("UserPromptSubmit"),
        &["primo testo", "secondo testo"]
    );
}

#[test]
fn hook_context_matches_the_hook_event_not_the_hook_name() {
    let l = line(serde_json::json!({
        "attachment": {
            "type": "hook_additional_context",
            "hookEvent": "UserPromptSubmit",
            "hookName": "Stop",
            "content": ["-- 9d3685f9\nprima azione"]
        }
    }));
    assert_eq!(
        l.hook_context("UserPromptSubmit"),
        &["-- 9d3685f9\nprima azione"]
    );
}

#[test]
fn hook_context_is_empty_for_another_event() {
    let l = line(serde_json::json!({
        "attachment": {
            "type": "hook_additional_context",
            "hookEvent": "UserPromptSubmit",
            "content": ["-- 9d3685f9\nprima azione"]
        }
    }));
    assert!(l.hook_context("Stop").is_empty());
}

#[test]
fn hook_context_is_empty_when_the_event_differs_only_by_case() {
    let l = line(serde_json::json!({
        "attachment": {
            "type": "hook_additional_context",
            "hookEvent": "userpromptsubmit",
            "content": ["-- 9d3685f9\nprima azione"]
        }
    }));
    assert!(l.hook_context("UserPromptSubmit").is_empty());
}

#[test]
fn hook_context_is_empty_when_the_type_is_not_hook_additional_context() {
    let l = line(serde_json::json!({
        "attachment": {
            "type": "hook_progress",
            "hookEvent": "UserPromptSubmit",
            "content": ["-- 9d3685f9\nprima azione"]
        }
    }));
    assert!(l.hook_context("UserPromptSubmit").is_empty());
}

#[test]
fn hook_context_is_empty_when_the_type_differs_only_by_a_space() {
    let l = line(serde_json::json!({
        "attachment": {
            "type": "hook_additional_context ",
            "hookEvent": "UserPromptSubmit",
            "content": ["-- 9d3685f9\nprima azione"]
        }
    }));
    assert!(l.hook_context("UserPromptSubmit").is_empty());
}

#[test]
fn hook_context_is_empty_without_an_attachment_type() {
    let l = line(serde_json::json!({
        "attachment": {
            "hookEvent": "UserPromptSubmit",
            "content": ["-- 9d3685f9\nprima azione"]
        }
    }));
    assert!(l.hook_context("UserPromptSubmit").is_empty());
}

#[test]
fn hook_context_is_empty_without_a_hook_event() {
    let l = line(serde_json::json!({
        "attachment": {
            "type": "hook_additional_context",
            "content": ["-- 9d3685f9\nprima azione"]
        }
    }));
    assert!(l.hook_context("UserPromptSubmit").is_empty());
}

#[test]
fn hook_context_is_empty_without_type_and_hook_event() {
    let l = line(serde_json::json!({
        "attachment": {
            "content": ["-- 9d3685f9\nprima azione"]
        }
    }));
    assert!(l.hook_context("UserPromptSubmit").is_empty());
}

#[test]
fn hook_context_is_empty_without_an_attachment() {
    let l = line(serde_json::json!({
        "type": "user",
        "uuid": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "sessionId": "11111111-1111-1111-1111-111111111111",
        "timestamp": "2026-01-02T03:04:05.678Z",
        "origin": {"kind": "human"},
        "message": {"role": "user", "content": "ciao"}
    }));
    assert!(l.hook_context("UserPromptSubmit").is_empty());
}

#[test]
fn hook_context_is_empty_with_an_empty_content() {
    let l = line(serde_json::json!({
        "attachment": {
            "type": "hook_additional_context",
            "hookEvent": "UserPromptSubmit",
            "content": []
        }
    }));
    assert!(l.hook_context("UserPromptSubmit").is_empty());
}

#[test]
fn hook_context_is_empty_without_content() {
    let l = line(serde_json::json!({
        "attachment": {
            "type": "hook_additional_context",
            "hookEvent": "UserPromptSubmit"
        }
    }));
    assert!(l.hook_context("UserPromptSubmit").is_empty());
}
