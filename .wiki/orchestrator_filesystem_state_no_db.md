---
tags: [orchestrator, filesystem, state, no-db]
sources: [tools/orchestrator/src/catalog.ts, tools/orchestrator/src/queue.ts, tools/orchestrator/src/scheduler.ts]
---

## Decision

No database. The filesystem is the source of truth for both the task catalog and its run instances, at this scale (single user, a few dozen tasks):

- **Catalog** — one JSON file per registered script in `<ORCH_DIR>/registered/`, holding the audit verdict, schedule, `requiresDesktop`. The file's presence *is* the registration; entries start `UNAUDITED`; duplicate names rejected; invalid cron rejected at ingestion with a 400.
- **Queue** — instance files physically moved between `pending/` → `processing/` → `completed/` (or `failed/`). The directory a file sits in *is* its state, not a field inside it. Transitions use `fs.renameSync` — a task is never in two states at once.
- **Recovery** — on startup, `recover()` moves processing orphans back to `pending`.
- **Parse resilience** — every catalog/queue read skips and logs corrupt files instead of throwing.
- **Claim race** — a legitimate claim race (another tick claimed the instance first) is a distinct `InstanceNotFoundError`; any other transition failure is a real fault, logged via `console.error`, never swallowed. A bare `catch {}` once left genuine failures invisible: instances stuck in `pending` with no trace.
- Scheduler: interval loop over the catalog; cron parsed with `croner`; only `verdict === "PASS"` is schedulable; dedup per `(task, slot)` scans all four queue states.

## Why

State you can inspect with `cat`/`ls` needs no reconciliation step: no record can claim "running" for a process that is dead, because state is a physical location, not an assertion. A DB would add a sync job between record and reality for no benefit at this scale — a SQLite proposal was rejected exactly on this ground. Parse resilience is not defensive extra: a crash mid-write will eventually produce a truncated JSON, so a design built on filesystem truth must tolerate its own expected failure mode or it bricks itself on every restart.

## Cross-references

- [orchestrator_minimal_rest_surface](orchestrator_minimal_rest_surface) — the endpoints over this state
- [orchestrator_boot_callback_wake_window](orchestrator_boot_callback_wake_window) — why the wake window is computed from the catalog, not the queue