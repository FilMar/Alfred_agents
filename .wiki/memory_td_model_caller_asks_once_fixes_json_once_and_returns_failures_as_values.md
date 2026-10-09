---
tags: [memory, distiller, td, llm, pi-ai, json]
sources: [tools/td/src/model_caller.ts, node_modules/@earendil-works/pi-ai/dist/providers/openai-completions.js]
---

## Decision

Component 4 of `td` is `model_caller.ts`, with three classes.

- `ModelCaller.ask(role, prompt, check)` makes one call through `pi-ai` with the model, thinking, temperature and system prompt of the `Role`. It pulls the JSON out of the text and runs the phase's `check`. When the JSON is missing or wrong, it sends the error back once (`MAX_TRIES` = 2).
- `ModelCaller.extractJson(text)` is the pure part. It reads the first fenced block, or the whole text when there is none. Then it takes the slice from the first `{` or `[` to the last matching closer, and parses it. Thinking parts never enter the text.
- `ModelAnswer` is the result: `isOk()`, `json()`, `failure()`, `tries()`, `tokens()`. A failure is a value, never a throw.
- `ModelTokens` holds `input`, `output`, `cacheRead` and `cacheWrite`, summed over the tries.

`check` is the phase's own: `(json: unknown) => string | null`. The phase builds its typed object from the checked JSON with its own `fromJson`.

The API key comes from `getEnvApiKey(provider)` of `pi-ai`, or `"none"` when there is none. The config holds no secret.

## Why

**A failure is a world error.** A model that writes wrong JSON twice, or a provider that answers 400, is a normal event in a run of 200 calls. The Distiller decides what to do with it, so it is a return value.

**No retry on a provider error.** The OpenAI SDK under `pi-ai` already retries 429 and 5xx by itself, with a delay. A fake server showed it: a 529 on one request, and the call still came back `stop`. A 400 comes back at once as `stopReason: "error"`. A second retry layer here would only multiply the waits.

**Four token counts, not two.** With Ollama the cache counts are 0, because its OpenAI endpoint does not report them. But `pi-ai` computes `input = prompt − cacheRead − cacheWrite`. With a provider that caches, `input` alone hides most of the prompt, and the system prompt and session map repeat in every call. The four fields match the token columns of `tl` exchanges.

**The tests run `pi-ai` for real.** A `Bun.serve` fake speaks the OpenAI SSE stream. This checks the role `system`, `reasoning_effort` and the correction message on the wire, the two traps of [memory_extractor_calls_go_through_pi_ai_with_reasoning_low](memory_extractor_calls_go_through_pi_ai_with_reasoning_low). A fake interface over a single backend would not.

**`ask` is tested as an outcome table.** Its contract can only say that an ok answer passes the check. A body that always failed would pass bare calls. So the tests pin `isOk`, `tries`, the output tokens and the failure text for each reply sequence.

**Names.** A struct is an object, so it gets a noun (`ModelCaller`, not `ModelCall` or `modelParser`). A function is an action, so it gets a verb (`extractJson`).

**Where it will likely break.** `extractJson` takes the first fenced block. A model that writes an example block before the real answer gives the example. The check catches it and the retry asks again, at the cost of one call.

## Cross-references

- [memory_distiller_td_is_fourteen_components_behind_one_entry_point](memory_distiller_td_is_fourteen_components_behind_one_entry_point) — component 4
- [memory_extractor_calls_go_through_pi_ai_with_reasoning_low](memory_extractor_calls_go_through_pi_ai_with_reasoning_low) — the transport
- [memory_glm_json_comes_from_the_prompt_not_format](memory_glm_json_comes_from_the_prompt_not_format) — JSON from the prompt, checked by code, one retry
- [memory_td_config_enters_only_as_json_and_keeps_a_frozen_copy](memory_td_config_enters_only_as_json_and_keeps_a_frozen_copy) — the `Role` it reads
