use serde_json::Value;

use super::transcript::{Format, SessionHead, stringify};

pub const CLAUDE: Format = Format {
    harness: "claude",
    is_opener: claude_opener,
    is_answer: claude_answer,
    spends: claude_answer,
    usage: claude_usage,
    token_keys: [
        "input_tokens",
        "output_tokens",
        "cache_read_input_tokens",
        "cache_creation_input_tokens",
    ],
    part_text: claude_part_text,
    part_tool: claude_part_tool,
    session: claude_session,
    exchange_id: claude_id,
    meta: claude_meta,
    model: claude_model,
};

pub const PI: Format = Format {
    harness: "pi",
    is_opener: pi_opener,
    is_answer: pi_answer,
    spends: pi_spends,
    usage: pi_usage,
    token_keys: ["input", "output", "cacheRead", "cacheWrite"],
    part_text: pi_part_text,
    part_tool: pi_part_tool,
    session: pi_session,
    exchange_id: pi_id,
    meta: pi_meta,
    model: pi_model,
};

fn claude_opener(line: &Value) -> bool {
    let kind = line
        .get("origin")
        .and_then(|origin| origin.get("kind"))
        .and_then(Value::as_str);
    line.get("type").and_then(Value::as_str) == Some("user") && kind.is_some()
}
fn claude_answer(line: &Value) -> bool {
    line.get("type").and_then(Value::as_str) == Some("assistant")
}
fn claude_usage(line: &Value) -> Option<&Value> {
    line.get("message")?.get("usage")
}
fn claude_part_text(part: &Value, role: Option<&str>) -> Option<String> {
    let _ = role;
    if part.get("type").and_then(Value::as_str) != Some("text") {
        return None;
    }
    Some(
        part.get("text")
            .and_then(Value::as_str)
            .unwrap_or("")
            .to_string(),
    )
}
fn claude_part_tool(part: &Value, role: Option<&str>) -> Option<String> {
    let _ = role;
    match part.get("type").and_then(Value::as_str)? {
        "tool_use" => {
            let name = part.get("name").and_then(Value::as_str).unwrap_or("?");
            Some(format!("[tool {name}] {}", stringify(part.get("input"))))
        }
        "tool_result" => Some(format!("[result] {}", stringify(part.get("content")))),
        _ => None,
    }
}
fn claude_session(lines: &[Value]) -> Option<SessionHead> {
    let line = lines.iter().find(|line| {
        line.get("sessionId").and_then(Value::as_str).is_some()
            && line.get("timestamp").and_then(Value::as_str).is_some()
    })?;
    Some(SessionHead {
        id: line.get("sessionId")?.as_str()?.to_string(),
        started: line.get("timestamp")?.as_str()?.to_string(),
        cwd: line
            .get("cwd")
            .and_then(Value::as_str)
            .filter(|cwd| !cwd.is_empty())
            .map(str::to_string),
    })
}
fn claude_id(session: &str, opener: &Value) -> Option<String> {
    let _ = session;
    opener.get("sessionId")?.as_str()?;
    opener.get("uuid")?.as_str().map(str::to_string)
}
fn claude_meta(opener: &Value, body: &[&Value]) -> Option<Value> {
    let _ = body;
    let kind = opener.get("origin")?.get("kind")?.as_str()?;
    if kind.is_empty() {
        return None;
    }
    Some(serde_json::json!({"trigger": kind}))
}
fn claude_model(body: &[&Value]) -> Option<String> {
    body.iter()
        .rev()
        .filter(|line| claude_answer(line))
        .filter_map(|line| {
            line.get("message")
                .and_then(|message| message.get("model"))
                .and_then(Value::as_str)
        })
        .find(|model| !model.starts_with('<'))
        .map(str::to_string)
}

fn pi_opener(line: &Value) -> bool {
    let role = line
        .get("message")
        .and_then(|message| message.get("role"))
        .and_then(Value::as_str);
    line.get("type").and_then(Value::as_str) == Some("message") && role == Some("user")
}
fn pi_answer(line: &Value) -> bool {
    let role = line
        .get("message")
        .and_then(|message| message.get("role"))
        .and_then(Value::as_str);
    line.get("type").and_then(Value::as_str) == Some("message") && role == Some("assistant")
}
fn pi_spends(line: &Value) -> bool {
    pi_answer(line) || line.get("type").and_then(Value::as_str) == Some("compaction")
}
fn pi_usage(line: &Value) -> Option<&Value> {
    line.get("message")
        .and_then(|message| message.get("usage"))
        .or_else(|| line.get("usage"))
}
fn pi_part_text(part: &Value, role: Option<&str>) -> Option<String> {
    if role == Some("toolResult") || part.get("type").and_then(Value::as_str) != Some("text") {
        return None;
    }
    Some(
        part.get("text")
            .and_then(Value::as_str)
            .unwrap_or("")
            .to_string(),
    )
}
fn pi_part_tool(part: &Value, role: Option<&str>) -> Option<String> {
    match part.get("type").and_then(Value::as_str)? {
        "toolCall" => {
            let name = part.get("name").and_then(Value::as_str).unwrap_or("?");
            let arguments = part
                .get("arguments")
                .filter(|arguments| !arguments.is_null())
                .or_else(|| part.get("input"));
            Some(format!("[tool {name}] {}", stringify(arguments)))
        }
        "text" if role == Some("toolResult") => {
            let text = part.get("text").and_then(Value::as_str).unwrap_or("");
            Some(format!("[result] {text}"))
        }
        _ => None,
    }
}
fn pi_session(lines: &[Value]) -> Option<SessionHead> {
    let line = lines.iter().find(|line| {
        line.get("type").and_then(Value::as_str) == Some("session")
            && line.get("id").and_then(Value::as_str).is_some()
            && line.get("timestamp").and_then(Value::as_str).is_some()
    })?;
    Some(SessionHead {
        id: line.get("id")?.as_str()?.to_string(),
        started: line.get("timestamp")?.as_str()?.to_string(),
        cwd: line
            .get("cwd")
            .and_then(Value::as_str)
            .filter(|cwd| !cwd.is_empty())
            .map(str::to_string),
    })
}
fn pi_id(session: &str, opener: &Value) -> Option<String> {
    let id = opener.get("id")?.as_str()?;
    Some(crate::hist::episodes::derived_id(session, id))
}

fn pi_meta(opener: &Value, body: &[&Value]) -> Option<Value> {
    let source_id = opener.get("id")?.as_str()?;
    let mut meta = serde_json::Map::new();
    meta.insert(
        "source_id".to_string(),
        Value::String(source_id.to_string()),
    );
    let provider = body
        .iter()
        .rev()
        .filter(|line| pi_answer(line))
        .find_map(|line| {
            line.get("message")
                .and_then(|message| message.get("provider"))
                .and_then(Value::as_str)
        });
    if let Some(provider) = provider {
        meta.insert("provider".to_string(), Value::String(provider.to_string()));
    }
    let mut cost_usd = 0.0;
    for line in body {
        let total = pi_usage(line)
            .and_then(|usage| usage.get("cost"))
            .and_then(|cost| cost.get("total"))
            .and_then(Value::as_f64);
        cost_usd += total.unwrap_or(0.0);
    }
    if cost_usd > 0.0 {
        meta.insert("cost_usd".to_string(), Value::from(cost_usd));
    }
    Some(Value::Object(meta))
}
fn pi_model(body: &[&Value]) -> Option<String> {
    body.iter()
        .rev()
        .filter(|line| pi_answer(line))
        .filter_map(|line| {
            line.get("message")
                .and_then(|message| message.get("model"))
                .and_then(Value::as_str)
        })
        .map(str::to_string)
        .next()
}
