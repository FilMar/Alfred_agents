---
tags: [memory, tl, th, schema, subtask]
sources: [conversation, tools/alfred/src/command/archive.rs, tools/alfred/src/command/spool.rs, tools/alfred/src/command/spec.rs, tools/th/src/archive.ts@last-typescript, tools/th/src/runner.ts@last-typescript]
replaces: [memory_th_run_files_its_own_row]
---

## Decision

An `alfred command run` writes its own rows in the archive, at the moment it ends, from inside `alfred command`. The row is:

- `kind: "subtask"` — this is what marks a delegation, and the only thing that does.
- `actor` — the hat, or the skill when the run wears no hat.
- its own session, because a detached run has a start, an end, a directory and a machine, which is all `sessions` holds. Nothing hands `alfred command` the exchange that asked for it, so `parent` stays absent.
- `harness: "pi"`. **Not `th`.**
- `meta` — status, `finished_at`, `duration_s`, the timeout that was set, the thinking level, the forced skill, and the cost when the model charged for it.

The call sits in one place: `archive()` in `tools/alfred/src/command/archive.rs`, right after the run is finished. The write never fails a run. Errors go to stderr, and the deadline is two seconds. When the archive cannot be reached, the rows are spooled for the next `alfred command run` or `alfred command wait` to send ([memory_run_spool_survives_reboot](memory_run_spool_survives_reboot) says where the spool lives). Writing the same run twice changes nothing: the exchange id is derived from the run id.

## Why

`alfred command` is the only place where the output text of a run exists. It starts pi with `--no-session`, so no transcript file is ever written. The run's own files live in `/tmp`. Measured on five `out_path` values from the old `th.db`, none still existed. An importer that runs later finds the cost and the shape of a delegation, and none of its content. It is the same rotation that left 369 notes without a source, one floor down. So the archive could only ever be filled here.

**The harness is `pi` because the harness is the loop.** The harness is the layer that reads the model's output. It intercepts the tool calls, runs them and feeds the results back. For a delegated run that layer is pi's: the pi child process and its tools. `alfred command` configures it and starts it. The code shows it. `rows()` reads the messages of a run with `Harness::Pi`. `alfred hist ingest` uses the same reader for a pi session, because these are pi messages too.

Calling it `th` was a third value in a list of two, and it bought nothing: `kind: "subtask"` already answers "was this delegated", and `actor` answers "to what". It also cost something immediately. The live archive refused the first real run with `session.harness is not claude or pi: th`, because a validated store does exactly that with a name it does not know. Removing the value made the spooled row go through with no deployment at all.

What is lost is small and recoverable: at session level, an interactive pi session and a delegated one now look alike, and telling them apart means asking the exchange. That is a real question about a real field — is its exchange a `subtask` — and not a label invented to avoid the join. The session of a run always holds exactly one exchange, so the join always resolves.

## Cross-references

- [memory_session_names_its_harness](memory_session_names_its_harness) — the column, and the rule that puts a constant fact on the session
- [agents_hats_replace_members](agents_hats_replace_members) — why the actor is a hat
- [agents_skill_forced_not_offered](agents_skill_forced_not_offered) — where `meta.skill` comes from
- [th_detached_runs_state_in_tmp](th_detached_runs_state_in_tmp) — the state that disappears, which is why this cannot be done later
