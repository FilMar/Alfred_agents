---
tags: [memory, distiller, critic, selectivity]
sources: [conversation, spikes/2026-10-01-critic-bench/main.py (deleted)]
replaces: [memory_critic_is_one_guard_with_probabilities]
---

## Decision

The critic to build is variant F of the critic bench. It keeps the frame of variant E: one judge (glm-5.3-flash, temperature 0.1), the guard role, probabilities from 0.0 to 1.0, and one signal drops the candidate. Two things change.

- **The textbook question is a test, with one example each way.** Would someone who knows the topic learn nothing new? Yes if the note only defines or describes a known term, tool, method or feature. No if it adds a limit, a failure, a trade-off or a surprise seen in practice.
- **The question set shrinks.** `is_record_of_what_was_done` and `explains_mechanism` are out. The questions are `is_textbook_definition` (threshold 0.6), `is_agent_unconfirmed_claim`, `is_project_detail` and `is_about_the_agent` (0.4) for a note, and `is_user_rejection` (fires below 0.4) for a rule.

Thresholds follow a cost: a bad note kept costs 1, a good note dropped costs 3. A bad note that passes is removed later by decay. A good note that is dropped is gone.

## Why

Bench: 75 frozen candidates, labels by a separate agent. E with one threshold got 53 right, 21 bad kept, 1 good dropped. F got 57 right, 16 bad kept, 2 good dropped. F2, with the textbook question widened to common practice, dropped 9 to 18 good notes.

**The wording was the problem, not the threshold.** As a test with examples, the textbook question caught 14 of 16 textbook notes. E caught 5.

**The record question cannot work.** It caught 0 of 15. The extractor already rewrites every note in general words, so no note looks like a log.

**"Common practice" is too wide.** To the judge almost every note looked common. Dropping a good note is the error we least accept.

Thresholds tuned on 75 items are a direction, not a number, so the simple rule wins. About 16 of 75 bad candidates still pass, so decay by `trust` is required, not optional.

## Cross-references

- [memory_extractor_pipeline_is_v7_with_critic_f_built_in_shadow_first](memory_extractor_pipeline_is_v7_with_critic_f_built_in_shadow_first) — where the critic sits (phase 1b)
- [memory_extractor_is_data_immutable_config_rows_in_tl](memory_extractor_is_data_immutable_config_rows_in_tl) — the questions and thresholds live in the extractor config, not in code
- [memory_human_gate_is_the_bottleneck](memory_human_gate_is_the_bottleneck) — use, not reading, promotes a note
- `memory_critic_is_one_guard_with_probabilities@f99ead0` — the replaced decision (variant E)
