---
tags: [memory, distiller, td, tests]
sources: [tests/helpers/td_stubs.ts, tests/td_active_end_to_end.test.ts, tests/td_save.test.ts]
---

## Decision

The tests of `td` reach the outside world through one helper, and one test file checks what the stores hold.

- `tests/helpers/td_stubs.ts` holds in-memory stand-ins: Qdrant with the `tb` and `ti` collections, Ollama embeddings, a model that replies from a queue, and a real `tl` app on an in-memory database. A Qdrant path can be made to answer 500 on demand.
- The unit tests are bare calls on valid input. The contract is the oracle, as in the other `td` tests.
- `tests/td_active_end_to_end.test.ts` runs a whole session on the stubs and checks the stores with its own expects. It checks the stored note and rule, their exchange id, the refs, the `distilled` value and the `extractions` rows.

## Why

The unit tests of Save were green while `saveNote` saved nothing. Its contract holds for a save and for a failure alike, so a bare call cannot tell them apart. Nothing in the contract of such a function can name the success.

A run of 23 mutants showed the size of the gap. Seven survived the unit tests. Four were a search that counts hits, a limit one too high, a lost tag and a close that does not check its write. Three were a verdict missing from the session list, a lost failure and a lost noise exchange. Tests added to the end-to-end file killed all 23.

A stub that fails on demand is the only way to test the world-error path without a real outage. The stub talks to the real `tb`, `ti` and `tl` code, so a wrong import or a wrong field fails the test.

## Cross-references

- [skill_ritchie_classifiers_get_an_outcome_table](skill_ritchie_classifiers_get_an_outcome_table) — the other case of a test with its own expect
- [memory_td_world_errors_return_as_values_and_programmer_errors_are_rethrown](memory_td_errors_are_values_or_thrown) — the bug that showed the gap
- [memory_tl_client_reads_its_url_on_each_call_so_a_test_never_reaches_the_real_store](memory_clients_read_their_url_per_call) — why the stubs set the url in the environment
