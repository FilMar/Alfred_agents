---
tags: [memory, tl, sqlite, schema]
sources: [conversation, tools/tl/README.md, ~/.claude/projects]
replaces: [memory_tl_unified_event_log]
---

## Decision

`tl` is an archive of work done, not a log of events. A row is one thing that was asked and everything that came of it.

`kind` has two values: `chat` (Filippo asks) and `subtask` (an agent delegates). A scheduled job is a `subtask` with a different trigger in `meta`. Writes of notes and rules get no row: they happen inside an exchange and are already in its output.

Three tables (the register tables are in [memory_extractor_is_data_immutable_config_rows_in_tl](memory_extractor_is_data_immutable_config_rows_in_tl)):

- `sessions` holds what stays constant for a whole session: id, start, host, path, harness. `model` is not constant: it changes mid-session.
- `exchanges`: id, session, parent, timestamp, kind, actor, model, four token counters, `distilled`, `meta`.
- `contents`: the input and the full output, one row per exchange.

One row per **exchange**, not per model call: 4.5 assistant messages per exchange, because each tool round is its own message. The exchange has a start, an end and a cost. The token counters are columns, because their shape is fixed. `meta` is JSON, because its contents vary. `contents` is its own table so `SELECT *` on the main table stays usable. Nothing is compressed. There are no indexes to start: 6,000 rows a month scan faster than anyone notices.

`tl` is a self-sufficient copy and never an authority. Git stays authoritative for the wiki, Qdrant for the notes. `distilled` is the one mutable field, bookkeeping of our own pipeline. `tl` is in the Clio backups, because it holds the only copy of transcripts that would otherwise be deleted.

## Why

The July envelope (`source`, `actor`, `context`, `outcome`, `tags`, `metadata`) was built for `th` runs. It does not fit a chat exchange, which is a question with its answer. Carrying those fields onto exchanges pushed an earlier draft to nineteen columns: an old label on a new thing.

Bodies go in whole because transcripts rotate after 30 days (95 MB, 76 sessions, the oldest exactly one month). A periodic distiller runs once the session is gone, so a pointer would dangle. The price of not keeping them is known: 369 of 737 notes have no recoverable source.

This reverses "storing raw dialogues: out of scope". Distillation moved from a human at the end of a session to an automatic job. A human has the session in front of them and needs no archive. A job does not.

`distilled` is a timestamp, not a flag. It allows a retry of the one row that failed, and re-distillation of selected rows when the distiller improves. `input` is split from `output` because the prompts are a corpus in themselves: `ti` rules and `about: filippo` notes come from them.

Rejected: a table for token costs, embeddings in `tl` (semantic search is `tb`), any judgement field.

## Cross-references

- [memory_tl_timestamps_are_iso_8601_utc_text](memory_tl_timestamps_are_iso_8601_utc_text) — the format of every time
- [memory_session_names_its_harness](memory_session_names_its_harness) — the column `harness`
- [memory_coala_four_types_map_to_pi](memory_coala_four_types_map_to_pi) — the episodic layer this is
- [memory_raw_text_lives_in_the_archive_not_the_note](memory_raw_text_lives_in_the_archive_not_the_note) — why notes point here
