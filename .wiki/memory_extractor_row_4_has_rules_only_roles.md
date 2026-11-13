---
tags: [memory, distiller, extractor, config, alfred]
sources: [spec.json@72e2857, review.json@72e2857, tools/alfred/src/distill/config.rs]
---

## Decision

The Rust distiller reads only extractor rows of a new shape. Row 4 is the first one. Each of the four roles (`episodes`, `extract`, `critic`, `novelty`) is:

```json
{"model": "glm-5.3-flash:cloud", "think": "low", "temperature": 0.1, "system": "..."}
```

The prompts of row 4 ask for rules only, with the `ti` guide alone as the quality bar. Its critic checks are rule checks only. `Extractor::from_row()` refuses unknown fields, then runs `bad_config()`.

`ALFRED_DISTILL_MODEL`, when set, replaces the model of every role. The row does not change.

Row 4 is added inactive. It becomes active at the switch, when `td` stops.

## Why

Rows 1 to 3 carry the `pi-ai` connection: provider, api, base URL, compat flags, context window. With calls straight to Ollama, only the model name and the thinking level matter. The base URL is `OLLAMA_URL`, the same as for the embeddings.

Row 3 asks for notes too. Keeping it would pay tokens for notes that are thrown away.

The model is an environment variable so that a test can run another model on the same data with no new row. The user asked for an easy switch.

## Cross-references

- [memory_extractor_is_data_immutable_config_rows_in_tl](memory_extractor_is_data_immutable_config_rows_in_tl) — rows are immutable, a change is a new row
- [memory_extractor_calls_go_to_ollama_by_reqwest](memory_extractor_calls_go_to_ollama_by_reqwest) — how the model is called
