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
