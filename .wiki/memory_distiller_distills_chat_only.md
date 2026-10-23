---
tags: [memory, distiller, td, session, noise, subtask, ritchie]
sources: [tools/td/src/session.ts, tools/td/src/distiller.ts, skills/ritchie/scripts/th_write.sh]
replaces: [memory_td_session_reader_drops_only_task_notifications_and_api_errors_under_a_cap_of_1000@c6b021c]
---

## Decision

The distiller reads `chat` only. `Turn.noise()` classifies a `kind: subtask` exchange as `delegated`, in the first branch: it wins over a task notification. The other noise classes and the read cap of 1000 are unchanged. A delegated turn is set apart like any noise. It leaves `turns`, the `earlier` context and the episode timeline, and the close of a session marks it `distilled` with the rest.

A session whose exchanges are all noise takes the else branch of the empty-session skip in `distillAll`: `closeExchanges` on the noise left, no model call, no episode, no report. The pending queue drains and the `distill.sh` gate at 50 stays honest. Shadow mode still closes nothing.

`ritchie`'s `th_write.sh` drops `--no-archive`: the test run and the body run file themselves in `tl` again, as the subtask rows they are.

## Why

A subtask row is conservation, not knowledge. The run is the only witness of itself ([memory_delegated_run_is_a_pi_subtask]), and what it produced of value re-enters where a human reads it: the hand-back, the synthesis, the review. That chat copy is the one distilled. Distilling the machine's work would open a second, worse channel at machine rate.

The replaced page said "subtasks stay, they are work done in the session". Four debate runs were already marked distilled by hand for this reason, with the fixed time `1970-01-01` ([memory_distiller_has_no_personal_data_filter]): little to remember. This automates the class instead of the instance. The alternative — `th` writing `distilled` at archive time — would put the distiller's state in another tool's hand and make "processed" mean two things.

## Cross-references

- [memory_delegated_run_is_a_pi_subtask](memory_delegated_run_is_a_pi_subtask) — the row, and why only th can write it
- [memory_distiller_has_no_personal_data_filter](memory_distiller_has_no_personal_data_filter) — the hand-marked precedent of this class
- [memory_tl_work_archive_not_event_log](memory_tl_work_archive_not_event_log) — `distilled` is the one mutable field, bookkeeping of this pipeline