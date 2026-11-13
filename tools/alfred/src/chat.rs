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
        let result: Result<Reply, Upstream> = 'send: {
            for _ in 0..RETRIES {
                let sent = self.post(call).await;
                if !sent.as_ref().is_ok_and(|r| is_retried(r.status().as_u16())) {
                    break 'send reply_of(sent).await;
                }
                tokio::time::sleep(RETRY_WAIT).await;
            }
            reply_of(self.post(call).await).await
        };
        result
    }

    async fn post(&self, call: &Call<'_>) -> reqwest::Result<reqwest::Response> {
        self.http
            .post(format!("{}/api/chat", self.base))
            .timeout(CALL_TIMEOUT)
            .json(&body(call))
            .send()
            .await
    }
}

impl Speaker {
    pub fn role(self) -> &'static str {
        match self {
            Speaker::User => "user",
            Speaker::Assistant => "assistant",
        }
    }
}

async fn reply_of(sent: reqwest::Result<reqwest::Response>) -> Result<Reply, Upstream> {
    let upstream = |message: String| Upstream {
        service: "Ollama",
        message,
    };
    let response = sent.map_err(|e| upstream(e.to_string()))?;
    let status = response.status();
    if !status.is_success() {
        return Err(upstream(format!("HTTP {status}")));
    }
    let value: Value = response.json().await.map_err(|e| upstream(e.to_string()))?;
    Ok(Reply {
        text: value["message"]["content"]
            .as_str()
            .unwrap_or_default()
            .to_string(),
        tokens: Tokens {
            input: value["prompt_eval_count"].as_u64().unwrap_or(0),
            output: value["eval_count"].as_u64().unwrap_or(0),
        },
    })
}

pub fn body(call: &Call<'_>) -> Value {
    let said = |role: &str, content: &str| serde_json::json!({"role": role, "content": content});
    let messages: Vec<Value> = std::iter::once(said("system", call.system))
        .chain(
            call.messages
                .iter()
                .map(|m| said(m.speaker.role(), &m.content)),
        )
        .collect();
    let think = match call.think {
        Think::Off => Value::Bool(false),
        level => serde_json::json!(level),
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
