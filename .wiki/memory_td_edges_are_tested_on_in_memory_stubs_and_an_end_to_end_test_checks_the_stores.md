---
tags: [memory, distiller, td, tests]
sources: [tools/alfred/src/tests/distill_fake.rs, tools/alfred/src/tests/distill_bench.rs, tools/alfred/src/tests/distill_run_flow.rs, tests/helpers/td_stubs.ts@last-typescript, tests/td_active_end_to_end.test.ts@last-typescript, tests/td_save.test.ts@last-typescript]
---

## Decision

The tests of the distiller reach the outside world through one helper, and one test file checks what the stores hold.

- `tools/alfred/src/tests/distill_fake.rs` holds an in-memory fake world: Qdrant with the rules and the episodes, Ollama embeddings, and a model that replies from a queue. The bench adds a real hist database in a temp file. A service can be marked down, so it fails on demand.
- The unit tests are bare calls on valid input. The contract is the oracle, as in the other distiller tests.
- `tools/alfred/src/tests/distill_run_flow.rs` runs whole sessions on the fake and checks the stores with its own asserts. It checks the stored rule, the episodes, the `distilled` value and the `extractions` rows.

## Why

The unit tests of Save were green while `saveNote` saved nothing. Its contract holds for a save and for a failure alike, so a bare call cannot tell them apart. Nothing in the contract of such a function can name the success.

A run of 23 mutants showed the size of the gap. Seven survived the unit tests. Four were a search that counts hits, a limit one too high, a lost tag and a close that does not check its write. Three were a verdict missing from the session list, a lost failure and a lost noise exchange. Tests added to the end-to-end file killed all 23.

A stub that fails on demand is the only way to test the world-error path without a real outage. The fake sits behind the real `Rules`, `Qdrant`, `Embedder` and hist code, so a wrong route or a wrong field fails the test.

## Cross-references

- [skill_ritchie_classifiers_get_an_outcome_table](skill_ritchie_classifiers_get_an_outcome_table) — the other case of a test with its own expect
