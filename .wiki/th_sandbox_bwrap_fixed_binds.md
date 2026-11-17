---
tags: [th, alfred, command, sandbox, security, bwrap]
sources: [tools/alfred/src/command/sandbox.rs, tools/th/src/runner.ts@last-typescript, .wiki/th_cli.md@787028b, .wiki/architettura.md@f87afd9]
---

## Decision

Every `alfred command run` starts pi under `bwrap` when it is available. The filesystem is read-only except for a fixed bind profile: `cwd`, `~/.pi`, `/tmp`. `~/.bun` left with `th`.

- When bwrap is missing, the run degrades with a loud warning and starts pi bare. It never fails silently.
- `th` also had a strict entry, `th sandbox-exec`, that refused to run without bwrap. `alfred command` has no such entry.


## Why

An audited or trusted task must never run unsandboxed by accident: a missing dependency quietly turning off the perimeter is worse than a loud failure. The degraded path warns on stderr with the same words as `th`: `warn: bwrap not available — running WITHOUT sandbox`.

## Cross-references

- `orchestrator_bwrap_task_execution@c194447` — the same sandbox reused for orchestrator tasks
- [th_detached_runs_state_in_tmp](th_detached_runs_state_in_tmp) — where detached runs leave their state
- [core_alfred_command_runs_pi_as_a_child_in_bwrap](core_alfred_command_runs_pi_as_a_child_in_bwrap) — why only pi runs inside bwrap