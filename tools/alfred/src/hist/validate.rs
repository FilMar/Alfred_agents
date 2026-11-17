use serde_json::Value;

pub(crate) use super::js::js;

const TOKEN_FIELDS: [&str; 4] = [
    "tokens_in",
    "tokens_out",
    "tokens_cache_read",
    "tokens_cache_write",
];

pub fn session(row: &Value) -> Option<String> {
    let harness = row.get("harness");
    first_failure(vec![
        (!filled(row, "id"), "session.id is required".into()),
        (
            !shaped(row, "started", is_timestamp),
            format!(
                "session.started is not ISO-8601 UTC: {}",
                js(row.get("started"))
            ),
        ),
        (
            harness.is_some_and(|h| !matches!(h.as_str(), Some("claude" | "pi"))),
            format!("session.harness is not claude or pi: {}", js(harness)),
        ),
    ])
}

pub fn exchange(row: &Value) -> Option<String> {
    let bad_count = TOKEN_FIELDS
        .iter()
        .copied()
        .find(|f| row.get(*f).is_some_and(|v| !is_count(v)));
    first_failure(vec![
        (
            !shaped(row, "id", is_id),
            format!("exchange.id is not an id: {}", js(row.get("id"))),
        ),
        (
            !filled(row, "session"),
            "exchange.session is required".into(),
        ),
        (
            !shaped(row, "timestamp", is_timestamp),
            format!(
                "exchange.timestamp is not ISO-8601 UTC: {}",
                js(row.get("timestamp"))
            ),
        ),
        (
            !shaped(row, "kind", |k| matches!(k, "chat" | "subtask")),
            format!(
                "exchange.kind is not chat or subtask: {}",
                js(row.get("kind"))
            ),
        ),
        (!filled(row, "actor"), "exchange.actor is required".into()),
        (
            present_and_not(row, "parent", is_id),
            format!("exchange.parent is not an id: {}", js(row.get("parent"))),
        ),
        (
            present_and_not(row, "distilled", is_timestamp),
            format!(
                "exchange.distilled is not ISO-8601 UTC: {}",
                js(row.get("distilled"))
            ),
        ),
        (
            bad_count.is_some(),
            bad_count.map_or_else(String::new, |f| {
                format!("exchange.{f} is not a token count: {}", js(row.get(f)))
            }),
        ),
    ])
}

pub fn contents(row: &Value) -> Option<String> {
    first_failure(vec![
        (
            !shaped(row, "exchange_id", is_id),
            format!(
                "contents.exchange_id is not an id: {}",
                js(row.get("exchange_id"))
            ),
        ),
        (
            !row.get("input").is_some_and(Value::is_string),
            "contents.input is required".into(),
        ),
        (
            !row.get("output").is_some_and(Value::is_string),
            "contents.output is required".into(),
        ),
        (
            row.get("tools").is_some() && !filled(row, "tools"),
            "contents.tools is not a non-empty string".into(),
        ),
    ])
}

pub fn injection(row: &Value) -> Option<String> {
    first_failure(vec![
        (
            !shaped(row, "exchange_id", is_id),
            format!(
                "injection.exchange_id is not an id: {}",
                js(row.get("exchange_id"))
            ),
        ),
        (
            !shaped(row, "kind", |k| k == "rule"),
            format!("injection.kind is not rule: {}", js(row.get("kind"))),
        ),
        (
            !shaped(row, "ref", super::ingest::injection::is_short_id),
            format!("injection.ref is not a short id: {}", js(row.get("ref"))),
        ),
        (!filled(row, "text"), "injection.text is required".into()),
    ])
}

pub fn new_extractor(row: &Value) -> Option<String> {
    let parent = row.get("parent");
    first_failure(vec![
        (!filled(row, "why"), "why is required".into()),
        (!is_json(row.get("config")), "config must be JSON".into()),
        (
            !shaped(row, "created", is_timestamp),
            format!("created is not ISO-8601 UTC: {}", js(row.get("created"))),
        ),
        (
            !parent.is_none_or(|p| p.is_null() || is_row_id(p)),
            format!("parent is not a row id: {}", js(parent)),
        ),
    ])
}

pub fn new_extraction(row: &Value) -> Option<String> {
    extraction_identity(row)
        .or_else(|| extraction_payload(row))
        .or_else(|| extraction_outcome(row))
}

fn extraction_identity(row: &Value) -> Option<String> {
    first_failure(vec![
        (
            !row.get("extractor_id").is_some_and(is_row_id),
            format!(
                "extractor_id is not a row id: {}",
                js(row.get("extractor_id"))
            ),
        ),
        (!filled(row, "run"), "run is required".into()),
        (
            !shaped(row, "exchange_id", is_id),
            format!("exchange_id is not an id: {}", js(row.get("exchange_id"))),
        ),
        (
            !shaped(row, "kind", |k| matches!(k, "note" | "rule")),
            format!("kind is not note or rule: {}", js(row.get("kind"))),
        ),
    ])
}

fn extraction_payload(row: &Value) -> Option<String> {
    first_failure(vec![
        (
            !filled(row, "quote") && !is_check_drop(row),
            "quote is required unless a check dropped the candidate".into(),
        ),
        (!is_json(row.get("body")), "body must be JSON".into()),
        (
            set(row, "probabilities").is_some_and(|p| !is_json(Some(p))),
            "probabilities must be JSON".into(),
        ),
        (
            !shaped(row, "created", is_timestamp),
            format!("created is not ISO-8601 UTC: {}", js(row.get("created"))),
        ),
    ])
}

fn extraction_outcome(row: &Value) -> Option<String> {
    let dropped = set(row, "dropped_by");
    let verdict = set(row, "verdict");
    first_failure(vec![
        (
            dropped.is_some_and(|d| !is_reason(d)),
            format!(
                "dropped_by is not a known reason: {}",
                js(row.get("dropped_by"))
            ),
        ),
        (
            dropped.is_some() && verdict.is_some(),
            "a dropped candidate has no verdict".into(),
        ),
        (
            set(row, "saved_id").is_some() && verdict.is_none(),
            "a saved candidate has a verdict".into(),
        ),
        (
            set(row, "of").is_some() && verdict.is_none(),
            "a pointer comes with a verdict".into(),
        ),
        (
            is_check_drop(row) && set(row, "probabilities").is_some(),
            "a check drop has no probabilities".into(),
        ),
    ])
}

fn set<'a>(row: &'a Value, key: &str) -> Option<&'a Value> {
    row.get(key).filter(|v| !v.is_null())
}

fn is_check_drop(row: &Value) -> bool {
    set(row, "dropped_by")
        .and_then(Value::as_str)
        .is_some_and(|r| r.starts_with("check:"))
}

fn first_failure(checks: Vec<(bool, String)>) -> Option<String> {
    checks
        .into_iter()
        .find(|(bad, _)| *bad)
        .map(|(_, message)| message)
}

fn filled(row: &Value, key: &str) -> bool {
    row.get(key)
        .and_then(Value::as_str)
        .is_some_and(|t| !t.is_empty())
}

fn shaped(row: &Value, key: &str, shape: impl Fn(&str) -> bool) -> bool {
    row.get(key).and_then(Value::as_str).is_some_and(shape)
}

fn present_and_not(row: &Value, key: &str, shape: impl Fn(&str) -> bool) -> bool {
    row.get(key).is_some() && !shaped(row, key, shape)
}

fn is_count(value: &Value) -> bool {
    value.as_f64().is_some_and(|n| n >= 0.0 && n.fract() == 0.0)
}

fn is_row_id(value: &Value) -> bool {
    value.as_f64().is_some_and(|n| n > 0.0 && n.fract() == 0.0)
}

fn is_json(value: Option<&Value>) -> bool {
    value
        .and_then(Value::as_str)
        .is_some_and(|t| serde_json::from_str::<Value>(t).is_ok())
}

fn is_reason(value: &Value) -> bool {
    let reason = value.as_str().unwrap_or_default();
    ["check:", "critic:"]
        .iter()
        .any(|p| reason.len() > p.len() && reason.starts_with(p))
}

pub fn is_id(text: &str) -> bool {
    let bytes = text.as_bytes();
    bytes.len() == 36
        && bytes.iter().enumerate().all(|(i, byte)| match i {
            8 | 13 | 18 | 23 => *byte == b'-',
            _ => matches!(*byte, b'0'..=b'9' | b'a'..=b'f'),
        })
}

pub fn is_timestamp(text: &str) -> bool {
    let bytes = text.as_bytes();
    bytes.len() == 24
        && bytes.iter().enumerate().all(|(i, byte)| match i {
            4 | 7 => *byte == b'-',
            10 => *byte == b'T',
            13 | 16 => *byte == b':',
            19 => *byte == b'.',
            23 => *byte == b'Z',
            _ => byte.is_ascii_digit(),
        })
}

pub fn is_day(text: &str) -> bool {
    let bytes = text.as_bytes();
    bytes.len() == 10
        && bytes.iter().enumerate().all(|(i, byte)| match i {
            4 | 7 => *byte == b'-',
            _ => byte.is_ascii_digit(),
        })
}
