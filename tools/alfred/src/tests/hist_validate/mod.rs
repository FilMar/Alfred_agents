use serde_json::{Value, json};

#[allow(unused_imports)]
pub(super) use crate::hist::validate::{
    contents, exchange, is_day, is_id, is_timestamp, js, new_extraction, new_extractor, session,
};

pub(super) const ID: &str = "01234567-89ab-cdef-0123-456789abcdef";

pub(super) const OTHER_ID: &str = "ffffffff-ffff-ffff-ffff-ffffffffffff";

pub(super) const TS: &str = "2026-01-02T03:04:05.006Z";

pub(super) const DAY: &str = "2026-01-02";

mod contents_returns;
mod exchange_returns;
mod is_id;
mod new_extraction;
mod new_extraction_outcome;
mod session_message;

pub(super) fn over(mut base: Value, patch: Value) -> Value {
    let Value::Object(fields) = patch else {
        panic!("a patch is an object")
    };
    base.as_object_mut()
        .expect("a base is an object")
        .extend(fields);
    base
}

pub(super) fn exchange_row(patch: Value) -> Value {
    over(
        json!({"id": ID, "session": OTHER_ID, "timestamp": TS, "kind": "chat", "actor": "user"}),
        patch,
    )
}

pub(super) fn extraction_row(patch: Value) -> Value {
    over(
        json!({"extractor_id": 1, "run": "r", "exchange_id": ID, "kind": "note", "quote": "q", "body": "{}", "created": TS}),
        patch,
    )
}
