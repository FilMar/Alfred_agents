# Third Log (tl)

```yaml
tags: [architecture, memory, tl, rest, sqlite]
sources: [conversation, tools/tl/README.md, tools/tl/ROADMAP.md, tools/tl/CLAUDE.md]
updated: 2026-07-21
```

## Overview

`tl` (Third Log) is a new module, founded via Archimede on 2026-07-21: a unified, structured event log extracted out of `th`'s local SQLite tracking, shared by `th`, `tb`, `ti`, and future producers. Not yet implemented (README/ROADMAP/CLAUDE.md only, in `tools/tl/`); this page documents the settled design.

**Not a CLI, unlike `tb`/`th`/`ti`**: `tl` is a REST API, called with `curl` or any HTTP client — there is no `tl` command wrapping it. Hosted on the Rasp (`Bun.serve`, same pattern as [orchestrator_overview](orchestrator_overview)), inside the same Tailscale perimeter as [tb_on_rasp](tb_on_rasp). Storage is SQLite (`TL_DB`), not Qdrant — this is structured tabular data with filters, not semantic search.

## Why extracted from th

`th` today tracks every `th run` in a local file (`th.db`), and nothing else logs anything, anywhere. This is `procedural_memory_gaps`'s gap 5 in miniature: without one event log spanning every tool, any fix to gaps 2/4/6 risks being built once per store. `tl` is that log, refined into a standalone service rather than an extension of `th.db` — see [procedural_memory_gaps](procedural_memory_gaps) for the full gap analysis this concretizes.

## Schema

A single `events` table, fixed envelope + free-form payload — deliberately **not** one table per source:

```
id:        string (uuid)
timestamp: string (ISO)
source:    string   # "th" | "tb" | "ti" | ...
actor:     string   # member/hat name, "tb", "ti", etc.
context:   string   # what was being done
outcome:   string   # result/verdict
tags:      string[]
metadata:  object   # free-form, source-specific (th: hat/tokens/duration; tb: note id/kind; ti: if/do added)
```

Splitting into per-source tables was considered and rejected: the entire point of `tl` is that one query can span every source. Multiple tables would silently recreate the fragmentation the module exists to remove.

## Endpoints

- `POST /event` — ingest one event.
- `GET /events` — query, filters: `source`, `actor`, `tags`, `since`/`until`, plus a `metadata` filter via `json_extract` for source-specific fields.

## Client behavior: fire-and-forget

Every producer posts with a short timeout (~1-2s) and zero retry, swallowing failures into a stderr warning. An unreachable `tl` must degrade to "no log entry", never to "the caller's actual work failed or was blocked." This is the orchestrator's "audit does not execute" principle inverted: there, the guardrail must never let unaudited code run; here, the log must never be able to stop whoever is working.

## Conceptual boundary with ti

`tl` is a raw append-only fact register — it never judges, merges, or distills. Distillation into context→action rules is [ti_module](ti_module)'s job downstream. Keeping this boundary explicit matters because it was almost blurred earlier in the same design conversation (an LLM-in-the-tool merge step was proposed for `ti` and rejected for the same reason: intelligence belongs to the caller, not the store).

## What gets logged

- **`th`**: every run. `th.db` is removed entirely — `th` becomes a pure client with no local state, same shape `tb` already has.
- **`tb`**: writes only (`add`/`update`), not `search` — read volume is orders of magnitude higher than writes and a search has no clear procedurally-useful outcome to record.
- **`ti`**: writes only (`add`/`append-do`), not `search` — same reasoning.

## Explicitly out of scope (this founding)

- **Skill invocation logging** — would need a Claude Code hook; deferred, not designed here. Gap 1 (skill telemetry) stays open until this is built.
- **Storing full dialogues/conversations** — rejected earlier in the same design conversation: different volume and purpose, contradicts the project's existing distill-don't-hoard philosophy (Gardener extracts atomic notes from sessions, it doesn't archive them raw).
- **Migrating `th.db`'s existing history** — never used or validated, starting fresh.
- `th history`/`th stats` become empty/stub commands for now, not rewired to query `tl` yet.

## Cross-references

- [procedural_memory_gaps](procedural_memory_gaps) — the gap analysis `tl` concretizes (move 1: unify the event log)
- [ti_module](ti_module) — the downstream distillation layer `tl` feeds, and the boundary `tl` deliberately doesn't cross
- [architettura](architettura) — the layer table `tl` adds to, as a REST service rather than a CLI
- [th_cli](th_cli) — the `th.db`/`history`/`stats` surface `tl` is replacing
- [orchestrator_overview](orchestrator_overview) — the `Bun.serve` REST pattern `tl` reuses
- [tb_on_rasp](tb_on_rasp) — the Tailscale perimeter and Rasp-hosting pattern `tl` follows
