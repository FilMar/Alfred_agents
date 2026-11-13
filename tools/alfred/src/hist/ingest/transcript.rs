use serde_json::Value;

use super::harness::Harness;
use super::line::Line;
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

pub fn parse(harness: Harness, lines: &[Line], host: Option<&str>) -> Parsed {
    match harness.session(lines) {
        None => Parsed::default(),
        Some(head) => {
            let session = session_of(harness, head, host);
            let (found, orphans) = spans(lines, harness);
            let exchanges = found
                .iter()
                .filter_map(|span| exchange_of(harness, &session.id, span))
                .collect();
            Parsed {
                session: Some(session),
                exchanges,
                orphans,
            }
        }
    }
}

pub struct Span<'a> {
    pub opener: &'a Line,
    pub body: Vec<&'a Line>,
}

pub fn parse_lines(text: &str) -> Vec<Line> {
    text.lines()
        .map(str::trim)
        .filter(|l| !l.is_empty())
        .filter_map(|l| serde_json::from_str(l).ok())
        .collect()
}

pub fn spans<'a>(lines: &'a [Line], harness: Harness) -> (Vec<Span<'a>>, u32) {
    let (mut found, mut orphans) = (Vec::<Span<'a>>::new(), 0_u32);
    for line in lines {
        if harness.is_opener(line) {
            found.push(Span {
                opener: line,
                body: Vec::new(),
            });
        } else if let Some(span) = found.last_mut() {
            span.body.push(line);
        } else if harness.is_answer(line) {
            orphans += 1;
        }
    }
    (found, orphans)
}

pub fn join_body(parts: &[String]) -> String {
    parts
        .iter()
        .filter(|part| !part.is_empty())
        .map(String::as_str)
        .collect::<Vec<&str>>()
        .join("\n\n")
}

pub fn join_tools(parts: &[String]) -> Option<String> {
    let joined = join_body(parts);
    (!joined.is_empty()).then_some(joined)
}

pub fn stringify(value: Option<&Value>) -> String {
    match value {
        None | Some(Value::Null) => String::new(),
        Some(Value::String(text)) => text.clone(),
        Some(other) => serde_json::to_string(other).unwrap_or_default(),
    }
}

fn session_of(harness: Harness, head: SessionHead, host: Option<&str>) -> Session {
    Session {
        id: head.id,
        started: head.started,
        harness: Some(harness.name().to_string()),
        host: host.filter(|h| !h.is_empty()).map(String::from),
        path: head.cwd.filter(|c| !c.is_empty()),
    }
}

fn exchange_of(harness: Harness, session: &str, span: &Span) -> Option<(Exchange, Contents)> {
    let id = harness.exchange_id(session, span.opener)?;
    let timestamp = span.opener.timestamp.clone()?;
    let [tokens_in, tokens_out, tokens_cache_read, tokens_cache_write] =
        harness.tokens_of(&span.body);
    let exchange = Exchange {
        id: id.clone(),
        session: span
            .opener
            .session_id
            .clone()
            .unwrap_or_else(|| session.to_string()),
        parent: None,
        timestamp,
        kind: "chat".to_string(),
        actor: MAIN_ACTOR.to_string(),
        model: harness.model(&span.body),
        tokens_in: Some(tokens_in),
        tokens_out: Some(tokens_out),
        tokens_cache_read: Some(tokens_cache_read),
        tokens_cache_write: Some(tokens_cache_write),
        distilled: None,
        meta: harness.meta(span.opener, &span.body),
    };
    let texts: Vec<String> = span.body.iter().map(|line| harness.text_of(line)).collect();
    let tools: Vec<String> = span
        .body
        .iter()
        .map(|line| harness.tools_of(line))
        .collect();
    let contents = Contents {
        exchange_id: id,
        input: harness.text_of(span.opener),
        output: join_body(&texts),
        tools: join_tools(&tools),
    };
    Some((exchange, contents))
}
