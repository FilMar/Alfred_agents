#[allow(unused_imports)]
pub(super) use crate::hist::ingest::transcript::{
    Format, MAIN_ACTOR, SessionHead, join_body, join_tools, line_text, line_tools, parse,
    parse_lines, spans, stringify, text_of,
};
#[allow(unused_imports)]
pub(super) use serde_json::{Value, json};

pub(super) fn strings(parts: &[&str]) -> Vec<String> {
    parts.iter().map(std::string::ToString::to_string).collect()
}

pub(super) fn blob(value: Option<&Value>) -> String {
    match value {
        None | Some(Value::Null) => String::new(),
        Some(Value::String(text)) => text.clone(),
        Some(other) => serde_json::to_string(other).unwrap_or_default(),
    }
}

pub(super) fn tag_opener(line: &Value) -> bool {
    line.get("kind").and_then(Value::as_str) == Some("opener")
}

pub(super) fn tag_answer(line: &Value) -> bool {
    line.get("kind").and_then(Value::as_str) == Some("answer")
}

pub(super) fn inert(_line: &Value) -> bool {
    false
}

pub(super) fn no_usage(_line: &Value) -> Option<&Value> {
    None
}

pub(super) fn no_session(_lines: &[Value]) -> Option<SessionHead> {
    None
}

pub(super) fn no_exchange_id(_session: &str, _opener: &Value) -> Option<String> {
    None
}

pub(super) fn no_meta(_opener: &Value, _body: &[&Value]) -> Option<Value> {
    None
}

pub(super) fn no_model(_body: &[&Value]) -> Option<String> {
    None
}

pub(super) fn probe_part_text(part: &Value, role: Option<&str>) -> Option<String> {
    if role == Some("mute") {
        return None;
    }
    if let Some(say) = part.get("say").and_then(Value::as_str) {
        return Some(say.to_string());
    }
    if part.get("blank").is_some() {
        return Some(String::new());
    }
    None
}

pub(super) fn probe_part_tool(part: &Value, role: Option<&str>) -> Option<String> {
    if let Some(tool) = part.get("tool").and_then(Value::as_str) {
        return Some(format!("[tool {tool}]"));
    }
    if part.get("result").is_some() && role == Some("toolResult") {
        return Some("[result]".to_string());
    }
    None
}

pub(super) fn probe_format() -> Format {
    Format {
        harness: "probe",
        is_opener: inert,
        is_answer: inert,
        spends: inert,
        usage: no_usage,
        token_keys: ["input", "output", "cache_read", "cache_write"],
        part_text: probe_part_text,
        part_tool: probe_part_tool,
        session: no_session,
        exchange_id: no_exchange_id,
        meta: no_meta,
        model: no_model,
    }
}

pub(super) fn claude_opener(line: &Value) -> bool {
    line.get("type").and_then(Value::as_str) == Some("user")
        && line
            .get("origin")
            .and_then(|origin| origin.get("kind"))
            .and_then(Value::as_str)
            .is_some()
}

pub(super) fn claude_answer(line: &Value) -> bool {
    line.get("type").and_then(Value::as_str) == Some("assistant")
}

pub(super) fn claude_usage(line: &Value) -> Option<&Value> {
    line.get("usage")
}

pub(super) fn claude_part_text(part: &Value, _role: Option<&str>) -> Option<String> {
    if part.get("type").and_then(Value::as_str) == Some("text") {
        return Some(
            part.get("text")
                .and_then(Value::as_str)
                .unwrap_or("")
                .to_string(),
        );
    }
    None
}

pub(super) fn claude_part_tool(part: &Value, _role: Option<&str>) -> Option<String> {
    match part.get("type").and_then(Value::as_str) {
        Some("tool_use") => Some(format!(
            "[tool {}] {}",
            part.get("name").and_then(Value::as_str).unwrap_or("?"),
            blob(part.get("input"))
        )),
        Some("tool_result") => Some(format!("[result] {}", blob(part.get("content")))),
        _ => None,
    }
}

pub(super) fn claude_session(lines: &[Value]) -> Option<SessionHead> {
    lines.iter().find_map(|line| {
        let id = line.get("sessionId").and_then(Value::as_str)?;
        let started = line.get("timestamp").and_then(Value::as_str)?;
        Some(SessionHead {
            id: id.to_string(),
            started: started.to_string(),
            cwd: line.get("cwd").and_then(Value::as_str).map(String::from),
        })
    })
}

pub(super) fn claude_exchange_id(_session: &str, opener: &Value) -> Option<String> {
    opener.get("uuid").and_then(Value::as_str).map(String::from)
}

pub(super) fn claude_meta(opener: &Value, _body: &[&Value]) -> Option<Value> {
    let kind = opener
        .get("origin")
        .and_then(|origin| origin.get("kind"))
        .and_then(Value::as_str)?;
    if kind.is_empty() {
        return None;
    }
    Some(json!({ "trigger": kind }))
}

pub(super) fn claude_model(body: &[&Value]) -> Option<String> {
    body.iter().rev().find_map(|line| {
        if line.get("type").and_then(Value::as_str) != Some("assistant") {
            return None;
        }
        let model = line.pointer("/message/model").and_then(Value::as_str)?;
        if model.starts_with('<') {
            return None;
        }
        Some(model.to_string())
    })
}

pub(super) fn claude_format() -> Format {
    Format {
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
        exchange_id: claude_exchange_id,
        meta: claude_meta,
        model: claude_model,
    }
}

pub(super) fn pi_opener(line: &Value) -> bool {
    line.get("type").and_then(Value::as_str) == Some("message")
        && line.pointer("/message/role").and_then(Value::as_str) == Some("user")
}

pub(super) fn pi_answer(line: &Value) -> bool {
    line.get("type").and_then(Value::as_str) == Some("message")
        && line.pointer("/message/role").and_then(Value::as_str) == Some("assistant")
}

pub(super) fn pi_spends(line: &Value) -> bool {
    pi_answer(line) || line.get("type").and_then(Value::as_str) == Some("compaction")
}

pub(super) fn pi_usage(line: &Value) -> Option<&Value> {
    line.pointer("/message/usage").or_else(|| line.get("usage"))
}

pub(super) fn pi_part_text(part: &Value, role: Option<&str>) -> Option<String> {
    if part.get("type").and_then(Value::as_str) == Some("text") && role != Some("toolResult") {
        return Some(
            part.get("text")
                .and_then(Value::as_str)
                .unwrap_or("")
                .to_string(),
        );
    }
    None
}

pub(super) fn pi_part_tool(part: &Value, role: Option<&str>) -> Option<String> {
    match part.get("type").and_then(Value::as_str) {
        Some("toolCall") => Some(format!(
            "[tool {}] {}",
            part.get("name").and_then(Value::as_str).unwrap_or("?"),
            blob(part.get("arguments").or_else(|| part.get("input")))
        )),
        Some("text") if role == Some("toolResult") => Some(format!(
            "[result] {}",
            part.get("text").and_then(Value::as_str).unwrap_or("")
        )),
        _ => None,
    }
}

pub(super) fn pi_session(lines: &[Value]) -> Option<SessionHead> {
    lines.iter().find_map(|line| {
        if line.get("type").and_then(Value::as_str) != Some("session") {
            return None;
        }
        let id = line.get("id").and_then(Value::as_str)?;
        let started = line.get("timestamp").and_then(Value::as_str)?;
        Some(SessionHead {
            id: id.to_string(),
            started: started.to_string(),
            cwd: line.get("cwd").and_then(Value::as_str).map(String::from),
        })
    })
}

pub(super) fn pi_exchange_id(session: &str, opener: &Value) -> Option<String> {
    let id = opener.get("id").and_then(Value::as_str)?;
    Some(format!("{session}:{id}"))
}

pub(super) fn pi_meta(opener: &Value, _body: &[&Value]) -> Option<Value> {
    let id = opener.get("id").and_then(Value::as_str)?;
    Some(json!({ "source_id": id }))
}

pub(super) fn pi_model(body: &[&Value]) -> Option<String> {
    body.iter().rev().find_map(|line| {
        line.pointer("/message/model")
            .and_then(Value::as_str)
            .map(String::from)
    })
}

pub(super) fn pi_format() -> Format {
    Format {
        harness: "pi",
        is_opener: pi_opener,
        is_answer: pi_answer,
        spends: pi_spends,
        usage: pi_usage,
        token_keys: ["input", "output", "cacheRead", "cacheWrite"],
        part_text: pi_part_text,
        part_tool: pi_part_tool,
        session: pi_session,
        exchange_id: pi_exchange_id,
        meta: pi_meta,
        model: pi_model,
    }
}

mod main_actor;
mod spans_every;
