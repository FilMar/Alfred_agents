---
tags: [memory, tl, rest, events, planned]
sources: [conversation, tools/tl/README.md, tools/tl/ROADMAP.md, .wiki/tl_module.md]
---

## Decision

`tl` (Third Log, founded 2026-07-21, not yet implemented — `tools/tl/` holds README/ROADMAP/CLAUDE.md only) is a unified structured event log shared by `th`, `tb`, `ti`, and future producers. Design, settled:

- **Not a CLI** — a REST API (`Bun.serve` on the Rasp, inside the Tailscale perimeter), called with `curl`/HTTP. Storage is SQLite (`TL_DB`), not Qdrant: tabular data with filters, not semantic search.
- **One `events` table**: `id`, `timestamp`, `source`, `actor`, `context`, `outcome`, `tags`, plus free-form `metadata`. Deliberately one table — the entire point is that one query spans every source. Per-source tables were rejected: they recreate the fragmentation the module exists to remove.
- **Endpoints**: `POST /event`, `GET /events` (filters: source, actor, tags, since/until, `json_extract` on metadata).
- **Fire-and-forget**: every producer posts with a short timeout, zero retry, failures degrade to a stderr warning. An unreachable `tl` must degrade to "no log entry", never to "the caller's work failed".
- **What gets logged**: `th` — every run (`th.db` removed entirely; `th` becomes a stateless client like `tb`); `tb` and `ti` — writes only, not search (read volume is orders of magnitude higher, and a search has no procedurally useful outcome).
- **Boundary**: `tl` never judges, merges, or distills. Distillation is `ti`'s job downstream.
- **Out of scope at founding**: skill-invocation logging (needs a hook; gap 1 stays open), storing raw dialogues, migrating `th.db` history.

## Why

Without one event log spanning every tool, any fix to procedural-memory gaps 2, 4, or 6 gets built once per store. The log must never be able to stop whoever is working — the orchestrator's "audit does not execute" principle inverted. Storing raw conversations was rejected: different volume and purpose, and it contradicts the distill-don't-hoard philosophy the memory stack already follows.

## Cross-references

- [memory_procedural_six_gaps](memory_procedural_six_gaps) — the gap analysis this concretizes (move 1)
- [memory_ti_context_action_rules](memory_ti_context_action_rules) — the downstream distillation layer
- [th_http_api_scoped_no_db](th_http_api_scoped_no_db) — durable history the `th` API does not serve
- [memory_tb_ti_on_rasp](memory_tb_ti_on_rasp) — the Rasp hosting and perimeter pattern `tl` follows