---
tags: [memory, tl, th, schema, subtask]
sources: [conversation, tools/th/src/archive.ts, tools/th/src/runner.ts, .wiki/memory_tl_work_archive_not_event_log.md]
---

## Decision

A `th` run writes its own row in the archive, at the moment it ends, from inside `th`. It is a `subtask`, its `actor` is the hat, and **the run is its own session**, with `harness: "th"`.

- The call sits in one place: the `finally` of `executeSession`, right after `finishRun`. There is no second point where a run ends.
- The write never fails a run. Every error is swallowed to stderr, and the deadline is two seconds, not the ten a normal client waits.
- Writing the same run twice changes nothing: the exchange id is derived from the run id.
- `parent` stays absent. Linking a delegation to the exchange that asked for it needs the caller to pass its own id, and nothing hands `th` that today.

## Why

`th` is the only place where the output text of a run exists. It builds its agent session with `SessionManager.inMemory()`, so no transcript file is ever written, and the run's own files live in `/tmp`: measured on five `out_path` values from `th.db`, none still existed. An importer that runs later finds the cost and the shape of a delegation and none of its content — the same rotation that left 369 notes without a source, one floor down.

So the archive could only ever be filled here, and the deferral this reverses had a reason that expired. The plan held `subtask` rows until Fase 6 so they would be born with `actor = hat` and never be rewritten. The hat is known now, and so is the session, so waiting buys nothing and costs one run's output per delegation.

**A run is its own session** because that is the only answer that needs no information nobody has. A session holds what stays constant for its whole life — a start, an end, a directory, a machine — and a detached run has exactly those four. The alternative, the caller's session, is conceptually right and unavailable: `th` is invoked from a shell command inside someone else's session and is never told which. A single shared session per machine was the third option, and it turns "cost by session" into one bucket.

The scale this was measured against: 373 real runs between May and September, across hats like `carmack-white`, `purho-black` and `fabian-blue`, none of them in the archive before this. Their past is not recoverable and is not worth chasing; from here on every one of them lands.

`harness` gains a third value, which the list was written to allow. `th` writes no transcript, so the name answers "what produced this row" rather than "what wrote the file".

## Cross-references

- [memory_session_names_its_harness](memory_session_names_its_harness) — the column this adds a value to, and the rule that puts it on the session
- [memory_tl_work_archive_not_event_log](memory_tl_work_archive_not_event_log) — the schema, and why `subtask` exists at all
- [th_detached_runs_state_in_tmp](th_detached_runs_state_in_tmp) — the state that disappears, which is why this cannot be done later
