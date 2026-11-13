use serde_json::Value;

use crate::hist::{Contents, Exchange, Session};

pub const MAIN_ACTOR: &str = "alfredo";

#[derive(Debug, Default)]
pub struct Parsed {
    pub session: Option<Session>,
    pub exchanges: Vec<(Exchange, Contents)>,
    pub orphans: u32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SessionHead {
    pub id: String,
    pub started: String,
    pub cwd: Option<String>,
}

pub struct Format {
    pub harness: &'static str,
    pub is_opener: fn(&Value) -> bool,
    pub is_answer: fn(&Value) -> bool,
    pub spends: fn(&Value) -> bool,
    pub usage: fn(&Value) -> Option<&Value>,
    pub token_keys: [&'static str; 4],
    pub part_text: fn(&Value, Option<&str>) -> Option<String>,
    pub part_tool: fn(&Value, Option<&str>) -> Option<String>,
    pub session: fn(&[Value]) -> Option<SessionHead>,
    pub exchange_id: fn(&str, &Value) -> Option<String>,
    pub meta: fn(&Value, &[&Value]) -> Option<Value>,
    pub model: fn(&[&Value]) -> Option<String>,
}

pub fn parse(format: &Format, lines: &[Value], host: Option<&str>) -> Parsed {
    let result: Parsed = match (format.session)(lines) {
        None => Parsed::default(),
        Some(head) => {
            let session = session_of(format, head, host);
            let (found, orphans) = spans(lines, format.is_opener, format.is_answer);
            let exchanges = found
                .iter()
                .filter_map(|span| exchange_of(format, &session.id, span))
                .collect();
            Parsed {
                session: Some(session),
                exchanges,
                orphans,
            }
        }
    };
    debug_assert!(
        result.session.is_some() || result.exchanges.is_empty(),
        "transcript.parse: no session, no exchanges"
    );
    debug_assert!(
        result.exchanges.iter().all(|(e, c)| e.id == c.exchange_id),
        "transcript.parse: contents of the same exchange"
    );
    debug_assert!(
        result
            .session
            .as_ref()
            .is_none_or(|s| s.harness.as_deref() == Some(format.harness)),
        "transcript.parse: the session names its harness"
    );
    result
}

pub fn line_text(format: &Format, line: &Value) -> String {
    let result: String = match line
        .get("message")
        .and_then(|message| message.get("content"))
    {
        Some(Value::String(text)) => text.clone(),
        Some(Value::Array(parts)) => {
            let role = line
                .get("message")
                .and_then(|message| message.get("role"))
                .and_then(Value::as_str);
            parts
                .iter()
                .filter_map(|part| (format.part_text)(part, role))
                .filter(|text| !text.is_empty())
                .collect::<Vec<String>>()
                .join("\n")
        }
        _ => String::new(),
    };
    result
}

pub fn line_tools(format: &Format, line: &Value) -> String {
    let result: String = match line
        .get("message")
        .and_then(|message| message.get("content"))
    {
        Some(Value::Array(parts)) => {
            let role = line
                .get("message")
                .and_then(|message| message.get("role"))
                .and_then(Value::as_str);
            parts
                .iter()
                .filter_map(|part| (format.part_tool)(part, role))
                .collect::<Vec<String>>()
                .join("\n")
        }
        _ => String::new(),
    };
    result
}

pub struct Span<'a> {
    pub opener: &'a Value,
    pub body: Vec<&'a Value>,
}

pub fn parse_lines(text: &str) -> Vec<Value> {
    let result: Vec<Value> = text
        .lines()
        .filter_map(|line| {
            let trimmed = line.trim();
            if trimmed.is_empty() {
                None
            } else {
                serde_json::from_str(trimmed).ok()
            }
        })
        .collect();
    result
}

pub fn spans<'a>(
    lines: &'a [Value],
    is_opener: fn(&Value) -> bool,
    is_answer: fn(&Value) -> bool,
) -> (Vec<Span<'a>>, u32) {
    let result: (Vec<Span<'a>>, u32) = {
        let mut found: Vec<Span<'a>> = Vec::new();
        let mut orphans: u32 = 0;
        let mut open: Option<Span<'a>> = None;
        for line in lines {
            if is_opener(line) {
                if let Some(span) = open.take() {
                    found.push(span);
                }
                open = Some(Span {
                    opener: line,
                    body: Vec::new(),
                });
            } else if let Some(span) = open.as_mut() {
                span.body.push(line);
            } else if is_answer(line) {
                orphans += 1;
            }
        }
        if let Some(span) = open.take() {
            found.push(span);
        }
        (found, orphans)
    };
    debug_assert!(
        result.0.iter().all(|s| is_opener(s.opener)),
        "spans: every span opens with an opener"
    );
    debug_assert!(
        result.0.iter().map(|s| s.body.len() + 1).sum::<usize>() + result.1 as usize <= lines.len(),
        "spans: no line counted twice"
    );
    result
}

pub fn join_body(parts: &[String]) -> String {
    let result: String = parts
        .iter()
        .filter(|part| !part.is_empty())
        .map(String::as_str)
        .collect::<Vec<&str>>()
        .join("\n\n");
    debug_assert!(
        !result.starts_with("\n\n") && !result.ends_with("\n\n")
            || parts
                .iter()
                .any(|p| p.starts_with('\n') || p.ends_with('\n')),
        "join_body: no empty part joined"
    );
    result
}

pub fn join_tools(parts: &[String]) -> Option<String> {
    let result: Option<String> = {
        let joined = join_body(parts);
        if joined.is_empty() {
            None
        } else {
            Some(joined)
        }
    };
    debug_assert!(
        result.as_ref().is_none_or(|t| !t.is_empty()),
        "join_tools: never an empty text"
    );
    result
}

pub fn stringify(value: Option<&Value>) -> String {
    let result: String = match value {
        None | Some(Value::Null) => String::new(),
        Some(Value::String(text)) => text.clone(),
        Some(other) => serde_json::to_string(other).unwrap_or_default(),
    };
    result
}

pub fn text_of(line: &Value, path: &[&str]) -> Option<String> {
    let result: Option<String> = {
        let mut value: Option<&Value> = Some(line);
        for key in path {
            value = value.and_then(|current| current.get(*key));
        }
        value.and_then(Value::as_str).map(String::from)
    };
    result
}

fn session_of(format: &Format, head: SessionHead, host: Option<&str>) -> Session {
    Session {
        id: head.id,
        started: head.started,
        harness: Some(format.harness.to_string()),
        host: host.filter(|h| !h.is_empty()).map(String::from),
        path: head.cwd.filter(|c| !c.is_empty()),
    }
}

fn exchange_of(format: &Format, session: &str, span: &Span) -> Option<(Exchange, Contents)> {
    let id = (format.exchange_id)(session, span.opener)?;
    let timestamp = text_of(span.opener, &["timestamp"])?;
    let [tokens_in, tokens_out, tokens_cache_read, tokens_cache_write] =
        tokens_of(format, &span.body);
    let exchange = Exchange {
        id: id.clone(),
        session: text_of(span.opener, &["sessionId"]).unwrap_or_else(|| session.to_string()),
        parent: None,
        timestamp,
        kind: "chat".to_string(),
        actor: MAIN_ACTOR.to_string(),
        model: (format.model)(&span.body),
        tokens_in: Some(tokens_in),
        tokens_out: Some(tokens_out),
        tokens_cache_read: Some(tokens_cache_read),
        tokens_cache_write: Some(tokens_cache_write),
        distilled: None,
        meta: (format.meta)(span.opener, &span.body),
    };
    let texts: Vec<String> = span
        .body
        .iter()
        .map(|line| line_text(format, line))
        .collect();
    let tools: Vec<String> = span
        .body
        .iter()
        .map(|line| line_tools(format, line))
        .collect();
    let contents = Contents {
        exchange_id: id,
        input: line_text(format, span.opener),
        output: join_body(&texts),
        tools: join_tools(&tools),
    };
    Some((exchange, contents))
}

fn tokens_of(format: &Format, body: &[&Value]) -> [i64; 4] {
    let mut tokens = [0i64; 4];
    for usage in body
        .iter()
        .filter(|line| (format.spends)(line))
        .filter_map(|line| (format.usage)(line))
    {
        for (slot, key) in tokens.iter_mut().zip(format.token_keys) {
            *slot += usage.get(key).and_then(Value::as_i64).unwrap_or(0);
        }
    }
    tokens
}
