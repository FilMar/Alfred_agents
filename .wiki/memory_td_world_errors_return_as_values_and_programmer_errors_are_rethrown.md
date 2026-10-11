---
tags: [memory, distiller, td, errors]
sources: [tools/td/src/save.ts, tools/td/src/distiller.ts, tests/td_active_end_to_end.test.ts]
---

## Decision

In Save and in the neighbour search, a store error is a value. A programmer error is thrown again.

- `worldFailure(error)` in `save.ts` does the split. A `ContractError`, a `TypeError` or a `ReferenceError` is thrown again. Any other error becomes its message.
- `saveNote`, `saveRule` and `closeExchanges` put that message in a `failure` field and return. `decideTarget` does the same for a failed neighbour search.
- A failure keeps the session open. It never stops the run.

## Why

A broken store, a timeout or a bad answer from Ollama will happen, and the run must go on. That is a world error and a value. A wrong import is a bug. It must stop the run.

The first body of `saveNote` caught every error. It imported `getByIds` from the wrong module and read fields on a class that has none. The catch turned both bugs into a `failure`. The unit tests stayed green, because a bare call passes its contract with a failure as well as with a save. `tsc` found the bug. A run on stubs found nothing.

With the narrow catch, a wrong import throws a `TypeError` and stops the test at once. The alternative, catch all, hides the code that does not work behind a result that looks legitimate.

## Cross-references

- [memory_td_model_caller_asks_once_fixes_json_once_and_returns_failures_as_values](memory_td_model_caller_asks_once_fixes_json_once_and_returns_failures_as_values) — the same rule for model calls
- [memory_td_edges_are_tested_on_in_memory_stubs_and_an_end_to_end_test_checks_the_stores](memory_td_edges_are_tested_on_in_memory_stubs_and_an_end_to_end_test_checks_the_stores) — the test that would have caught it
- [skill_ritchie_contract_messages_carry_values](skill_ritchie_contract_messages_carry_values) — programmer errors panic with the values
