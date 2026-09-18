---
tags: [memory, tb, ti, raspberry, qdrant]
sources: [conversation, tools/tb/src/infra.ts]
---

## Decision

`tb` and `ti` both run against the Qdrant + Ollama containers on the Rasp — live and confirmed in daily production use as of 2026-09-11, from desktop and laptop. All clients point there; both services sit inside the Tailscale perimeter only.

Reading the TB needs no agent: a dedicated Matrix bot command (`!tb search`) runs the deterministic retrieval. Writes stay agent-mediated (distillation via Platone) and come later.

Mass re-embedding (corpus migration or embedding-model change) runs from the Desktop, with `OLLAMA_URL` local (fast embeddings) and `QDRANT_URL` pointing at the Rasp — exactly a `requiresDesktop: true` orchestrator task.

## Why

`tb` and `ti` are already fully client/server — moving the stores means repointing two URLs, not moving data. There is no sync problem because there is one store. Feasibility: `nomic-embed-text` (~137M params) runs on ARM64 in hundreds of ms per query on a Pi 5 — irrelevant for single-user queries. A Telegram bot querying the TB was rejected: it would expose personal memory outside the Tailscale perimeter to anyone holding the bot token — see [orchestrator_tailscale_perimeter_matrix_bot](orchestrator_tailscale_perimeter_matrix_bot).

## Cross-references

- [rasp_services_provisioning_order](rasp_services_provisioning_order) — where the containers sit on the node
- [core_tb_stateless_single_source](core_tb_stateless_single_source) — the stateless-client design that makes this a URL change
- [hook_tb_ti_auto_injection](hook_tb_ti_auto_injection) — the fastest consumer of this shared instance