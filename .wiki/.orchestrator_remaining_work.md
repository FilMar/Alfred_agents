---
tags: [orchestrator, roadmap, hardening, design-target]
sources: [.wiki/roadmap_orchestrator.md, tests/orchestrator.test.ts, tests/orchestrator.phase2.test.ts]
---

## Decision

How to finish the Raspberry Orchestrator. Phases 1-2 are implemented and accepted (58 tests green: catalog, FS-queue, scheduler, REST, WoL/wake/dispatch, injectable-deps data pipeline). Paused 2026-07-21 — no real recurring tasks justify finishing yet; priority went to the memory stack. Status note, not a design reversal.

**Phase 3 — remaining:**
- Matrix Bridge: bot as bidirectional client (notifications, `list_tasks`, `run_task`, manual wake); audit integration.
- Result Consolidation: capture stdout/stderr per task, attach a log to `completed/`/`failed/`.
- Access Control Setup: configuration only (Tailscale ACL tags), no auth code.

**Phase 4 — hardening:**
- Crash-recovery test: force-kill during a task, verify FS-queue resume.
- Resource limits: `timeoutSec` metadata to kill runaway scripts.
- Log rotation for `completed/` — prevents SSD fill; also the mitigation for the O(N) per-tick queue scans (not a DB: that would contradict the filesystem-as-truth pillar).
- Scheduler per-task isolation: wrap `tick()`'s per-task body in try/catch — closes the on-disk vector of a corrupted catalog entry crashing the process.
- Request body size limit on `add_task` — unbounded `source` is a memory/disk vector, hardening-tier.
- Pre-existing `tools/th/src/db.ts` type error exposed by the orchestrator importing `spawnSandboxed` — one-line fix in `th`.

**Known bug, reproduced 2026-07-20, deferred**: `dueSlot()` uses `cron.previousRuns(1, now)`; a 5-field cron has no year field, so scheduling a one-shot absolute time *today* finds last year's occurrence as "due now" and runs it immediately — then again at the real slot (dedup is per exact `taskName + scheduledFor`). Harmless for recurring patterns. **Do not fix by reusing cron for one-shot tasks** — a future one-shot need needs a separate `runAt: ISO timestamp` field, not a cron expression.

**Future ideas (evaluation only)**: active heartbeat (`POST /task_heartbeat/<id>`, reusing the `i_wake` pattern); event-driven task activation routed through **Matrix, not NATS** (decided 2026-07-20: personal scale, low volume, no fan-out need — NATS would be a second infrastructure to run and secure; reconsider only with a genuine multi-consumer requirement).

## Why

Phase 1/2 went through full adversarial review cycles (builder → parallel adversarial review → synthesis → fix round → probe re-verification), so the remaining work is hardening, not redesign. The known-bug list is recorded, not fixed, because the only production use so far is recurring schedules — fixing an unused edge case now would be speculation, the same log-first principle the memory stack follows.

## Cross-references

- [orchestrator_adversarial_audit_static](orchestrator_adversarial_audit_static) — Phase 3 audit integration
- [orchestrator_filesystem_state_no_db](orchestrator_filesystem_state_no_db) — the pillar the hardening items respect
- [orchestrator_matrix_chat_relay](.orchestrator_matrix_chat_relay) — the chat-bridge history