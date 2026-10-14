---
tags: [memory, distiller, tl, platone]
sources: [conversation, ROADMAP_MEMORIA.md@7edd8d8]
---

## Decision

Distillation is started by hand. No timer runs it. The user runs `td distill --active`, or runs `platone` on a window of `tl pending`. Both empty the queue the same way: every exchange that was read leaves `tl pending`, with notes or without.

An automatic run waits for a trigger. None is chosen. A reminder at session start, that prints the size of `tl pending`, is the missing piece of the manual flow.

## Why

An automatic service adds cost and risk and no new capability while the manual flow works. These problems came up when it was first designed on `th run`, and `td` has solved them:

- **It fed itself.** `th run` archives every finished run as a `subtask` row, and that row entered `tl pending`. `td` calls `pi-ai` and not `th`, so it archives no runs of its own.
- **Fixed cost per run.** A `th run` carries about 9k input tokens of system prompt. A call through `pi-ai` has none. See [memory_extractor_calls_go_through_pi_ai_with_reasoning_low](memory_extractor_calls_go_through_pi_ai_with_reasoning_low).
- **The timeout bug.** `th --timeout` kept the process alive. It is fixed: [th_timeout_timer_is_cleared_so_a_run_exits_when_its_prompt_ends](th_timeout_timer_is_cleared_so_a_run_exits_when_its_prompt_ends).

What is left is only the trigger: a timer, the end of a session, or a count of pending exchanges. The manual flow stays until one is chosen. After that, `platone` can retire: [skill_platone_may_retire_when_td_distill_runs_on_a_timer_and_its_quality_rules_must_outlive_it](skill_platone_may_retire_when_td_distill_runs_on_a_timer_and_its_quality_rules_must_outlive_it).

## Cross-references

- `memory_distiller_th_run_would_use_gemma4@5498f35` — the model to use when it does run
- [memory_delegated_run_is_a_pi_subtask](memory_delegated_run_is_a_pi_subtask) — why `th` rows enter `tl`
- [memory_tl_work_archive_not_event_log](memory_tl_work_archive_not_event_log) — the schema, and `distilled` as the only mutable field
- [memory_human_gate_is_the_bottleneck](memory_human_gate_is_the_bottleneck) — why the human step is worth removing later
