---
tags: [memory, distiller, llm, ollama, reqwest, transport, alfred]
sources: [conversation, tools/alfred/src/embed.rs]
replaces: [memory_extractor_calls_go_through_pi_ai_with_reasoning_low@86b2f64]
---

## Decision

In alfred v2 every model call of the distiller is one `POST /api/chat` to Ollama, sent with `reqwest`. It sits next to `Embedder` in `embed.rs`. It reuses the same base URL (`OLLAMA_URL`), the same `reqwest::Client` and the same `Upstream` error.

The provider is Ollama only: a model in the config is a model name and a thinking level.

Each call states two things, because the defaults are wrong:

- The system prompt goes with the role `system`.
- The thinking level is always sent in `think` (`low` for glm-5.3-flash).

`pi-ai` retried 429 and 5xx through the OpenAI SDK. `reqwest` does not, so a retry on those errors is part of the call.

## Why

alfred already calls Ollama by hand for the embeddings. The distiller needs one more endpoint, about 30 lines, with no new dependency. The old transport was `pi-ai` (`completeSimple()`), a TypeScript library with no Rust port.

The two traps found with `pi-ai` still hold, in another form:

1. Ollama drops a system prompt it does not accept, with no error. The model never sees its task, and 0 of 20 answers were valid JSON.
2. Without a thinking level, glm thinks at its own default: 15 times the output tokens and 8 times the time, for the same answers.

With `reqwest` the code writes both fields itself, so no library default can hide them. On the old bench (20 critic candidates, glm-5.3-flash) the hand-written Ollama call gave valid JSON 20 times out of 20.

Rejected:
- `ollama-rs`: one more dependency for one endpoint, with its own types and error. It pays for streaming, tool calls and model management, and the distiller uses none of them. Its support for a thinking level, not just on or off, was not checked.
- Many providers through a registry: the distiller runs on the Deck next to Ollama. A second provider is a new decision when a real need names it.

## Cross-references

- [memory_extractor_pipeline_is_v7_with_critic_f_built_in_shadow_first](memory_extractor_pipeline_is_v7_with_critic_f_built_in_shadow_first) — the calls this applies to
- [memory_extractor_is_data_immutable_config_rows_in_tl](memory_extractor_is_data_immutable_config_rows_in_tl) — the config that names the model
- [memory_glm_json_comes_from_the_prompt_not_format](memory_glm_json_comes_from_the_prompt_not_format) — the JSON still comes from the prompt, checked by code
- [core_alfred_v2_one_binary_serve_on_the_deck](core_alfred_v2_one_binary_serve_on_the_deck) — where the distiller runs
