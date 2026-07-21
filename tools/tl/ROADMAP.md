# Roadmap

## Foundation
- [ ] Define `Event` type (`id`, `timestamp`, `source`, `actor`, `context`, `outcome`, `tags`, `metadata`)
- [ ] SQLite schema + migration: single `events` table, `metadata` and `tags` stored as JSON text columns, queried via `json_extract`/`json_each`
- [ ] `TL_PORT` / `TL_DB` env vars (defaults following `ORCH_PORT`/`ORCH_DIR` convention)

## REST API
- [ ] `POST /event` — validate envelope, insert, return the generated `id`
- [ ] `GET /events` — filters: `source`, `actor`, `tags` (any-match), `since`/`until`, `metadata` (json_extract-based filter expression)
- [ ] Basic input validation (reject malformed envelope with 400, no crash on bad `metadata` JSON)

## Client integration
- [ ] Remove `th.db` (SQLite) from `th` entirely — no local state left
- [ ] `th` posts one event per `th run` (start/end or just completion — decide at implementation) to `tl`, fire-and-forget: short timeout (~1-2s), zero retry, failures logged to stderr and swallowed, never block or fail the run
- [ ] `th history` / `th stats` — leave as empty/stub commands for now (not rewired to `tl` yet)
- [ ] `tb`: post an event on `add`/`update` only, not on `search` (read volume is orders of magnitude higher and not a procedurally useful "event")
- [ ] `ti`: post an event on `add`/`append-do` only, not on `search` — same reasoning as `tb`

## Testing
- [ ] `tests/tl.test.ts` — mocked SQLite or in-memory DB, no dependency on a live server for unit tests
- [ ] Integration test: `POST /event` then `GET /events` round-trip with filters

## Deployment
- [ ] `deploy/tl.service` systemd unit on the Rasp (native process, same rationale as `tools/orchestrator/deploy/orchestrator.service` — filesystem-backed SQLite wants the host disk directly)
- [ ] No new auth: same Tailscale-only perimeter as the rest of the Rasp services

## Explicitly deferred
- Skill invocation logging via a Claude Code hook — investigate what hook fires on Skill use, design later
- Storing full dialogue/conversation content — separate concern, not this module's scope
