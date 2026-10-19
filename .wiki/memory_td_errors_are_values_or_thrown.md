---
tags: [memory, distiller, td, errors]
sources: [tools/td/src/model_caller.ts, tools/td/src/registry.ts, tools/td/src/save.ts, tests/td_active_end_to_end.test.ts]
replaces: [memory_td_model_caller_asks_once_fixes_json_once_and_returns_failures_as_values@44d5481, memory_td_registry_reads_a_tl_row_into_a_version_and_a_missing_row_is_null@c3d30b1, memory_td_world_errors_return_as_values_and_programmer_errors_are_rethrown@b6ae196]
---

## Decision

In `td`, an error of the world is a value. An error of the programmer is thrown.

- **World errors:** a store that is down, a timeout, a 4xx or 5xx from a provider, a model that writes wrong JSON, a row that does not exist. They are normal in a run of 200 calls. The function returns them, and the Distiller decides.
- **Programmer errors:** a wrong import, a `ContractError`, a `TypeError`, a `ReferenceError`. They are thrown again and stop the run.
- `worldFailure(error)` in `save.ts` makes the split. `saveNote`, `saveRule`, `closeExchanges` and the neighbour search put the message in a `failure` field. A failure keeps the session open and never stops the run.
- `ModelCaller.ask` makes one call. If the JSON is missing or wrong, it sends the error back once (`MAX_TRIES` is 2). It returns a `ModelAnswer`, never a throw. It does not retry a provider error: the OpenAI SDK under `pi-ai` already retries 429 and 5xx with a delay.
- `Version.read` returns `null` when `tl` answers 404: the id does not exist, or no version is active. Any other HTTP error goes up unchanged.
- `ModelTokens` keeps four counts. `pi-ai` computes `input` as prompt minus cache reads and writes, so `input` alone hides the prompt on a provider that caches.

## Why

The first body of `saveNote` caught every error. It imported `getByIds` from the wrong module and read fields on a class that has none. The catch turned both bugs into a `failure`. The unit tests stayed green, because a bare call passes its contract with a failure as well as with a save. `tsc` found the bug. With the narrow catch, a wrong import throws a `TypeError` and stops the test at once.

A broken store or a bad answer from Ollama will happen, and the run must go on. A wrong import must stop the run.

`ask` is tested as an outcome table. Its contract can only say that an ok answer passes the check, so a body that always failed would pass bare calls. The tests pin `isOk`, `tries`, the output tokens and the failure text for each sequence of replies. They run `pi-ai` for real against a fake server that speaks the OpenAI stream. That checks the role `system`, `reasoning_effort` and the correction message on the wire.

Where it will likely break: `extractJson` takes the first fenced block. A model that writes an example block first gives the example. The check catches it and the retry asks again, at the cost of one call.
