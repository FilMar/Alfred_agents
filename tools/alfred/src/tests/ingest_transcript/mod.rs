use serde_json::Value;

pub(super) use crate::hist::ingest::harness::Harness;
pub(super) use crate::hist::ingest::line::Line;
pub(super) use crate::hist::ingest::transcript::{
    join_body, join_tools, parse_lines, spans, stringify,
};
#[allow(unused_imports)]
pub(super) use serde_json::json;

pub(super) fn strings(parts: &[&str]) -> Vec<String> {
    parts.iter().map(std::string::ToString::to_string).collect()
}

pub(super) fn l(value: Value) -> Line {
    serde_json::from_value(value).expect("test line parses")
}

pub(super) fn ls(values: &[Value]) -> Vec<Line> {
    values.iter().cloned().map(l).collect()
}

mod main_actor;
mod spans_every;
