# Roadmap

## Frontmatter

tags: [roadmap, phases, status]
sources: [conversation]
updated: 2026-07-16

## Phase status

| Phase | Name | Status |
|-------|------|--------|
| 1 | Third Brain (`tb`) | Done |
| 2 | Third Hand (`th`) — Flow Engine | Done |
| 3 | Third Brain Integration | Done |
| 4 | GTD Task Manager (`td`) | Archived† |
| 5 | Third Wiki (`.wiki/`) | Done |
| 6 | Career Coach | Planned |
| 7 | Per-hat metrics | Planned |
| 8 | Personal Server + Remote Agent | Planned |

†Source `tools/td/` removed from repo; broken `~/.local/bin/td` symlink deleted. Only the legacy DB `~/.pi/td.db` survives; the `taiichi` skill is gone. The `mvr` tool was likewise removed. Aggregate per-hat metrics (former Phase 2C gap) are deferred to Phase 7.

## Phase 2 — detail (done)

### 2A — Member (done)
Create, list, get, delete, promote. `--tmp` flag. Name validation. Multi-path resolution. `TH_HATS_DIR` env var.

### 2B — Single execution (done)
`th run` with `--thinking`, `--model`, `--detach`, `--timeout`. bwrap sandbox. File descriptor safety (try/finally). `th models`.

### 2C — SQLite tracking (done)
SQLite data layer (`~/.pi/th.db`). `th history`, `th get`.
**Deferred to Phase 7**: aggregate per-hat metrics over time (output quality, tokens, duration).

## Phase 6 — Career Coach

Works better with an already-rich TB. Will consult TB before every response. Not generic — calibrated on real history and objectives.

## Phase 7 — Per-hat metrics

Data already ready (Phase 2C). Command `th stats [--member <name>]`.

**Scope note**: this phase is a scoring layer, not procedural memory — it aggregates how well a member/hat performs, it does not extract or revise reusable procedures, and it does not touch skills at all. See [procedural_memory_gaps](procedural_memory_gaps).

## Phase 8 — Personal Server

Self-hosted server with `pi-core` container (Qdrant + SQLite). `openclaw` (an OpenClaw-style agent from the original plan) is **dropped**: the orchestrator's scheduler plus Matrix as control surface ([orchestrator_overview](orchestrator_overview), [rasp_node](rasp_node)) covers everything an agent of that kind would have done — scheduled tasks, ad-hoc triggers, notifications, and interactive agent chat via the `pi` relay (Interactive pi Chat in [orchestrator_overview](orchestrator_overview)) — inside the Tailscale perimeter. Interface: **Matrix dedicated bot** — originally planned as Telegram with separate topics (GTD, ThirdBrain, Dev, Recap, Alfred, Files), revised because a Telegram bot would expose the TB outside the Tailscale perimeter to anyone holding the token (see Pillar 5 rationale in [orchestrator_overview](orchestrator_overview) and [tb_on_rasp](tb_on_rasp)). Nightly backup to Mega via `megacmd`.

## Worksites & order

Three parallel worksites are now open beyond the numbered phases. Their dependency order:

1. **Orchestrator Phase 1 skeleton** ([roadmap_orchestrator](roadmap_orchestrator)) — **done**: catalog, FS-queue, scheduler, REST API implemented in `tools/orchestrator/` and accepted after a full `th` review cycle. Next on this worksite: Phase 2 (WoL, `i_wake`, provisioning pipeline).
2. **TB-on-Rasp migration** ([tb_on_rasp](tb_on_rasp)) — needs the Rasp provisioned (Qdrant + Ollama containers, see [rasp_node](rasp_node)); the mass re-embedding path additionally needs the orchestrator's WoL/`requiresDesktop` loop working.
3. **Events table / procedural memory** ([procedural_memory_gaps](procedural_memory_gaps)) — independent of the Rasp, can start anytime; ordered last only because its value accrues slowly (it needs months of accumulated events before the downstream pieces make sense).

Shared component: the **Matrix layer** serves both the orchestrator (notifications, `run_task`, wake) and the TB (`!tb search`). The homeserver and bot plumbing are built once; whether the two command families live in one bot or a dedicated TB bot ([tb_on_rasp](tb_on_rasp) leans dedicated) is an implementation detail to settle then.

## Immediate todo

- [ ] Aggregate per-hat metrics (`th stats`) — Phase 7
- [ ] `th` HTTP API entrypoint (`POST /run` detached + `GET /runs`, `/runs/:id`, `/runs/:id/out|log` — file-backed via `/tmp`, no DB — + member/hats routes) — scope agreed 2026-07-23, revised same day, see [th_cli](th_cli)

## Cross-references

- [architettura](architettura) — system overview
- [agenti](agenti) — completed operative skills
- [procedural_memory_gaps](procedural_memory_gaps) — what Phase 2C/7 still leave uncovered
- [tb_on_rasp](tb_on_rasp) — TB hosted on the Rasp, Matrix bot for agent-free reads (revises Phase 8)
