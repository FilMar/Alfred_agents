#[allow(unused_imports)]
pub(super) use serde_json::{Value, json};

use crate::hist::ingest::harness::Harness;
use crate::hist::ingest::line::{Line, Part};
use crate::hist::ingest::transcript::SessionHead;

pub(super) fn line(value: &Value) -> Line {
    serde_json::from_value(value.clone()).expect("test line parses")
}

fn part(value: &Value) -> Part {
    serde_json::from_value(value.clone()).expect("test part parses")
}

fn lines(values: &[&Value]) -> Vec<Line> {
    values.iter().map(|v| line(v)).collect()
}

pub(super) struct Table {
    pub harness: &'static str,
    pub is_opener: fn(&Value) -> bool,
    pub is_answer: fn(&Value) -> bool,
    pub spends: fn(&Value) -> bool,
    pub usage: fn(&Value) -> Option<[i64; 4]>,
    pub part_text: fn(&Value, Option<&str>) -> Option<String>,
    pub part_tool: fn(&Value, Option<&str>) -> Option<String>,
    pub session: fn(&[Value]) -> Option<SessionHead>,
    pub exchange_id: fn(&str, &Value) -> Option<String>,
    pub meta: fn(&Value, &[&Value]) -> Option<Value>,
    pub model: fn(&[&Value]) -> Option<String>,
}

macro_rules! table {
    ($name:ident, $h:expr) => {
        pub(super) const $name: Table = Table {
            harness: $h.name(),
            is_opener: |v| $h.is_opener(&line(v)),
            is_answer: |v| $h.is_answer(&line(v)),
            spends: |v| $h.spends(&line(v)),
            usage: |v| $h.usage(&line(v)).map(|u| $h.tokens(u)),
            part_text: |v, role| $h.part_text(&part(v), role),
            part_tool: |v, role| $h.part_tool(&part(v), role),
            session: |vs| $h.session(&lines(&vs.iter().collect::<Vec<_>>())),
            exchange_id: |s, v| $h.exchange_id(s, &line(v)),
            meta: |v, body| $h.meta(&line(v), &lines(body).iter().collect::<Vec<_>>()),
            model: |body| $h.model(&lines(body).iter().collect::<Vec<_>>()),
        };
    };
}

table!(CLAUDE, Harness::Claude);
table!(PI, Harness::Pi);

mod claude_model;
mod claude_table;
mod pi_exchange;
mod pi_meta;
