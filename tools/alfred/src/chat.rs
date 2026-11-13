use std::time::Duration;

use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::upstream::Upstream;

pub const CALL_TIMEOUT: Duration = Duration::from_mins(5);
pub const RETRIES: u8 = 3;
pub const RETRY_WAIT: Duration = Duration::from_secs(5);

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Think {
    Off,
    Low,
    Medium,
    High,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Speaker {
    User,
    Assistant,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Message {
    pub speaker: Speaker,
    pub content: String,
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize)]
pub struct Tokens {
    pub input: u64,
    pub output: u64,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Reply {
    pub text: String,
    pub tokens: Tokens,
}

#[derive(Debug, Clone, Copy)]
pub struct Call<'a> {
    pub model: &'a str,
    pub think: Think,
    pub temperature: f32,
    pub system: &'a str,
    pub messages: &'a [Message],
}

#[derive(Debug, Clone)]
pub struct Chat {
    base: String,
    http: reqwest::Client,
}

impl Tokens {
    pub fn plus(self, other: Tokens) -> Tokens {
        Tokens {
            input: self.input + other.input,
            output: self.output + other.output,
        }
    }
}

impl Chat {
    pub fn new(base: String, http: reqwest::Client) -> Chat {
        debug_assert!(!base.ends_with('/'), "Chat.new: base has no trailing slash");
        Chat { base, http }
    }

    pub fn from_env() -> Chat {
        Chat::new(
            crate::qdrant::env_base("OLLAMA_URL", "http://localhost:11434"),
            reqwest::Client::new(),
        )
    }

    pub async fn send(&self, call: &Call<'_>) -> Result<Reply, Upstream> {
        debug_assert!(
            call.messages
                .last()
                .is_some_and(|m| m.speaker == Speaker::User),
            "Chat.send: the last message is the user's"
        );
        let result: Result<Reply, Upstream> = async {
            let upstream = |message: String| Upstream {
                service: "Ollama",
                message,
            };
            let mut retries = 0;
            loop {
                let sent = self
                    .http
                    .post(format!("{}/api/chat", self.base))
                    .timeout(CALL_TIMEOUT)
                    .json(&body(call))
                    .send()
                    .await;
                let response = match sent {
                    Ok(response) => response,
                    Err(error) => return Err(upstream(error.to_string())),
                };
                let status = response.status();
                if is_retried(status.as_u16()) && retries < RETRIES {
                    retries += 1;
                    tokio::time::sleep(RETRY_WAIT).await;
                    continue;
                }
                if !status.is_success() {
                    return Err(upstream(format!("HTTP {status}")));
                }
                let value = match response.json::<Value>().await {
                    Ok(value) => value,
                    Err(error) => return Err(upstream(error.to_string())),
                };
                let text = value["message"]["content"]
                    .as_str()
                    .unwrap_or_default()
                    .to_string();
                let input = value["prompt_eval_count"].as_u64().unwrap_or(0);
                let output = value["eval_count"].as_u64().unwrap_or(0);
                return Ok(Reply {
                    text,
                    tokens: Tokens { input, output },
                });
            }
        }
        .await;
        result
    }
}

pub fn body(call: &Call<'_>) -> Value {
    let mut messages = vec![serde_json::json!({"role": "system", "content": call.system})];
    for message in call.messages {
        let role = match message.speaker {
            Speaker::User => "user",
            Speaker::Assistant => "assistant",
        };
        messages.push(serde_json::json!({"role": role, "content": message.content}));
    }
    let think = match call.think {
        Think::Off => Value::Bool(false),
        Think::Low => Value::String("low".into()),
        Think::Medium => Value::String("medium".into()),
        Think::High => Value::String("high".into()),
    };
    let result: Value = serde_json::json!({
        "model": call.model,
        "messages": messages,
        "think": think,
        "options": {"temperature": call.temperature},
        "stream": false
    });
    debug_assert!(
        result["messages"][0]["role"] == "system",
        "body: the system prompt goes first, with the role system"
    );
    debug_assert!(
        result.get("think").is_some(),
        "body: the thinking level is always sent"
    );
    debug_assert!(result["stream"] == false, "body: one reply, no stream");
    result
}

pub fn is_retried(status: u16) -> bool {
    status == 429 || (500..600).contains(&status)
}
