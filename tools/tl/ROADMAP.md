# Roadmap

Design: [`memory_tl_work_archive_not_event_log`](../../.wiki/memory_tl_work_archive_not_event_log.md). Plan: `ROADMAP_MEMORIA.md`, Fase 2.

## Foundation
- [ ] `types.ts` — the row types, the validator shared by both sides, the exchange id derived from the transcript
- [ ] `db.ts` — `bun:sqlite`, three tables, foreign keys on, no indexes
- [ ] `TL_DB` (the file on the Rasp), `TL_API_PORT` (8790), `TL_API_URL` (where the CLI looks)

## API (CRUD only)
- [ ] `POST /sessions`, `POST /exchanges`, `POST /contents` — upsert by id, validate before write
- [ ] `GET /sessions`, `GET /exchanges` — filters: `session`, `kind`, `since`, `until`, `distilled`, `limit`
- [ ] `GET /contents/:id` — one body, never listed in bulk
- [ ] `PATCH /exchanges/:id` — `distilled` only. Nothing else is mutable
- [ ] `GET /openapi.json` — static, hand written, like `tb` and `ti`

## CLI (all the logic)
- [ ] `tl ingest --transcript | --session | --all` — parse, group into exchanges, upsert
- [ ] `tl sessions`, `tl show <exchange>`, `tl cost`, `tl pending`
- [ ] `tl serve` — runs the API, for the Rasp

## Ingestion
- [ ] End-of-turn hook: hands over the transcript path or the session id, fire-and-forget, never blocks a turn
- [ ] Backfill of what is still on disk — the same `--all` run once

## Testing
- [ ] `tests/tl.test.ts` — the parser on a committed transcript fixture, the validator, the id derivation, the sums. In-memory SQLite, no live server

## Deployment
- [ ] `deploy/tl.service` systemd unit on the Rasp, native process: a SQLite file wants the host disk. Written as a user unit — no `User=`, `%h` for the home, and `loginctl enable-linger` or it stops at logout
- [ ] No auth: the same Tailscale-only perimeter as the rest of the node
- [ ] Into the Clio backups

## Deferred
- `subtask` rows — a `th` run writes its own, after Fase 6, born with `actor = hat` and never rewritten. No transcript holds them: a hat runs in its own process
- The tokens a native subagent spends inside itself (2.4% of output, measured). Its work is already in the parent exchange; only its internal cost is uncounted
- Indexes, and any compression of `contents` — added when a query is slow, not before
- Hindsight as the engine instead of writing the distiller — a Fase 3 decision, and it needs a spike first
- Skill invocations as rows — first find out which hook fires on a skill
