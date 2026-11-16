---
tags: [memory, distiller, alfred, shadow]
sources: [spec.json@6af63cb, tools/alfred/src/distill/save.rs]
---

## Decision

The Rust distiller keeps shadow mode. `Mode::Shadow` runs the whole pipeline and writes nothing to `ti`. It spends no `Budget`. `Mode::Active` writes.

## Why

Which Ollama model the distiller uses on the Deck still waits for a comparison on the same data. Shadow mode lets a new model run on real sessions without writing to `ti`. It costs one check before each save.

The other way was active mode only, with the test run on a copy of Qdrant. That needs a second store to set up for each comparison.

## Cross-references

- [memory_extractor_pipeline_is_v7_with_critic_f_built_in_shadow_first](memory_extractor_pipeline_is_v7_with_critic_f_built_in_shadow_first) — shadow first in `td`
- [core_alfred_v2_one_binary_serve_on_the_deck](core_alfred_v2_one_binary_serve_on_the_deck) — the model comparison that is still open
