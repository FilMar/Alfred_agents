---
tags: [memory, distiller, ollama, glm, json]
sources: [conversation, spikes/2026-10-01-extraction-hats/main.py]
---

## Decision

With `glm-5.3-flash:cloud` on Ollama, the JSON comes from the prompt. The prompt ends with the exact JSON shape. The call sets `format: "json"`, `think: "low"` and temperature 0.1. Code parses the answer and checks it. On an error it sends the error back once and asks for corrected JSON.

## Why

Tested on 2026-10-01. GLM ignores a JSON schema in `format`, both on the native `/api/chat` and on the OpenAI-compatible `/v1/chat/completions` with `response_format: json_schema`. It answers in free text. `think: false` is ignored too: the reasoning lands inside `content`. With `think: "low"`, `format: "json"` and the shape in the prompt, it returns valid JSON.

Schema-constrained output cannot be taken for granted on a cloud model, so the check lives in code. In the extraction spike, 44 of 46 calls were valid at once and the other 2 were fixed by one retry. The validator also checks meaning, not only syntax: one verdict per candidate, and `of` must be a given id. A wrong id is an error the model can fix on the retry.

## Cross-references

- [memory_extractor_pipeline_is_v7_with_critic_f_built_in_shadow_first](memory_extractor_pipeline_is_v7_with_critic_f_built_in_shadow_first) — the calls this applies to
