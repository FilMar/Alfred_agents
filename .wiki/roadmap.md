# Roadmap

## Frontmatter

tags: [roadmap, phases, status]
sources: [roadmap.md]
updated: 2026-06-14

## Phase status

| Phase | Name | Status |
|-------|------|--------|
| 1 | Third Brain (`tb`) | Done |
| 2 | Third Hand (`th`) — Flow Engine | Done* |
| 3 | Third Brain Integration | Done |
| 4 | GTD Task Manager (`td`) | Done† |
| 5 | Third Wiki (`.wiki/`) | Done |
| 6 | Career Coach | Planned |
| 7 | Per-hat metrics | Planned |
| 8 | Personal Server + Remote Agent | Planned |

*Aggregate per-hat metrics still missing (Phase 2C incomplete).
†Source `tools/td/` absent from repo — broken symlink. DB exists in `~/.pi/td.db`.

## Phase 2 — detail (in progress)

### 2A — Member (done)
Create, list, get, delete, promote. `--tmp` flag. Name validation. Multi-path resolution. `TH_HATS_DIR` env var.

### 2B — Single execution (done)
`th run` with `--thinking`, `--model`, `--detach`, `--timeout`. bwrap sandbox. File descriptor safety (try/finally). `th models`.

### 2C — SQLite tracking (done, incomplete)
SQLite data layer (`~/.pi/th.db`). `th history`, `th get`.
**Missing**: aggregate per-hat metrics over time (output quality, tokens, duration).

## Phase 5 — Career Coach

Works better with an already-rich TB. Will consult TB before every response. Not generic — calibrated on real history and objectives.

## Phase 6 — Per-hat metrics

Data already ready (Phase 2C). Command `th stats [--member <name>]`.

## Phase 7 — Personal Server

Self-hosted server with `pi-core` container (Qdrant + SQLite) and `openclaw`. Telegram interface with separate topics (GTD, ThirdBrain, Dev, Recap, Alfred, Files). Nightly backup to Mega via `megacmd`.

## Immediate todo

- [ ] Restore `tools/td/` in repo (missing source, broken symlink)
- [ ] Aggregate per-hat metrics (`th stats`)

## Cross-references

- [architettura](architettura) — system overview
- [agenti](agenti) — completed operative skills
