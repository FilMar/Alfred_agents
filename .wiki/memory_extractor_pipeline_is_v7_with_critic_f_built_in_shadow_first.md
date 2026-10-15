---
tags: [memory, distiller, tl, tb, ti, pipeline, critic]
sources: [conversation, spikes/2026-10-02-extractor-f/main.py (deleted), spikes/2026-10-01-extraction-hats/main.py (deleted), spikes/2026-10-01-critic-bench/main.py (deleted)]
replaces: [memory_distiller_is_a_pipeline_of_small_calls_with_no_tools]
---

## Decision

The extractor is the v7 pipeline of the extraction spike, with critic F in place of the v7 council. It is a script, not an agent: the LLM never calls a tool, and each call answers with JSON only. The model writes text and picks from fixed sets. It never writes an id. Calls go through `pi-ai`, one after another. It is built in shadow first: it reads `tb` and `ti`, writes nothing to them, and writes every candidate to `extractions`.

- **0 (code).** Read the pending exchanges of one session. Set the noise apart.
- **0b (LLM, blue hat, once per session).** Split into episodes, each with a summary of how it ended. Code checks the cover: every exchange, in order, no gap. The split is not deterministic (one session gave 4 episodes, then 9), so episodes are not saved.
- **1 (LLM, white hat, per exchange).** Notes and rules from the target only, with the episode and the session map as context. The shape of each item is checked first. Then code checks drop a candidate for an empty field, a bad kind, no known tag, or a quote not in the target. It also drops one that is not Italian, has a project identifier, or breaks purity. A rule quote must come from the user, with one rule per quote.
- **1b (LLM, per candidate).** Critic F: [memory_critic_is_f_textbook_as_a_test_and_no_record_question](memory_critic_is_f_textbook_as_a_test_and_no_record_question).
- **2a (code).** Top 5 neighbours from `tb` or `ti`. Read only, no hit, no cosine cut.
- **2b (LLM, black hat, per exchange).** A note is `new`, `duplicate`, `extends` or `contradicts`. A rule is `new`, `duplicate` or `append`. Code checks that `of` is a given id. An `extends` with nothing in `adds` becomes `duplicate`. One whose `adds` is not a new idea becomes `ref_only`, which saves nothing.
- **2c (code).** Shadow: no save. Active: `tb save`, `ti add`, a ref, `append-do`, right away. New items join the session list, so later exchanges see them as neighbours.
- **3 (later).** [memory_bridges_by_shape_are_judged_by_reading](memory_bridges_by_shape_are_judged_by_reading).

The recorder writes one `extractions` row per candidate, once per exchange, so a crash keeps the rows already written. At the end of a session in active mode, `distilled` is set. What is config and what is code: [memory_extractor_is_data_immutable_config_rows_in_tl](memory_extractor_is_data_immutable_config_rows_in_tl).

## Why

**F works.** Same 6 sessions as v7. The council dropped 36 candidates at the critic and saved 138, with 2.7M tokens in. F dropped 91 on the same candidates, saved 103 with 1.1M tokens, and one call per candidate instead of three. A fresh run saved 90. Read by hand, they are mostly general and carry a mechanism. About 10 are weak, one in nine, and decay has to clean them. No invented or denied claim was found.

**Episodes as context, the exchange as the unit.** A lesson often spans several exchanges: a wrong guess, a denial, then the real cause. The session map gives every call the end of the story.

**Shadow first.** The first real runs fill `extractions` with the probabilities, so thresholds can move before anything reaches `tb` or `ti`.

Open: the same idea was saved twice from two exchanges of one session. Phase 1 varies between runs ("unconfirmed claim" fired 18 times on the v7 candidates and 5 on fresh ones), so two critics are compared only on frozen candidates.

## Cross-references

- [memory_extractor_calls_go_through_pi_ai_with_reasoning_low](memory_extractor_calls_go_through_pi_ai_with_reasoning_low) — how every call reaches the model
- [memory_td_is_its_own_tool](memory_td_is_its_own_tool) — where the pipeline lives
- [memory_hindsight_not_adopted_its_shape_is_copied](memory_hindsight_not_adopted_its_shape_is_copied) — where the shape comes from
- [memory_distillation_stays_manual_for_now](memory_distillation_stays_manual_for_now) — manual distillation goes on until a trigger is chosen
