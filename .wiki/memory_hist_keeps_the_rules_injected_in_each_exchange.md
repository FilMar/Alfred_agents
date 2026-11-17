---
tags: [memory, hist, hook, rules, ingest, injection]
sources: [conversation, spec.json@82621d5, review.json@82621d5, tools/alfred/src/hist/ingest/injection.rs, tools/alfred/src/hist/db/injections.rs, extensions/rules/claude.sh, extensions/hist/claude.sh, tools/alfred/src/hist/db/mod.rs, tools/alfred/src/hist/ingest/harness.rs]
---

## Decision

`alfred hist` keeps the rules that the hook injected in each exchange. They live in a table of their own, `injections`. Each row holds the exchange, the kind (`rule`), the short id of the rule and the text as it was injected.

`alfred hist ingest` fills the table. The hook does not change. A Claude Code transcript already holds each injection: a line of type `attachment`, with `attachment.type` equal to `hook_additional_context`. The ingest reads those lines and links each one to the exchange of its prompt.

Nothing reads the table yet. The first step is only to save.

The table holds no episodes. The hook does not inject them, and a search of the agent is already in `contents.tools`.

The pi side is open. No pi transcript on the laptop shows how the `rules-context` message of `extensions/rules/pi.ts` is stored.

## Why

The data has an end date. A transcript stays on disk for 30 days, and the archive is the only copy after that. Every later idea that judges a rule by what happened after it was injected needs this record. So it is saved before anything uses it.

A table, not a key in `meta`. An injected rule has a life of its own: it is counted, and later it is joined with a verdict. `meta` is for data that nothing queries.

The text is saved with the id. A rule changes in place when a `do` is appended, and it can be deleted. The id alone does not say what the agent read in that turn.

The ingest, not the hook. The hook must stay fast and must never fail a turn. The transcript is the source the ingest already reads, so one reader keeps one path into the archive.

## Cross-references

- [hook_tb_ti_auto_injection](hook_tb_ti_auto_injection) — the hook that injects the rules
- [memory_hist_ingest_reads_every_harness_through_one_format](memory_hist_ingest_reads_every_harness_through_one_format) — the reader that gets one more kind of line
- [memory_refine_hits_measure_retrieval](memory_refine_hits_measure_retrieval) — why a hit count does not say if a rule is good
