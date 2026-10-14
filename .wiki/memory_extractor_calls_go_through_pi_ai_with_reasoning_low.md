---
tags: [memory, distiller, llm, pi-ai, ollama, transport]
sources: [conversation, spikes/2026-10-05-pi-ai-transport/main.ts (deleted)]
---

## Decision

Every LLM call of the extractor goes through `pi-ai`, with `completeSimple(model, context, options)`. It does not call the Ollama API by hand, and it does not use `th` or `pi-coding-agent`.

`pi-coding-agent` is a full agent: a system prompt, tools, skills, about 9k tokens before the task. `pi-ai` is one call to one model, with no prompt of its own and no fixed cost.

Each call in the config states three things, because the defaults are wrong for Ollama: the model with `reasoning: true`, the thinking level (`low` for glm-5.3-flash), and the compat flags (`supportsDeveloperRole: false` for Ollama).

## Why

**The model becomes data.** Any model of the pi registry can sit in a config row. A critic on another provider is a new row, not new code. `pi-ai` also measures usage and maps the thinking levels.

**Same answers as Ollama by hand.** 20 candidates of the critic bench, critic F, glm-5.3-flash. All three transports gave valid JSON 20 times out of 20. `pi-ai` with reasoning low differs from Ollama by 0.053 on average, which is inside the noise of glm, and takes 1.9 seconds a call.

**Two silent traps:**

1. With `reasoning: true`, `pi-ai` sends the system prompt with the role `developer`. Ollama drops that role without an error. The model never sees its task, and 0 of 20 answers were valid JSON. `supportsDeveloperRole = false` sends `system`.
2. Without `reasoning`, `pi-ai` sends no `reasoning_effort`. glm then thinks at its own default: 15 times the output tokens and 8 times the time, for the same answers.

`~/.pi/agent/models.json` lists glm-5.3-flash without `reasoning: true`, so anything that uses that entry as it is falls into trap 2. The extractor does not depend on that file.

**A side finding.** Run twice on the same transport, one critic call flips 4 of 20 drop decisions. One call is noisy near the thresholds, so the probabilities stay in `extractions`.

## Cross-references

- [memory_extractor_pipeline_is_v7_with_critic_f_built_in_shadow_first](memory_extractor_pipeline_is_v7_with_critic_f_built_in_shadow_first) — the calls this applies to
- [memory_extractor_is_data_immutable_config_rows_in_tl](memory_extractor_is_data_immutable_config_rows_in_tl) — the config that names the model
- [memory_distiller_is_its_own_tool_td_and_tl_stays_the_register](memory_td_is_its_own_tool) — the tool that makes the calls
- [memory_glm_json_comes_from_the_prompt_not_format](memory_glm_json_comes_from_the_prompt_not_format) — the JSON still comes from the prompt, checked by code
