use std::collections::VecDeque;
use std::sync::{Arc, Mutex};

use axum::Json;
use axum::extract::State;
use axum::http::StatusCode;
use serde_json::{Value, json};

use crate::chat::{Chat, Think};
use crate::distill::ask::ask;
use crate::distill::config::Role;

type Script = Arc<Mutex<(VecDeque<(u16, Value)>, Vec<Value>)>>;

async fn reply(
    State(script): State<Script>,
    Json(request): Json<Value>,
) -> (StatusCode, Json<Value>) {
    let mut script = script.lock().unwrap();
    script.1.push(request);
    let (status, body) = script.0.pop_front().expect("fake: a reply is scripted");
    (StatusCode::from_u16(status).unwrap(), Json(body))
}

async fn fake(replies: Vec<(u16, Value)>) -> (Chat, Script) {
    let script: Script = Arc::new(Mutex::new((replies.into(), Vec::new())));
    let router = axum::Router::new()
        .route("/api/chat", axum::routing::post(reply))
        .with_state(script.clone());
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let base = format!("http://{}", listener.local_addr().unwrap());
    tokio::spawn(async move { axum::serve(listener, router).await });
    (Chat::new(base, reqwest::Client::new()), script)
}

fn said(text: &str, input: u64, output: u64) -> (u16, Value) {
    (
        200,
        json!({"message": {"role": "assistant", "content": text}, "prompt_eval_count": input, "eval_count": output}),
    )
}

fn role() -> Role {
    Role {
        model: "glm".to_string(),
        think: Think::Low,
        temperature: 0.1,
        system: "answer in JSON".to_string(),
    }
}

fn needs_a(json: &Value) -> Option<String> {
    (json.get("a").is_none()).then(|| "need key `a`".to_string())
}

#[tokio::test]
async fn ask_takes_a_good_first_answer() {
    let (chat, script) = fake(vec![said("sure: {\"a\": 1}", 10, 3)]).await;
    let answer = ask(&chat, &role(), "go", &needs_a).await;
    assert_eq!(
        (answer.json().clone(), answer.tries()),
        (json!({"a": 1}), 1)
    );
    assert_eq!((answer.tokens().input, answer.tokens().output), (10, 3));
    assert_eq!(script.lock().unwrap().1.len(), 1);
}

#[tokio::test]
async fn ask_sends_back_the_error_once_and_sums_the_tokens() {
    let (chat, script) = fake(vec![said("{\"b\": 1}", 10, 3), said("{\"a\": 2}", 20, 4)]).await;
    let answer = ask(&chat, &role(), "go", &needs_a).await;
    assert_eq!(
        (answer.json().clone(), answer.tries()),
        (json!({"a": 2}), 2)
    );
    assert_eq!((answer.tokens().input, answer.tokens().output), (30, 7));
    let second = &script.lock().unwrap().1[1];
    assert_eq!(
        second["messages"],
        json!([
            {"role": "system", "content": "answer in JSON"},
            {"role": "user", "content": "go"},
            {"role": "assistant", "content": "{\"b\": 1}"},
            {"role": "user", "content": "Your JSON is wrong: need key `a`. Answer again with only the corrected JSON."}
        ])
    );
}

#[tokio::test]
async fn ask_gives_up_after_two_tries() {
    let (chat, _) = fake(vec![said("no json", 1, 1), said("still none", 1, 1)]).await;
    let answer = ask(&chat, &role(), "go", &needs_a).await;
    assert_eq!(
        (answer.failure(), answer.tries()),
        (
            Some("the JSON is still wrong after 2 tries: no JSON object or array in the answer"),
            2
        )
    );
}

#[tokio::test]
async fn ask_turns_an_ollama_error_into_a_failure() {
    let (chat, script) = fake(vec![(400, json!({"error": "model not found"}))]).await;
    let answer = ask(&chat, &role(), "go", &needs_a).await;
    assert!(
        answer.failure().is_some_and(|f| f.contains("400")),
        "{answer:?}"
    );
    assert_eq!((answer.tries(), script.lock().unwrap().1.len()), (1, 1));
}
