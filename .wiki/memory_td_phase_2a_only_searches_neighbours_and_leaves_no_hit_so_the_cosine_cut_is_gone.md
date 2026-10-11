---
tags: [memory, distiller, td, neighbours]
sources: [tools/td/SPEC_ACTIVE.md, tools/td/src/neighbours.ts, tests/td_active_end_to_end.test.ts]
---

## Decision

Phase 2a is a read-only search for neighbours. It has no cosine cut.

- A note candidate is searched in `tb` by its `what`: depth 0, `topK` results, `record_hits: false`.
- A rule candidate is searched in `ti` by its `if`: `topK` results.
- `td` imports `tb` and `ti` as modules, like phase 1 does for the tag vocabulary.
- The "near identical" drop at cosine 0.95 is removed. Phase 2b does all the duplicate work.

`Outcome.nearIdentical` and the `NEAR_IDENTICAL` constant in `tl` have no caller now. They are not deleted yet.

## Why

The 0.95 cut never fired in three spike runs. A candidate is a paraphrase written by the model, and a paraphrase does not reach 0.95 against the stored note. Lowering the cut would risk dropping an `extends`, which adds a new idea and still looks close to the old note. A filter that never fires is code to maintain for nothing.

`record_hits: false` is a must. A `tb` search counts a hit on each note it returns. That is a write. Shadow mode promises to write only to `extractions`, and active mode should not count a hit for a read made by the distiller. A test reads the stored note after a neighbour search and checks that `hits` is still empty. A mutant that turned the flag on survived the unit tests and was killed by that test.

Importing the modules keeps one process and no shell calls. The tools stay the only owners of their stores.

## Cross-references

- [memory_extractor_pipeline_is_v7_with_critic_f_built_in_shadow_first](memory_extractor_pipeline_is_v7_with_critic_f_built_in_shadow_first) — the open point on the 0.95 cut that this closes
- [memory_distiller_td_is_fourteen_components_behind_one_entry_point](memory_distiller_td_is_fourteen_components_behind_one_entry_point) — component 9
- [memory_td_extraction_checks_each_candidate_shape_in_the_json_check_and_runs_the_code_checks_inside_phase_one](memory_td_extraction_checks_each_candidate_shape_in_the_json_check_and_runs_the_code_checks_inside_phase_one) — `tb` imported as a module
- [memory_td_edges_are_tested_on_in_memory_stubs_and_an_end_to_end_test_checks_the_stores](memory_td_edges_are_tested_on_in_memory_stubs_and_an_end_to_end_test_checks_the_stores) — the test that checks the hits
