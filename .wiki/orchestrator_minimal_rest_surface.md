---
tags: [orchestrator, rest, api]
sources: [tools/orchestrator/src/server.ts, tools/orchestrator/src/main.ts, .wiki/orchestrator_overview.md]
---

## Decision

The Rasp exposes a minimal REST service — the entire network entry point. There is no other ingestion path: no filesystem drop, no scp-based submission, no per-device SSH write access. Four endpoints:

- `add_task` — submits a script for audit. Registered in the catalog only on `PASS` (or `WARNING` confirmed by the user); discarded on `FAIL`.
- `i_wake` — called by the Desktop's systemd service at boot; triggers the batch dispatch of every task due within the wake window.
- `list_tasks` — read-only catalog.
- `get_task_status <id>` — locates a run instance; the directory the file sits in is the status.

The internal scheduler loop is not an endpoint. Ad-hoc execution is Matrix-only — see [orchestrator_run_task_matrix_only](orchestrator_run_task_matrix_only).

## Why

One entry point means one perimeter to guard and one audit gate that cannot be bypassed. Every parallel path (a drop directory, an scp key, an extra endpoint) is a second attack surface to defend and a second state source to reconcile. `i_wake` stays on REST deliberately: it dispatches only tasks already due by schedule, so its maximum abuse damage is advancing an execution, not creating one — a different risk category from ad-hoc execution.

## Cross-references

- [orchestrator_run_task_matrix_only](orchestrator_run_task_matrix_only) — why ad-hoc execution never joined this surface
- [orchestrator_adversarial_audit_static](orchestrator_adversarial_audit_static) — the gate `add_task` feeds
- [orchestrator_filesystem_state_no_db](orchestrator_filesystem_state_no_db) — what the endpoints read and write