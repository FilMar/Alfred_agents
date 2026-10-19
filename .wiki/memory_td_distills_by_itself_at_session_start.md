---
tags: [memory, distiller, td, trigger, hook]
sources: [SPEC.md@cd6404b, REVIEW.md@cd6404b, extensions/tb_refine/distill.sh, extensions/tb_refine/claude.sh, extensions/tb_refine/pi.ts, conversation]
replaces: [memory_distillation_stays_manual_for_now@d6529d6]
---

## Decision

The start of a session runs the distiller. The Claude hook `SessionStart` and the pi event `session_start` start `extensions/tb_refine/distill.sh`, detached and silent, next to `tb refine`. The start never waits and never fails because of it.

The script does four things:

- It takes a lock with `flock`. If another distiller holds it, the script writes one line to the log and ends.
- It asks `tl pending --limit 50`. Fewer than 50 rows means it ends and writes nothing.
- It runs `td distill --active --max-saved 100`.
- It writes a line at the start and a line at the end, with the exit code, to `~/.local/state/alfredo/td-distill.log`.

There is no timer and no service. The user can still run `td distill` by hand, or `platone` on a window of `tl pending`. Both empty the queue the same way.

## Why

The manual flow waited for a trigger. The problems of an automatic run were solved earlier. `td` calls `pi-ai` and not `th`. So it archives no run of its own and carries no fixed prompt cost. It has no timeout bug. A count of the queue at the start of a session is the simplest trigger left. It needs no daemon and no schedule.

The lock is a kernel lock on an open file, not a file that must be deleted. When the process dies, or the PC is switched off, the kernel frees it. A pacman-style lock file would block every later run until someone deleted it. A run that was stopped half way is safe: each session closes by itself, and what was not read stays in the queue.

Known limits:

- Only the PC runs it. The embedding model is local, and the Rasp has no Ollama. A job that survives a switched-off PC needs that first.
- The script is bash with no test in the repo. It was tried on stubs of `tl` and `bun`, and the pi extension was not tried in a real pi session.
- The session cap is per run. A session that comes back can save more items.
- A call of `td` to the model has no timeout.

## Cross-references

- [memory_td_episodes_are_built_from_the_whole_session](memory_td_episodes_are_built_from_the_whole_session) — why a returning session is safe to distill
- [memory_td_max_saved_caps_the_writes_of_one_run_and_a_capped_session_stays_pending](memory_td_max_saved_caps_the_writes_of_one_run_and_a_capped_session_stays_pending) — the cap of 100
- [skill_platone_may_retire_when_td_distill_runs_on_a_timer_and_its_quality_rules_must_outlive_it](skill_platone_may_retire_when_td_distill_runs_on_a_timer_and_its_quality_rules_must_outlive_it) — platone, once the run is trusted
