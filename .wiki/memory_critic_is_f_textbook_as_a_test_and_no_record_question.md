---
tags: [memory, distiller, critic, selectivity]
sources: [conversation, spikes/2026-10-01-critic-bench/main.py]
replaces: [memory_critic_is_one_guard_with_probabilities]
---

## Decision

The critic to build is variant F of the critic bench. It keeps the frame of variant E: one judge (glm-5.3-flash, temperature 0.1), the guard role, probabilities from 0.0 to 1.0, and one signal drops the candidate. Two things change.

- **The textbook question is a test, with one example each way.**
  > a good manual or Wikipedia page on the topic already says this. Test: would someone who knows the topic learn nothing new? Yes if the note only defines or describes a known term, tool, method or feature. No if it adds a limit, a failure, a trade-off or a surprise seen in practice. Yes: "La cosine similarity misura l'angolo tra due vettori." No: "Con soglia cosine 0.95, due note che dicono il contrario sembrano duplicate."
- **The question set shrinks.** `is_record_of_what_was_done` and `explains_mechanism` are out.

The questions are now: `is_textbook_definition` (threshold 0.6), `is_agent_unconfirmed_claim`, `is_project_detail` and `is_about_the_agent` (0.4) for a note, and `is_user_rejection` (fires below 0.4) for a rule.

Thresholds are chosen with a cost, not with the count of right answers: a bad note kept costs 1, a good note dropped costs 3. A bad note that passes is removed later by decay. A good note that is dropped is gone.

## Why

Same bench as before: 75 frozen candidates, labels by a separate agent, 35 of them low confidence.

| critic | right of 75 | bad kept | good dropped | good dropped, high confidence |
|---|---|---|---|---|
| E, all at 0.4 | 53 | 21 | 1 | 0 |
| E, one threshold per question | 53 | 22 | 0 | 0 |
| **F, textbook 0.6, the rest 0.4** | **57** | **16** | **2** | **0** |
| F2, textbook widened to common practice | 54 to 62 | 3 to 4 | 9 to 18 | 7 to 12 |

**The wording was the problem, not the threshold.** The probabilities of E were already stored, so one threshold per question cost no calls. It gained nothing.

**A test with examples works.** As a test, the textbook question caught 14 of 16 textbook notes. E caught 5. It now fires on some good notes too, so its threshold moves up to 0.6.

**The record question cannot work.** As a test, it caught 0 of 15. The cause is upstream: the extractor already rewrites every note in general words, so no note looks like a log. The notes labelled "record" are really a definition, a project detail or generic advice. The other questions already catch the first two.

**"Common practice" is too wide.** F2 asked whether a senior colleague already says this. To the judge, almost every note looked common, and it dropped 9 to 18 good notes. This is the error we least accept.

The two good notes F drops are borderline, and both have low-confidence labels. Thresholds tuned on 75 items are a direction, not a number. So the simple rule (one threshold moved) wins over the tuned one, which gained one more note.

The principle of the replaced decisions still holds. No model is asked whether a note is worth keeping. A note enters as `provvisoria`, and use decides. With F, about 16 of 75 bad candidates still pass, so decay is now required, not optional.

## Cross-references

- [memory_distiller_is_a_pipeline_of_small_calls_with_no_tools](memory_distiller_is_a_pipeline_of_small_calls_with_no_tools) — where the critic sits (phase 1b)
- [memory_extractor_is_data_immutable_config_rows_in_tl](memory_extractor_is_data_immutable_config_rows_in_tl) — the questions and thresholds live in the extractor config, not in code
- [memory_human_gate_is_the_bottleneck](memory_human_gate_is_the_bottleneck) — use, not reading, promotes a note
- [.memory_critic_is_one_guard_with_probabilities](.memory_critic_is_one_guard_with_probabilities) — the replaced decision (variant E)
