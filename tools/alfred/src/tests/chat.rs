use serde_json::json;

use crate::chat::{Call, Chat, Message, Speaker, Think, body, is_retried};

fn said(speaker: Speaker, content: &str) -> Message {
    Message {
        speaker,
        content: content.to_string(),
    }
}

fn call(think: Think, messages: &[Message]) -> Call<'_> {
    Call {
        model: "glm-5.3-flash:cloud",
        think,
        temperature: 0.1,
        system: "split the session",
        messages,
    }
}

#[test]
#[should_panic(expected = "Chat.new: base has no trailing slash")]
fn new_refuses_a_trailing_slash() {
    Chat::new(
        "http://localhost:11434/".to_string(),
        reqwest::Client::new(),
    );
}

#[tokio::test]
#[should_panic(expected = "Chat.send: the last message is the user's")]
async fn send_refuses_a_call_that_ends_with_the_assistant() {
    let messages = [said(Speaker::User, "a"), said(Speaker::Assistant, "b")];
    let chat = Chat::new("http://localhost:1".to_string(), reqwest::Client::new());
    let _ = chat.send(&call(Think::Low, &messages)).await;
}

#[test]
fn body_is_the_ollama_chat_request() {
    let messages = [
        said(Speaker::User, "the session"),
        said(Speaker::Assistant, "{bad"),
        said(Speaker::User, "fix it"),
    ];
    let expected = |think: serde_json::Value| {
        json!({
            "model": "glm-5.3-flash:cloud",
            "messages": [
                {"role": "system", "content": "split the session"},
                {"role": "user", "content": "the session"},
                {"role": "assistant", "content": "{bad"},
                {"role": "user", "content": "fix it"}
            ],
            "think": think,
            "options": {"temperature": 0.1_f32},
            "stream": false
        })
    };
    let cases = [
        (Think::Off, json!(false)),
        (Think::Low, json!("low")),
        (Think::Medium, json!("medium")),
        (Think::High, json!("high")),
    ];
    for (think, sent) in cases {
        assert_eq!(body(&call(think, &messages)), expected(sent), "{think:?}");
    }
}

#[test]
fn is_retried_is_429_and_5xx() {
    let cases = [
        (200, false),
        (404, false),
        (428, false),
        (429, true),
        (430, false),
        (499, false),
        (500, true),
        (599, true),
        (600, false),
    ];
    for (status, expected) in cases {
        assert_eq!(is_retried(status), expected, "status {status}");
    }
}
