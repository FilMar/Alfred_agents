---
tags: [memory, tb, testing, qdrant]
sources: [tools/tb/src/infra.ts, tests/ti.test.ts, tests/td_extraction.test.ts]
---

## Decision

The `qdrantClient` and `ollamaClient` of `tb` read `QDRANT_URL` and `OLLAMA_URL` on each request, through `qdrantUrl()` and `ollamaUrl()`. `HttpClientConfig.baseUrl` takes a string or a function.

`tests/ti.test.ts` calls `mock.restore()` after its tests.

## Why

**Bun shares modules across test files.** `tl/src/client.ts` imports `tb`, so the first test file that touches `tl` loads `infra.ts`. With the url read once at import, a later test that sets `QDRANT_URL` to a fake still reached the real Qdrant on the Rasp. The test of `loadVocabulary` got the real tags. Read per call, the fake always wins. This is the same fix as [memory_tl_client_reads_its_url_on_each_call_so_a_test_never_reaches_the_real_store](memory_tl_client_reads_its_url_on_each_call_so_a_test_never_reaches_the_real_store).

**A spy left on a shared client leaks.** `ti.test.ts` put spies on `qdrantClient.request` and never removed them. Every test file after it got the fake answer `{}`. The file that sets the spy removes it.

## Cross-references

- [memory_tl_client_reads_its_url_on_each_call_so_a_test_never_reaches_the_real_store](memory_tl_client_reads_its_url_on_each_call_so_a_test_never_reaches_the_real_store) — the same fix in `tl`
