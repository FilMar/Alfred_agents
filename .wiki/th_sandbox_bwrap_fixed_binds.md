---
tags: [th, sandbox, security, bwrap]
sources: [tools/th/src/runner.ts, .wiki/th_cli.md, .wiki/architettura.md]
---

## Decision

Every `th run` executes under `bwrap` when it is available. The filesystem is read-only except for a fixed bind profile: `cwd`, `~/.pi`, `~/.bun`, `/tmp`. Two entry points, two guarantees:

- `th run` (and `spawnSandboxed` internally) degrades with a loud warning when bwrap is missing — it never fails silently.
- `th sandbox-exec -- <bin> <args...>` refuses with an explicit error when bwrap is missing. Whoever asks for the sandbox must get the sandbox, not a bare execution.

The same `bwrap` profile is reused by the Raspberry Orchestrator for audited task execution — see [orchestrator_bwrap_task_execution](orchestrator_bwrap_task_execution).

## Why

An audited or trusted task must never run unsandboxed by accident: a missing dependency quietly turning off the perimeter is worse than a loud failure. The degraded path warns on stderr and writes the warning verbatim (`warn: bwrap not available — running WITHOUT sandbox`); the strict path refuses. Same bind profile everywhere so behavior is identical for `th run`, `sandbox-exec`, and orchestrator tasks.

## Cross-references

- [orchestrator_bwrap_task_execution](orchestrator_bwrap_task_execution) — the same sandbox reused for orchestrator tasks
- [th_detached_runs_state_in_tmp](th_detached_runs_state_in_tmp) — where detached runs leave their state