---
tags: [memory, distiller, llm, pi-ai, ollama, transport]
sources: [conversation, spikes/2026-10-05-pi-ai-transport/main.ts]
---

## Decision

Every LLM call of the extractor goes through `pi-ai`, with `completeSimple(model, context, options)`. It does not call the Ollama API by hand, and it does not use `th` or `pi-coding-agent`.

This changes one line of [memory_extractor_pipeline_is_v7_with_critic_f_built_in_shadow_first](memory_extractor_pipeline_is_v7_with_critic_f_built_in_shadow_first): "the calls go straight to the Ollama API". The rest of that decision holds.

Pi has two layers here:

- `pi-coding-agent` is a full agent: a system prompt, tools, skills. `th` runs on it. It costs about 9k tokens before the task starts.
- `pi-ai` is the layer below: one call to one model. No prompt of its own, no tools, no fixed cost.

Each call in the extractor config states three things, because the defaults are wrong for Ollama:

- the model with `reasoning: true`;
- the thinking level, `low` for glm-5.3-flash;
- the provider's compat flags. For Ollama: `supportsDeveloperRole: false`.

## Why

**The model becomes data.** With `pi-ai`, the model in a config row can be any model of the pi registry, from any provider. A critic on another provider is a new config row, not new code. That is the point of [memory_extractor_is_data_immutable_config_rows_in_tl](memory_extractor_is_data_immutable_config_rows_in_tl). `pi-ai` also measures usage and maps thinking levels per provider.

**The spike: same answers as Ollama by hand.** 20 candidates of the critic bench, the critic F prompt, glm-5.3-flash. The differences are against the stored F run of the critic bench.

| transport | valid JSON | mean difference in p | drop decisions that differ | tokens out | seconds |
|---|---|---|---|---|---|
| Ollama `/api/chat`, think low | 20/20 | 0.061 | 4 | 177 | 1.9 |
| `pi-ai`, no reasoning | 20/20 | 0.065 | 4 | 2713 | 15.2 |
| `pi-ai`, reasoning low | 20/20 | 0.061 | 5 | 194 | 1.9 |

Between Ollama by hand and `pi-ai` with reasoning low, the mean difference is 0.053. That is inside glm's own noise.

**Two traps, both silent:**

1. **With `reasoning: true`, `pi-ai` sends the system prompt with the role `developer`.** Ollama drops that role without an error. The model never sees its task, and 0 of 20 answers were valid JSON. `compat.supportsDeveloperRole = false` sends the role `system` instead.
2. **Without `reasoning`, `pi-ai` sends no `reasoning_effort`.** glm then thinks at its own default: 15 times the output tokens and 8 times the time, for the same answers.

`~/.pi/agent/models.json` lists glm-5.3-flash without `reasoning: true`. Anything that uses that entry as it is falls into trap 2. The extractor does not depend on that file: the config holds the full model.

**A side finding.** Run again with the same transport, one critic call flips 4 of 20 drop decisions. One call is noisy near the thresholds. This is one more reason to keep the probabilities in `extractions`.

## Cross-references

- [memory_extractor_pipeline_is_v7_with_critic_f_built_in_shadow_first](memory_extractor_pipeline_is_v7_with_critic_f_built_in_shadow_first) — the calls this applies to
- [memory_extractor_is_data_immutable_config_rows_in_tl](memory_extractor_is_data_immutable_config_rows_in_tl) — the config that names the model
- [memory_distiller_is_its_own_tool_td_and_tl_stays_the_register](memory_distiller_is_its_own_tool_td_and_tl_stays_the_register) — the tool that makes the calls
- [memory_glm_json_comes_from_the_prompt_not_format](memory_glm_json_comes_from_the_prompt_not_format) — the JSON still comes from the prompt, checked by code
