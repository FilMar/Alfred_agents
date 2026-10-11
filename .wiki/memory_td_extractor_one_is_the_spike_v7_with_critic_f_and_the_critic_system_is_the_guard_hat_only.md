---
tags: [memory, distiller, td, config, critic, tl]
sources: [spikes/2026-10-02-extractor-f/main.py, spikes/2026-10-01-extraction-hats/main.py, spikes/2026-10-01-critic-bench/main.py]
---

## Decision

Extractor row 1 in `tl` is the spike pipeline: v7 with critic F. It is active since 2026-10-09.

| field | value | from |
|---|---|---|
| model | `glm-5.3-flash:cloud`, Ollama `openai-completions`, `reasoning: true`, `supportsDeveloperRole: false` | `x.MODEL` |
| thinking, temperature | `low`, 0.1 for all four roles | `x.THINK`, `x.llm`, `CRITIC_TEMP` |
| context, max tokens | 1048576, 32000 | `~/.pi/agent/models.json`, the pi-ai transport spike |
| `episodes.system` | blue hat + phase 0b task | `x.SYS0` |
| `extract.system` | white hat + phase 1 task | `x.SYS1_V5` |
| `novelty.system` | black hat + phase 2b task | `x.SYS2` |
| `critic.system` | the guard hat only | `cb.HATS["guard"]` |
| checks | four note checks `atLeast` (0.6, 0.4, 0.4, 0.4), `is_user_rejection` `under` 0.4 | `NOTE_THRESHOLDS`, `RULE_THRESHOLD` |
| `episodeChars`, `topK` | 2500, 5 | `x.EP_CHARS`, `TOP_K` |

The critic call (component 8) builds its system prompt in code: `critic.system`, then the task block of `cb.task_prob`, filled from the checks of the candidate's kind. The text of that block stays word for word as in the spike.

## Why

**The questions are data once.** In the spike the critic had two system prompts, note and rule, each with the guard hat and a task block that lists the questions. The config already holds the questions as `checks`. A whole prompt in `critic.system` would hold them a second time, and a change of a check's text would leave the prompt behind.

**The block is a template, not a choice.** It says how to answer: one probability per question and the JSON shape. That is code, like the order of the phases.

**Where it will likely break.** The spike cut texts with constants that are not in the config: the target at 6000 input and 8000 output characters, 300 per side in the phase 0b listing, 80 tags of the vocabulary. They live in code for now. A change to one of them changes the output with the same row.

## Cross-references

- [memory_extractor_pipeline_is_v7_with_critic_f_built_in_shadow_first](memory_extractor_pipeline_is_v7_with_critic_f_built_in_shadow_first) — the pipeline this row runs
- [memory_critic_is_f_textbook_as_a_test_and_no_record_question](memory_critic_is_f_textbook_as_a_test_and_no_record_question) — the checks
- [memory_td_registry_reads_a_tl_row_into_a_version_and_a_missing_row_is_null](memory_td_registry_reads_a_tl_row_into_a_version_and_a_missing_row_is_null) — how the row was written
