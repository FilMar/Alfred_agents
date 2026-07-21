# Third Log (tl)

A REST API for a unified, structured event log — extracted from `th`, shared by `th`, `tb`, `ti`, and any future producer. Not a CLI: called with `curl` or any HTTP client.

## Problem

`th` tracks every `th run` in a local SQLite file (`th.db`) — no other tool logs anything, and nothing is shared across machines or across tools. This half-covers [procedural_memory_gaps](../../.wiki/procedural_memory_gaps.md): without a single event log spanning `th`, `tb`, `ti`, and (eventually) skills, any attempt to extract or bridge behavior across systems has to be built three times — once per store.

## Solution

One append-only event log, hosted on the Rasp like `tb`'s Qdrant/Ollama backends, reached over HTTP inside the same Tailscale perimeter. `tl` records raw facts only — "X happened, in this context, with this outcome" — it never judges, distills, or merges. Distillation into context→action rules is [ti](../ti/README.md)'s job downstream, not `tl`'s.

### Schema

A single table, fixed envelope + free-form payload — not one table per source, so cross-source queries stay a single `SELECT`:

```
id:        string (uuid)
timestamp: string (ISO)
source:    string   # "th" | "tb" | "ti" | ...
actor:     string   # member/hat name, "tb", "ti", etc.
context:   string   # what was being done
outcome:   string   # result/verdict
tags:      string[]
metadata:  object   # free-form, source-specific fields (e.g. th: hat/tokens/duration; tb: note id/kind; ti: if/do added)
```

### Endpoints

- `POST /event` — ingest one event (envelope above).
- `GET /events` — query, filters: `source`, `actor`, `tags`, `since`/`until` (timestamp range), plus a `metadata` filter via `json_extract` for source-specific fields.

### Client behavior: fire-and-forget

Logging must never block or fail the caller's actual work. Every producer (`th`, `tb`, `ti`) posts to `tl` with a short timeout (~1-2s, no retry) and swallows failures into a stderr warning — an unreachable `tl` degrades to "no log entry", never to "the run didn't happen."

### Out of scope (for now)

- Skill invocation logging (would need a Claude Code hook — deferred, not designed here).
- Storing full dialogues/conversations — different volume and purpose, a structured event log is not a transcript archive.
- Migrating `th.db`'s existing history — never used or validated, starting fresh.

## Stack

- Bun + TypeScript, `Bun.serve` — same pattern as `tools/orchestrator`.
- SQLite (local file on the Rasp, path via `TL_DB`) — no Qdrant/Ollama involved, this is structured tabular data, not semantic search.

## Development

- Entry point: `tools/tl/src/main.ts`. Env: `TL_PORT`, `TL_DB`.
- Run locally: `bun tools/tl/src/main.ts`.
- Tests: `bun test tests/tl.test.ts` (to be added alongside implementation).
