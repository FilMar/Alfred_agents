---
tags: [memory, distiller, td, neighbours]
sources: [tools/td/SPEC_ACTIVE.md@61d5a9f, tools/alfred/src/distill/decide.rs, tools/alfred/src/tests/distill_decide_flow.rs, tools/td/src/neighbours.ts@last-typescript]
---

## Decision

Phase 2a is a read-only search for neighbours. It has no cosine cut.

- A rule candidate is searched in the rules by its `if`: `top_k` results, `hits: false`. The distiller writes no notes, so there is no note search.
- `neighbours_of()` calls the rules store inside `alfred serve`, not over HTTP.
- The "near identical" drop at cosine 0.95 is removed. Phase 2b does all the duplicate work.

alfred has no `nearIdentical` outcome and no `NEAR_IDENTICAL` constant.

## Why

The 0.95 cut never fired in three spike runs. A candidate is a paraphrase written by the model, and a paraphrase does not reach 0.95 against the stored note. Lowering the cut would risk dropping an `extends`, which adds a new idea and still looks close to the old note. A filter that never fires is code to maintain for nothing.

`hits: false` is a must. A rules search counts a hit on each rule it returns. That is a write. Shadow mode promises to write only to `extractions`, and active mode should not count a hit for a read made by the distiller. A test reads the stored rule after a neighbour search and checks that `hits` is still empty. In `td`, a mutant that turned the flag on survived the unit tests and was killed by that test.

One process keeps the search free of shell calls. The tools stay the only owners of their stores.

## Cross-references

- [memory_extractor_pipeline_is_v7_with_critic_f_built_in_shadow_first](memory_extractor_pipeline_is_v7_with_critic_f_built_in_shadow_first) — the open point on the 0.95 cut that this closes
- [memory_distiller_td_is_fourteen_components_behind_one_entry_point](core_alfred_v2_one_binary_serve_on_the_deck) — component 9
- [memory_td_edges_are_tested_on_in_memory_stubs_and_an_end_to_end_test_checks_the_stores](memory_td_edges_are_tested_on_in_memory_stubs_and_an_end_to_end_test_checks_the_stores) — the test that checks the hits
