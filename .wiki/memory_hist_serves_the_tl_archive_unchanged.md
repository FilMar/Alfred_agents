---
tags: [memory, tl, hist, alfred, sqlite, compatibility]
sources: [spec.json@4c8ade4, review.json@4c8ade4, tools/alfred/src/hist, tools/alfred/src/main.rs]
---

## Decision

`alfred serve` serves the `tl` archive under `/hist`. It keeps the 14 routes of `tl serve` and `/health`, with the same parameters, status codes, error texts and JSON. It opens the same SQLite file, `HIST_DB`, which defaults to `~/.tl/tl.db`.

The schema is the `tl` schema, copied character by character. Opening an old file adds only the two columns `tl` already adds, `harness` and `tools`. There is no other migration.

Two routes are new: `GET /hist/search` and `GET /hist/episodes/{id}`. They read the episodes from the Qdrant collection `tl_episodes`, which the distiller in `alfred serve` writes.

A POST with many rows writes them in one transaction. `tl` writes them one at a time.

## Why

At the switch, `td` and `th` were still in TypeScript and talked to `tl` over HTTP. `TL_API_URL=http://filcloud:8791/hist` was enough. No line of `td` or `th` changed, and no data moved.

The proof was run on a copy of the real file from the Deck. `tl serve` and `alfred serve` answered 26 read requests the same way, errors included. 26 write requests sent to two copies gave the same answers and the same five tables, row by row. Six episode searches gave the same ids and scores.

The real file has `harness` and `tools` at the end of their tables, because an older `tl` added them later. A new file has them where the schema puts them. The queries always name their columns, so the order does not matter.

A JSON field (`config`, `body`, `probabilities`) must be a string that holds JSON, as in `tl`. An object or a number is refused.

## Cross-references

- [core_alfred_api_speaks_json_cli_prints_text](core_alfred_api_speaks_json_cli_prints_text) — the API
- [memory_tl_work_archive_not_event_log](memory_tl_work_archive_not_event_log) — what the archive holds
