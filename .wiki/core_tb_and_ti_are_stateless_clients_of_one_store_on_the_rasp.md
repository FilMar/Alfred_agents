---
tags: [core, tb, ti, tl, qdrant, raspberry]
sources: [conversation, tools/tb/src/infra.ts, tools/tl/deploy/tl.service]
replaces: [core_tb_stateless_single_source@c1dbd73, memory_tb_and_ti_run_against_qdrant_and_ollama_on_the_rasp_and_every_client_points_there@2d54038]
---

## Decision

The `tb` and `ti` CLIs hold no local state. Notes and rules live as payloads in Qdrant. The embeddings of queries come from Ollama. Both are reached over HTTP (`QDRANT_URL`, `OLLAMA_URL`, `EMBED_MODEL` in `tools/tb/src/infra.ts`).

Every client points to the Qdrant and Ollama containers on the Rasp: desktop, laptop and hooks. This is live and confirmed in daily use since 2026-09-11. Both services sit inside the Tailscale perimeter only.

`tl` also runs on the Rasp (`tools/tl/deploy/tl.service`, `tl serve`). `td distill` runs on the client and calls the Rasp APIs, like any other client. Mass re-embedding, for a corpus migration or a new embedding model, runs from the Desktop: `OLLAMA_URL` is local, for fast embeddings, and `QDRANT_URL` points at the Rasp.

## Why

Stateless clients make deployment a URL change, not a data migration. Moving the stores meant repointing two URLs. There is one store, so there is nothing to sync. A local state store would need a reconciliation step between every copy, which is the work that makes personal wikis and memory systems rot.

`nomic-embed-text` (about 137M parameters) runs on ARM64 in hundreds of milliseconds per query on a Pi 5, fast enough for one user. That measure is for v1.5. The model in use is v2-moe (475M), so if Ollama runs on the Pi the number needs a new measure.

## Cross-references

- [memory_embedding_model_follows_the_corpus_language](memory_embedding_model_follows_the_corpus_language) — the model in use
- [memory_alias_makes_migration_reversible](memory_alias_makes_migration_reversible) — where the collections live
- [hook_tb_ti_auto_injection](hook_tb_ti_auto_injection) — fast and reliable because of this single source
