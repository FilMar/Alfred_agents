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
mod command_hats;
mod command_job;
mod command_runner;
mod command_sandbox;
mod command_skill;
mod command_spec;
mod distill_ask;
mod distill_bench;
mod distill_cli;
mod distill_config;
mod distill_critic;
mod distill_decide;
mod distill_decide_flow;
mod distill_decide_io;
mod distill_episodes;
mod distill_extract;
mod distill_fake;
mod distill_novelty;
mod distill_novelty_io;
mod distill_record;
mod distill_routes;
mod distill_rule;
mod distill_run;
mod distill_run_flow;
mod distill_save;
mod distill_save_io;
mod distill_session;
mod distill_session_run;
mod distill_trigger;
mod distill_twin;
mod distill_twin_io;
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
