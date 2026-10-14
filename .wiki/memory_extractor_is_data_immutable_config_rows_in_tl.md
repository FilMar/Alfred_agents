---
tags: [memory, distiller, tl, sqlite, config]
sources: [conversation, tools/tl/src/db.ts, spikes/2026-10-01-critic-bench/main.py (deleted)]
---

## Decision

The extractor is data, not code. `tl` gets two tables.

**`extractor`: one row per version.** Rows are immutable. A change is a new row. Columns: `id`, `parent`, `why` (one line), `active` (the one that saves to `tb` and `ti`), `config` and `created`. `config` is one JSON document, a typed struct in code, checked when it is written and when it is read. It holds every prompt, model, temperature and hat, the critic checks `{name, text, direction, threshold}`, and the sizes and parameters.

**`extractions`: one row per candidate, kept or dropped.** `extractor_id`, `exchange_id`, type, text, quote, the critic probabilities, the verdict of phase 2 and the saved id.

A blank `quote` is allowed only when `dropped_by` starts with `check:`. Phase 1 drops a candidate with an empty quote, and that drop must still be logged. Before this rule `tl` refused exactly those rows. A blank quote elsewhere is a bug.

`exchanges.distilled`, the saved notes and the saved rules link back to the extractor. A second extractor can run in shadow: it writes only to `extractions`. The shape of the flow stays code: the phases and the checks.

## Why

**A change should not need code.** The move from critic E to F changed one question and one threshold. With this table it is a new row.

**Immutable rows keep the history true.** An extraction points to the config that made it. `parent` and `why` give the history git would give. Prompts do not also live in the repo: two sources would drift.

**One JSON column.** A new parameter needs no migration.

**Dropped candidates are the point.** With probabilities stored, thresholds move over every real candidate with no new calls. Use becomes the label: a note that decays unused is a bad label for the extractor that let it pass.

Where it will likely break: `tl` is no longer a pure archive, it also holds the register of the distiller. Accepted, because the distiller already reads its queue and sets `distilled`.

## Cross-references

- [memory_critic_is_f_textbook_as_a_test_and_no_record_question](memory_critic_is_f_textbook_as_a_test_and_no_record_question) — the first config the table would hold
- [memory_extractor_pipeline_is_v7_with_critic_f_built_in_shadow_first](memory_extractor_pipeline_is_v7_with_critic_f_built_in_shadow_first) — the phases the config describes
- [memory_episode_summaries_are_a_derived_index_over_tl](memory_episode_summaries_are_a_derived_index_over_tl) — the episode index that carries `extractor_id`
- [memory_tl_work_archive_not_event_log](memory_tl_work_archive_not_event_log) — the tables tl has today
- [memory_human_gate_is_the_bottleneck](memory_human_gate_is_the_bottleneck) — use, not reading, judges a note
- [memory_distiller_is_its_own_tool_td_and_tl_stays_the_register](memory_td_is_its_own_tool) — td checks the config; tl stores it
- [memory_extractor_calls_go_through_pi_ai_with_reasoning_low](memory_extractor_calls_go_through_pi_ai_with_reasoning_low) — what a call in the config must state
