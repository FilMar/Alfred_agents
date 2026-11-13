#![allow(
    clippy::unreadable_literal,
    clippy::float_cmp,
    clippy::too_many_lines,
    clippy::approx_constant,
    clippy::manual_let_else,
    clippy::match_wild_err_arm
)]

mod chat;
mod cli;
mod distill_ask;
mod distill_config;
mod distill_critic;
mod distill_episodes;
mod distill_extract;
mod distill_record;
mod distill_rule;
mod distill_session;
mod hist_cli;
mod hist_db;
mod hist_episodes;
mod hist_mod;
mod hist_routes;
mod hist_stats;
mod hist_validate;
mod ingest_formats;
mod ingest_mod;
mod ingest_transcript;
mod page;
mod rules_cli;
mod rules_mod;
mod rules_near;
mod rules_reach;
mod rules_refine;
mod rules_routes;
mod serve;
mod store;
