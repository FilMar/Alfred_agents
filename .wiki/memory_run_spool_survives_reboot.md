---
tags: [memory, th, tl, spool]
sources: [conversation, tools/th/src/archive.ts, tools/th/src/runner.ts]
---

## Decision

The spool of a run the archive could not take lives in `~/.local/state/th/spool` (`$XDG_STATE_HOME/th/spool`), not in `/tmp`. The run's own files — `.out`, `.log`, `.status`, `.pid` — stay in `/tmp`.

Every `th run` and every `th wait` first sends what is waiting there, through `drainSpool`. It never throws, makes no request when the directory is empty, and gives up after the same two seconds a run's own write gets. `th archive-pending` stays, to force it by hand.

A job id is `th-<hat>-<ms>-<four hex>`. Two runs of one hat in the same millisecond used to share every file, and the second spool overwrote the first.

## Why

An unreachable archive is the reason a spool exists. The usual cure for an unreachable server is to reboot something, and `/tmp` is tmpfs: the reboot erases the spool along with the outage. The insurance sat in the building that burns.

The spool used to be drained only by a command nobody remembered to run. A promise of "nothing is lost" that costs a human reminder is not kept, so it now drains on the two commands every delegation goes through. The cost is at most two seconds before a run that lasts minutes.

## What stays open, on purpose

Cut for being minimal, and each one is a bounded loss, not corruption:

- A run killed before its `finally` is never archived.
- The spool is written in one call, not through a temp file: a crash in the middle leaves a file that cannot be parsed.
- A file the archive rejects for good (a 4xx) is retried on every drain and costs one refused request each time. `th archive-pending` prints the warning that names it.
- The drain's deadline bounds how long it is awaited, not the requests it abandons: the process can outlive it by the client's own timeout.

## Cross-references

- [memory_delegated_run_is_a_pi_subtask](memory_delegated_run_is_a_pi_subtask) — the row that gets spooled; its `/tmp/th-<run>.unarchived` path is the one this page replaces
- [th_detached_runs_state_in_tmp](th_detached_runs_state_in_tmp) — the state that does belong in `/tmp`
