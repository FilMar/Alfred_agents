## Project

`tl` (Third Log): a REST API — not a CLI — providing one unified, append-only event log for `th`, `tb`, `ti`, and future producers. Hosted on the Rasp, called over HTTP.

## Stack

Bun + TypeScript, `Bun.serve`, SQLite (local file, path via `TL_DB`). No Qdrant/Ollama — this is structured tabular data, not semantic search.

## Constraints

- One `events` table with a fixed envelope (`id`/`timestamp`/`source`/`actor`/`context`/`outcome`/`tags`) plus a free-form `metadata` JSON column — never split into per-source tables. The entire reason `tl` exists is that a single query can span every source; per-source tables would silently recreate the fragmentation this module was founded to remove.
- `tl` never judges, merges, or distills. It records raw facts only. Any interpretation (deciding a pattern is worth keeping, merging near-duplicates) belongs in [ti](../ti/CLAUDE.md), never here.
- No blocking semantics for producers: this module must stay simple enough that a client can always treat a failed write as "log this warning and move on." Do not add features (retries, queuing, delivery guarantees) that would make client integration anything but fire-and-forget.
- Do not store full dialogue/conversation text. Out of scope by design, not by omission.

## How to work

- Check `tools/orchestrator/src/server.ts` for the established `Bun.serve` REST pattern in this repo before writing new routes — stay consistent.
- Tests use a mocked or in-memory SQLite instance — no test depends on a live server.
