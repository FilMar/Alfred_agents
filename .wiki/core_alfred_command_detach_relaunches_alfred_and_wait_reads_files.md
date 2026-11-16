---
tags: [core, alfred, command, detach, wait]
sources: [conversation, spec.json@d6217bc, tools/alfred/src/command/detach.rs, tools/alfred/src/command/wait.rs, tools/th/src/detached-runner.ts]
---

## Decision

`run --detach` writes `running` to the `.status` and starts alfred again, in a new process group, with no stdio. The child gets the same arguments, minus `--detach` and plus a hidden `--job <base>`. With `--job`, the run uses those paths and archives at the end like a foreground run. The parent writes the `.pid` and prints `{pid, out, log, status}` as pretty JSON, like `th`.

`wait <status...> --timeout <s>` (default 600) reads the files every 2 seconds. It stops when no job is `running` or the timeout passes. It prints one `{statusPath, status, ok}` per path, in order. It exits with 1 if any `ok` is false, and the JSON still prints. A job is declared dead only when two things hold: its `.out` has not changed for 60 seconds, and its pid is gone from `/proc`. A missing `.pid` counts as alive. A `.status` that cannot be read is `missing`, and it settles at once.

## Why

**One binary, no second runner.** `th` had a separate script for the detached side. With `--job`, the child is the same code path as a foreground run.

**The files are the state.** `wait` reads, never writes. The `.status` has one owner, the run. `debate.sh` reads `.status` and `.out` from the JSON, so the format stays the same as `th`.

**A live job is never called dead.** A slow model can be silent for a long time. The `.out` alone cannot tell slow from dead, so the pid must be gone too. Without a `.pid` there is no proof, so the job stays alive until the timeout.

## Cross-references

- [th_detached_runs_state_in_tmp](th_detached_runs_state_in_tmp) — the file set, now named `alfred-*`
- [core_alfred_command_files_each_run_in_hist_with_a_spool](core_alfred_command_files_each_run_in_hist_with_a_spool) — what the child does at the end
