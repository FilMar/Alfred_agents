# Third Brain on the Rasp

```yaml
tags: [architecture, tb, raspberry, matrix]
sources: [conversation, tools/tb/src/infra.ts]
updated: 2026-08-18
```

## Decision

Host the Third Brain on the Rasp and query it from anywhere via a dedicated Matrix bot — no agent needed for reads. This revises [roadmap](roadmap) Phase 8 (see below).

## Why it is nearly free

`tb` is already fully client/server: notes live as payloads in Qdrant reached over HTTP (`QDRANT_URL`, `tools/tb/src/infra.ts`), and query embeddings are computed via Ollama over HTTP (`OLLAMA_URL`). The CLI holds no local state. Moving the TB to the Rasp therefore means only repointing the two URLs from desktop and laptop, inside Tailscale. Single source of truth, no sync problem.

## Agent-free reads

Reading the TB needs no intelligence: `tb search` is deterministic retrieval. A dedicated Matrix bot command (e.g. `!tb search <query>`) runs the query and returns formatted results. The agent is needed for distillation/consolidation (writes, via Platone) — not for querying. Writes stay agent-mediated and can come later.

## Target configuration

Two containers on the Rasp — **Qdrant** (vectors + note payloads) and **Ollama** (query embeddings). All clients point there: desktop CLI, laptop CLI, Matrix bot. Both reachable only inside the Tailscale perimeter, consistent with Pillar 5 of [orchestrator_overview](orchestrator_overview).

Feasibility: `nomic-embed-text` (~137M params, ~270MB F16) runs fine on a Pi 4/5 via Ollama on ARM64 — hundreds of ms per query embedding on a Pi 5, ~1-2s on a Pi 4. Irrelevant for single-user queries.

## Mass re-embedding runs from the Desktop

Corpus migration or embedding-model change is the one slow case on the Pi — and it needs no data move: run the job from the Desktop with `OLLAMA_URL` local (fast embedding on the powerful machine) and `QDRANT_URL` pointing at the Rasp (vectors written directly where they live).

This is exactly a `requiresDesktop: true` orchestrator task: schedulable, the Rasp wakes the Desktop via WoL, the job runs, the Desktop shuts down. The existing architecture covers this case with zero additions.

## Phase 8 revision

The Matrix-vs-Telegram rationale is documented in Pillar 5 of [orchestrator_overview](orchestrator_overview): a Telegram bot querying the TB would expose personal memory outside the Tailscale perimeter, to anyone holding the bot token. Phase 8's interface channel is **Matrix** (dedicated bot); the `pi-core` idea (Qdrant + SQLite container on the personal server = the Rasp) is unchanged.

## Cross-references

- [orchestrator_overview](orchestrator_overview) — Pillar 5 perimeter and Matrix-vs-Telegram rationale
- [roadmap](roadmap) — Phase 8, revised by this decision
- [architettura](architettura) — the `tb` layer
- [rasp_node](rasp_node) — full view of services on the Rasp
