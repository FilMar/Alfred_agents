---
tags: [memory, distiller, hist, rules, pipeline, critic]
sources: [conversation, tools/alfred/src/distill/rule.rs, tools/alfred/src/distill/novelty.rs, tools/alfred/src/distill/save.rs, tools/alfred/src/distill/session_run.rs, spikes/2026-10-02-extractor-f/main.py (deleted), spikes/2026-10-01-extraction-hats/main.py (deleted), spikes/2026-10-01-critic-bench/main.py (deleted)]
replaces: [memory_distiller_is_a_pipeline_of_small_calls_with_no_tools]
---

## Decision

The extractor is the v7 pipeline of the extraction spike, with critic F in place of the v7 council. It is a script, not an agent: the LLM never calls a tool, and each call answers with JSON only. The model writes text and picks from fixed sets. It never writes an id. Calls go to Ollama, one after another. It was built in shadow first: it reads the rules, writes nothing to them, and writes every candidate to `extractions`. Since row 4 it extracts rules only.

- **0 (code).** Read the pending exchanges of one session. Set the noise apart.
- **0b (LLM, blue hat, once per session).** Split into episodes, each with a summary of how it ended. Code checks the cover: every exchange, in order, no gap. The split is not deterministic (one session gave 4 episodes, then 9). Only active mode writes the episodes to the episode index.
- **1 (LLM, white hat, per exchange).** Rules from the target only, with the episode and the session map as context. The shape of each item is checked first. Then code checks drop a candidate with an empty `if` or `do`, or with no known tag. They also drop a quote that is not in the user text of the target, and text that is not Italian. One rule per quote.
- **1b (LLM, per candidate).** Critic F: [memory_critic_is_f_textbook_as_a_test_and_no_record_question](memory_critic_is_f_textbook_as_a_test_and_no_record_question).
- **2a (code).** Top 5 neighbours from the rules. Read only, no hit, no cosine cut.
- **2b (LLM, black hat, per exchange).** A rule is `new`, `duplicate` or `append`. Code checks that `of` is a given id.
- **2c (code).** Shadow: no save. Active: add a rule or append a `do`, right away. New items join the session list, so later exchanges see them as neighbours.
- **3 (later).** memory_bridges_by_shape_are_judged_by_reading.

The recorder writes one `extractions` row per candidate, once per exchange, so a crash keeps the rows already written. At the end of a session in active mode, `distilled` is set. What is config and what is code: [memory_extractor_is_data_immutable_config_rows_in_tl](memory_extractor_is_data_immutable_config_rows_in_tl).

## Why

**F works.** Same 6 sessions as v7. The council dropped 36 candidates at the critic and saved 138, with 2.7M tokens in. F dropped 91 on the same candidates, saved 103 with 1.1M tokens, and one call per candidate instead of three. A fresh run saved 90. Read by hand, they are mostly general and carry a mechanism. About 10 are weak, one in nine, and decay has to clean them. No invented or denied claim was found.

**Episodes as context, the exchange as the unit.** A lesson often spans several exchanges: a wrong guess, a denial, then the real cause. The session map gives every call the end of the story.

**Shadow first.** The first real runs fill `extractions` with the probabilities, so thresholds can move before anything reaches the rules.

Open: the same idea was saved twice from two exchanges of one session. Phase 1 varies between runs ("unconfirmed claim" fired 18 times on the v7 candidates and 5 on fresh ones), so two critics are compared only on frozen candidates.

## Cross-references

- [memory_extractor_calls_go_to_ollama_by_reqwest](memory_extractor_calls_go_to_ollama_by_reqwest) — how every call reaches the model
- [memory_distill_runs_on_the_server_with_row_4](memory_distill_runs_on_the_server_with_row_4) — where the pipeline lives
- [memory_hindsight_not_adopted_its_shape_is_copied](memory_hindsight_not_adopted_its_shape_is_copied) — where the shape comes from
- [memory_distill_starts_on_ingest_by_threshold](memory_distill_starts_on_ingest_by_threshold) — the trigger is an ingest past a threshold
