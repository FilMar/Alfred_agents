---
tags: [th, http, api, planned]
sources: [.wiki/th_cli.md, .wiki/log.md]
---

## Decision

The planned `th` HTTP entry point is deliberately not full CLI parity. Routes:

- `POST /run` — always detached (a multi-minute agent run must never block a request); returns `{ id, out, log, status }`.
- `GET /runs?status=&member=&limit=` — runs in progress or recent, scoped to what is on disk in `/tmp`.
- `GET /runs/:id` — status only; `GET /runs/:id/out` and `/log` — content.
- `POST /member`, `GET /member`, `GET /member/:name`, `GET /hats` — member and hat management.

No database for this: `GET /runs` is a glob over `/tmp/th-*.status` plus reading each file; the member filter is free because it is embedded in the filename. Status and output are split into separate GETs so a polling client can check state without pulling large output. Durable history beyond `/tmp` is out of scope — that is `tl`'s job.

`sandbox-exec`, `models`, and member `delete`/`promote`/`--from` are deliberately excluded as local-only conveniences.

## Why

`th run` is a long-running agent execution, not a fast CRUD call — a 1:1 mirror of the CLI would make a sync request out of a multi-minute job. The `/tmp` files already hold everything the API needs, so an index would be one more thing to keep in sync. This revised an earlier DB-backed design the same day it was written (2026-07-23): the files were already there, so the DB added nothing.

## Cross-references

- [th_detached_runs_state_in_tmp](th_detached_runs_state_in_tmp) — the files the API reads
- [memory_tl_unified_event_log](memory_tl_unified_event_log) — durable history, the part the API does not serve
- [style_dual_entrypoint](style_dual_entrypoint) — the pattern this extends to `th`, with an async divergence