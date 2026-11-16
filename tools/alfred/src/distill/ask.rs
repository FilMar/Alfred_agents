use serde_json::Value;

use super::config::Role;
use crate::chat::{Chat, Tokens};

// The answer, then one fix.
pub const MAX_TRIES: u8 = 2;

#[derive(Debug, Clone, PartialEq)]
pub struct Answer {
    json: Option<Value>,
    failure: Option<String>,
    tries: u8,
    tokens: Tokens,
}

impl Answer {
    pub fn accepted(json: Value, tries: u8, tokens: Tokens) -> Answer {
        debug_assert!(
            (1..=MAX_TRIES).contains(&tries),
            "Answer.accepted: tries is from 1 to MAX_TRIES"
        );
        Answer {
            json: Some(json),
            failure: None,
            tries,
            tokens,
        }
    }

    pub fn rejected(failure: String, tries: u8, tokens: Tokens) -> Answer {
        debug_assert!(
            (1..=MAX_TRIES).contains(&tries),
            "Answer.rejected: tries is from 1 to MAX_TRIES"
        );
        debug_assert!(
            !failure.trim().is_empty(),
            "Answer.rejected: the failure is not blank"
        );
        Answer {
            json: None,
            failure: Some(failure),
            tries,
            tokens,
        }
    }

    pub fn is_ok(&self) -> bool {
        self.failure.is_none()
    }

    pub fn json(&self) -> &Value {
        self.json
            .as_ref()
            .expect("Answer.json: only an ok answer has json")
    }

    pub fn failure(&self) -> Option<&str> {
        self.failure.as_deref()
    }

    pub fn tries(&self) -> u8 {
        self.tries
    }

    pub fn tokens(&self) -> Tokens {
        self.tokens
    }
}

pub async fn ask(
    chat: &Chat,
    role: &Role,
    prompt: &str,
    check: &(dyn Fn(&Value) -> Option<String> + Sync),
) -> Answer {
    debug_assert!(!prompt.trim().is_empty(), "ask: the prompt is not blank");
    let result: Answer = 'ask: {
        let said = |speaker, content: String| crate::chat::Message { speaker, content };
        let mut messages = vec![said(crate::chat::Speaker::User, String::from(prompt))];
        let mut tokens = Tokens::default();
        let mut failure = String::new();
        for tries in 1..=MAX_TRIES {
            let call = crate::chat::Call {
                model: &role.model,
                think: role.think,
                temperature: role.temperature,
                system: &role.system,
                messages: &messages,
            };
            match chat.send(&call).await {
                Err(error) => break 'ask Answer::rejected(error.to_string(), tries, tokens),
                Ok(crate::chat::Reply { text, tokens: add }) => {
                    tokens = tokens.plus(add);
                    failure = match extract_json(&text) {
                        None => String::from("no JSON object or array in the answer"),
                        Some(json) => match check(&json) {
                            None => break 'ask Answer::accepted(json, tries, tokens),
                            Some(error) => error,
                        },
                    };
                    messages.push(said(crate::chat::Speaker::Assistant, text));
                    messages.push(said(crate::chat::Speaker::User, correction(&failure)));
                }
            }
        }
        Answer::rejected(
            format!("the JSON is still wrong after {MAX_TRIES} tries: {failure}"),
            MAX_TRIES,
            tokens,
        )
    };
    debug_assert!(
        !result.is_ok() || check(result.json()).is_none(),
        "ask: an ok answer passes the check"
    );
    result
}

pub fn extract_json(text: &str) -> Option<Value> {
    let result: Option<Value> = {
        let body = {
            let open = match (text.find("```json\n"), text.find("```\n")) {
                (Some(a), Some(b)) => Some(a.min(b)),
                (Some(a), None) => Some(a),
                (None, Some(b)) => Some(b),
                (None, None) => None,
            };
            match open {
                Some(at) => {
                    let start = if text[at..].starts_with("```json\n") {
                        at + "```json\n".len()
                    } else {
                        at + "```\n".len()
                    };
                    match text[start..].find("```") {
                        Some(gap) => &text[start..start + gap],
                        None => text,
                    }
                }
                None => text,
            }
        };
        let bounds = match (body.find('{'), body.find('[')) {
            (Some(a), Some(b)) if a < b => Some((a, '}')),
            (Some(a), None) => Some((a, '}')),
            (_, Some(b)) => Some((b, ']')),
            (None, None) => None,
        };
        match bounds {
            Some((start, closer)) => match body.rfind(closer) {
                Some(end) if start <= end => serde_json::from_str(&body[start..=end]).ok(),
                _ => None,
            },
            None => None,
        }
    };
    debug_assert!(
        result
            .as_ref()
            .is_none_or(|v| v.is_object() || v.is_array()),
        "extract_json: an object or an array"
    );
    result
}

pub fn correction(error: &str) -> String {
    debug_assert!(
        !error.trim().is_empty(),
        "correction: the error is not blank"
    );
    format!("Your JSON is wrong: {error}. Answer again with only the corrected JSON.")
}
