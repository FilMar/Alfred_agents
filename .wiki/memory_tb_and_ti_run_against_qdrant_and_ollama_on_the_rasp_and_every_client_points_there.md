---
tags: [memory, tb, ti, tl, td, raspberry, qdrant]
sources: [conversation, tools/tb/src/infra.ts, tools/tl/deploy/tl.service]
replaces: [memory_tb_ti_on_rasp]
---

## Decision

`tb` and `ti` both run against the Qdrant and Ollama containers on the Rasp. This was live and confirmed in daily use as of 2026-09-11, from desktop and laptop. Every client points there. Both services sit inside the Tailscale perimeter only.

`tl` also runs on the Rasp (`tools/tl/deploy/tl.service`, `tl serve`).

`td distill` runs locally on the client and calls the Rasp APIs, like any other client.

Mass re-embedding (a corpus migration or an embedding-model change) runs from the Desktop. `OLLAMA_URL` is local, for fast embeddings. `QDRANT_URL` points at the Rasp.

## Why

`tb` and `ti` are already fully client and server. Moving the stores means repointing two URLs, not moving data. There is one store, so there is no sync problem.

`nomic-embed-text` (about 137M parameters) runs on ARM64 in hundreds of milliseconds per query on a Pi 5. For a single user that is fast enough.

## Cross-references

- [core_tb_stateless_single_source](core_tb_stateless_single_source) — the stateless-client design that makes this a URL change
- [hook_tb_ti_auto_injection](hook_tb_ti_auto_injection) — the fastest consumer of this shared instance
