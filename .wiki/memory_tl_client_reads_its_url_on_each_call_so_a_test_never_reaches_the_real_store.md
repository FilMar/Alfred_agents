---
tags: [memory, tl, client, tests]
sources: [tools/tl/src/client.ts, tools/th/src/archive.ts, tests/td_recorder.test.ts]
---

## Decision

The `tl` client reads `TL_API_URL` on each call, through `apiUrl()`. It no longer keeps a client built when the module loads.

## Why

`bun test` runs every test file in one process, and a module loads once. `tl.test.ts` loads the client through `ingest.ts` while `TL_API_URL` still points at the real store on the Raspberry. A later test that set the variable to its own server still got the old client. The first recorder test sent its rows to the real `tl`. They were refused, and nothing was written. The next test would not be so lucky.

`tl_extractions.test.ts` worked around this with a query on the import (`client.ts?extractions`). That cannot reach a client imported deep inside another module. Reading the URL per call fixes every test at once. A new `HttpClient` per call costs nothing next to a network request.

`th` builds its archive client once at load with `apiUrl()`. Its tests run `th` as a child process with its own environment, so they are not affected.

## Cross-references

- [memory_td_recorder_follows_one_candidate_through_the_phases_and_writes_once_per_exchange](memory_td_recorder_follows_one_candidate_through_the_phases_and_writes_once_per_exchange) — the test that found it
