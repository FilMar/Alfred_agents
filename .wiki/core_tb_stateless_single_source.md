---
tags: [core, tb, architecture, qdrant]
sources: [tools/tb/src/infra.ts, .wiki/architettura.md]
---

## Decision

The `tb` and `ti` CLIs hold no local state. Notes and identity entries live as payloads in Qdrant; query embeddings are computed by Ollama. Both are reached over HTTP (`QDRANT_URL`, `OLLAMA_URL`, `EMBED_MODEL` — `tools/tb/src/infra.ts`). Today the services run locally; the target is the Rasp, so every client (desktop, laptop, hooks) points at one source of truth.

## Why

Stateless clients make deployment a URL change, not a data migration. There is nothing to sync because there is only one store. A local state store would need a reconciliation step between every copy — the exact work that makes personal wikis and memory systems rot. See [memory_tb_ti_on_rasp](memory_tb_ti_on_rasp) for the live deployment.

## Cross-references

- [memory_tb_ti_on_rasp](memory_tb_ti_on_rasp) — the backing services and where they live
- [style_dual_entrypoint](style_dual_entrypoint) — how `tb`/`ti` expose the same logic over CLI and HTTP