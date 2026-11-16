---
tags: [memory, distiller, alfred, api]
sources: [conversation, spec.json@2dcf7a9, review.json@2dcf7a9, tools/alfred/src/distill/runner.rs]
---

## Decision

`POST /distill` does not wait for the run. It checks the options and the extractor row at once: a bad option is 400, a missing row is 404, a run already going is 409. Then `Runner::start()` runs the sessions in a tokio task and answers 202 with the `Progress`.

`GET /distill/status` answers `{running, last}`: the `Progress` of the run going, and the `RunReport` of the last run that ended.

The state lives in memory, in the `Runner`. Its lock allows one run at a time. `Run::all()` hands each session report to the `Runner` through `on_session`, and the `Runner` moves the `Progress` on.

## Why

A run is tens of model calls. A blocking request holds a connection for minutes, and a client that drops it cannot tell whether the run goes on. The trigger on ingest already runs in a task, so the route and the trigger now share one start.

The user proposed a file or the database for the state. What must last is already written by the run: the `extractions` rows of the run, `distilled` on the exchanges, the episodes. A run going dies with the process, so a saved state would say "running" forever after a crash. After a restart only `last` is lost.

## Cross-references

- [memory_distill_starts_on_ingest_by_threshold](memory_distill_starts_on_ingest_by_threshold) — the trigger reads the failed sessions from `last`
- [memory_distill_cli_is_a_client_of_the_server](memory_distill_cli_is_a_client_of_the_server) — the CLI that reads the status
