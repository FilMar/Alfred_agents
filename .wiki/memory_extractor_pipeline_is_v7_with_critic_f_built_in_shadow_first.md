---
tags: [memory, distiller, tl, tb, ti, pipeline, critic]
sources: [conversation, spikes/2026-10-02-extractor-f/main.py, spikes/2026-10-01-extraction-hats/main.py, spikes/2026-10-01-critic-bench/main.py]
replaces: [memory_distiller_is_a_pipeline_of_small_calls_with_no_tools]
---

## Decision

The extractor to build is the v7 pipeline of the extraction spike, with critic F in place of the v7 council. It is a script, not an agent. The LLM never calls a tool, and each call answers with JSON only. The calls go straight to the Ollama API with `glm-5.3-flash`, one after another.

It is built in shadow first. In shadow it reads `tb` and `ti` but writes nothing to them, and it writes every candidate to `extractions`.

| phase | who | in | out |
|---|---|---|---|
| 0 | code | the `tl pending` exchanges of one session | the exchanges minus noise: ack, task notification, harness error |
| 0b | LLM, 1 per session, blue hat | the numbered list of exchanges | episodes `{from, to, summary}`; the summary says how the episode ended. Code checks they cover every exchange, in order |
| 1 | LLM, 1 per exchange, white hat | the target exchange; its episode and the session map as context; the tag vocabulary | notes `{what, why, kind, tags, contexts[2], quote}`, rules `{if, do, tags, quote}`, from the target only |
| 1 | code | the candidates | drops: empty field, bad kind, no valid tag, contexts, quote not in the target, not Italian, project identifier, purity; rule quote not from the user; one quote, one rule |
| 1b | LLM, 1 per candidate | the session map, the episode, the target, one candidate | critic F: one probability per question, see [memory_critic_is_f_textbook_as_a_test_and_no_record_question](memory_critic_is_f_textbook_as_a_test_and_no_record_question) |
| 2a | code | each candidate left | the top 5 neighbours from `tb search` or `ti search` |
| 2b | LLM, 1 per exchange, black hat | the candidates, their neighbours, the items saved earlier in the session, integer ids | note: `new`, `duplicate`, `extends`, `contradicts`; rule: `new`, `duplicate`, `append` |
| 2b | code | the verdicts | `of` must be a given id. `extends` with nothing in `adds` becomes `duplicate`; `extends` whose `adds` is not a new idea becomes `ref_only` |
| 2c | code | the verdicts | shadow: no save; `new`, `extends` and `contradicts` join the session list, so later exchanges see them as neighbours. Active: `tb save`, `ti add`, a ref, `append-do`, right away |
| 3 | later | each saved note | bridges by shape, see [memory_bridges_by_shape_are_judged_by_reading](memory_bridges_by_shape_are_judged_by_reading). Active mode only: a bridge links two saved ids |
| end | code | every exchange read | active only: `distilled` = the extractor id |

The model writes text and picks from fixed sets. It never writes an id.

What is config and what is code follows [memory_extractor_is_data_immutable_config_rows_in_tl](memory_extractor_is_data_immutable_config_rows_in_tl). Config: the four calls (episodes, extraction, critic, novelty), each with model, think level, temperature and the full system text with the hat in it; the critic questions with their thresholds; the episode character limit; top k. Code: the order of the phases, the noise patterns, the checks of phase 1, the rule on `extends`.

## Why

**The full pipeline with F works.** Same 6 sessions as v7, run in sequence, no 429:

| | v7, council of 3 | F, v7 candidates | F, fresh run |
|---|---|---|---|
| candidates, notes/rules | 255/36 | 255/36 | 251/33 |
| dropped by checks | 63 | 63 | 69 |
| dropped by critic | 36 | 91 | 95 |
| dropped at cosine 0.95 | 0 | 0 | 0 |
| saved (new, extends, contradicts) | 138 | 103 | 90 |
| tokens in | 2.7M | 1.1M (no phase 1) | 2.1M |

F drops 2.5 times what the council dropped on the same candidates, and costs one call per candidate instead of three. Read by hand, the 90 items of the fresh run are mostly general and carry a mechanism. About 10 are weak: textbook practice that passed, project conventions, one wrong generalisation. No invented or denied claim was found. One in nine weak is what decay has to clean.

**Episodes as context, the exchange as the unit.** A lesson often spans several exchanges: a wrong guess, a denial, then the real cause. The session map gives every call the end of the story. The history is in [.memory_distiller_is_a_pipeline_of_small_calls_with_no_tools](.memory_distiller_is_a_pipeline_of_small_calls_with_no_tools).

**Shadow first.** The first real runs fill `extractions` with kept and dropped candidates and the critic's probabilities. Thresholds can then move without new calls, before anything reaches `tb` or `ti`.

**Open points, to settle in the real distiller:**

- **Repeats inside one session.** Twice the same idea was saved two times, from two exchanges. The session list given to phase 2b does not stop it.
- **The cut at cosine 0.95 never fired**, in any of the three runs. Phase 2b does all the duplicate work. Lower the cut, or drop it and keep phase 2a as a neighbour search only. It stays out of the config until this is settled.
- **Phase 1 varies between runs.** With the same critic, "unconfirmed claim" fired 18 times on the v7 candidates and 5 times on fresh ones. Two critics are compared only on frozen candidates.

## Cross-references

- [memory_critic_is_f_textbook_as_a_test_and_no_record_question](memory_critic_is_f_textbook_as_a_test_and_no_record_question) — phase 1b
- [memory_extractor_is_data_immutable_config_rows_in_tl](memory_extractor_is_data_immutable_config_rows_in_tl) — where the config and the candidates live
- [memory_bridges_by_shape_are_judged_by_reading](memory_bridges_by_shape_are_judged_by_reading) — phase 3
- [memory_glm_json_comes_from_the_prompt_not_format](memory_glm_json_comes_from_the_prompt_not_format) — how every call holds its JSON
- [memory_episode_summaries_are_a_derived_index_over_tl](memory_episode_summaries_are_a_derived_index_over_tl) — phase 0b output reused as an index
- [memory_distillation_stays_manual_for_now](memory_distillation_stays_manual_for_now) — manual distillation goes on until active mode
- [memory_hindsight_not_adopted_its_shape_is_copied](memory_hindsight_not_adopted_its_shape_is_copied) — where the shape comes from
- [.memory_distiller_is_a_pipeline_of_small_calls_with_no_tools](.memory_distiller_is_a_pipeline_of_small_calls_with_no_tools) — the replaced decision
