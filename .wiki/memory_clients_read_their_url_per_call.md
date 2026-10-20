---
tags: [memory, tb, tl, testing]
sources: [tools/tb/src/infra.ts, tools/tl/src/client.ts, tests/ti.test.ts, tests/td_recorder.test.ts]
replaces: [memory_tb_clients_read_their_url_per_call_and_ti_tests_restore_their_spies@6ee128e, memory_tl_client_reads_its_url_on_each_call_so_a_test_never_reaches_the_real_store@3d56617]
---

## Decision

The clients of `tb` (`qdrantClient`, `ollamaClient`) and the client of `tl` read their URL on each request. The variables are `QDRANT_URL`, `OLLAMA_URL` and `TL_API_URL`. The functions are `qdrantUrl()`, `ollamaUrl()` and `apiUrl()`. `HttpClientConfig.baseUrl` takes a string or a function.

A test file that puts a spy on a shared client removes it when it ends, with `mock.restore()`.

`th` builds its archive client once at load. Its tests run `th` as a child process with its own environment, so they are not affected.

## Why

`bun test` runs every test file in one process, and a module loads once. If the URL is read at import, a later test that sets the variable to a fake still reaches the real store on the Rasp.

Two cases happened:

- `tl/src/client.ts` imports `tb`, so the first test file that touched `tl` loaded `infra.ts`. The test of `loadVocabulary` got the real tags.
- `tl.test.ts` loaded the `tl` client while `TL_API_URL` still pointed at the real store. The first recorder test sent its rows there. They were refused and nothing was written. The next test would not be so lucky.

A workaround existed: `tl_extractions.test.ts` imported `client.ts?extractions`. It could not reach a client imported deep inside another module. Reading the URL per call fixes every test at once, so the workaround is gone: the test imports `client.ts` like any other file. A new `HttpClient` per call costs nothing next to a network request.

A spy left on a shared client leaks. `ti.test.ts` put spies on `qdrantClient.request` and never removed them. Every test file after it got the fake answer `{}`.
