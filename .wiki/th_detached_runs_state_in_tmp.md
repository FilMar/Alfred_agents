---
tags: [th, detach, tmp, state]
sources: [tools/th/src/runner.ts, tools/th/src/detached-runner.ts, .wiki/th_cli.md]
---

## Decision

A detached `th run` keeps its state in files under `/tmp`, named `th-<member>-<ts>.*`: `.out` (agent output), `.log` (thinking + tool calls), `.status` (`running` → `done` / `error: ...` / `timeout`), `.pid`. No database for in-progress state — the file set is the state.

## Why

In-progress state is ephemeral and per-run; files match its lifetime exactly. `th wait` and the planned HTTP API read the same files — see [th_http_api_scoped_no_db](th_http_api_scoped_no_db).

## Known issue

Silent death mid-run, observed twice on 2026-07-21, root cause unconfirmed: a `--detach` run reported `done` / exit 0 with an empty or truncated `.out` while the `.log` showed the agent stopping mid-reasoning. Until root-caused: treat any suspiciously short `.out` as suspect and check the `.log` tail before trusting it, especially for runs that write files. One incident wiped the old wiki log with a broken shell one-liner before dying, undetected until manually inspected.

## Cross-references

- [th_http_api_scoped_no_db](th_http_api_scoped_no_db) — the HTTP API reads these same files
- [memory_tl_unified_event_log](memory_tl_unified_event_log) — durable run history moves to `tl`, not these files