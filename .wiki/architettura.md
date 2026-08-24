# Architecture

```yaml
tags: [architecture, tb, th, layer]
sources: [README.md, setup.sh, alfred.md, tools/tb/src/infra.ts]
updated: 2026-08-18
```

## The three layers

Pi is a personal cognitive augmentation system. Two orthogonal CLIs plus a skill-managed wiki:

| Access | Name | Purpose |
|--------|------|---------|
| `tb` (CLI + HTTP API) | Third Brain | Semantic memory: ideas, concepts, connections. Additive associative graph with backrefs and hybrid search — notes are never deleted, but refs and tags can be updated (`tb update`). `tb serve` exposes the same operations over HTTP (Hono, port 8788) with a static `/openapi.json`, for registering `tb` as a Tool Server in OpenAPI-compatible clients — see [style_dual_entrypoint](style_dual_entrypoint). |
| `th` (CLI) | Third Hand | Agent orchestration with de Bono hats. Sequential and parallel flows, bwrap sandbox, SQLite tracking. |
| `.wiki/` (Omero skill) | Third Wiki | Local project wiki: structured markdown pages, style guides, code conventions. Maintained by the Omero skill (Read/Write/Edit/Glob/Grep). |
| `ti` (CLI + HTTP API) | Third Identity | Context→behavior memory: dedicated Qdrant collection `pi_identity`, distinct from `tb`'s semantic memory. See [ti_module](ti_module). `ti serve` mirrors `tb serve` (port 8789) — see [style_dual_entrypoint](style_dual_entrypoint). |
| `tl` (REST API, not a CLI) | Third Log | Unified structured event log for `th`/`tb`/`ti`, extracted from `th`'s local SQLite tracking. Hosted on the Rasp, called via `curl`/HTTP — no `tl` command. Founded 2026-07-21, not yet implemented — see [tl_module](tl_module). |

The layers do not overlap by design:
- **Third Brain**: ideas that have value beyond the project — principles, patterns, cognitive tensions. No code, no technical documentation.
- **Local wiki** (`.wiki/`, via Omero): project-specific documentation — commands, flows, architecture, conventions. Plain markdown. Lives and dies with the project.

> **Archived — Third Done (`td`)**: a GTD CLI once lived here as a fourth layer. Source `tools/td/` and the `~/.local/bin/td` symlink were removed; only the legacy DB `~/.pi/td.db` survives. It is no longer an active layer, and its `taiichi` skill is gone. Likewise removed: the `mvr` tool (multiversal rules game) — `bin` entry and symlink deleted.

## Storage and filesystem

```
~/.pi/
  agent/           # agent configuration (SYSTEM.md, skills/)
  th.db            # th run tracking (SQLite)
  td.db            # legacy GTD DB (source removed — see Archived note above)

~/.local/bin/      # symlinks: tb, th (setup.sh)

.wiki/             # local project wiki (markdown, managed by Omero)
.th/members/       # local project members
~/.th/members/     # global members
/tmp/.th/members/  # temporary members
```

### tb backing services

The `tb` CLI holds no local state: notes live as payloads in **Qdrant** (vectors + full note content) and query embeddings are computed by **Ollama**, both reached over HTTP (`QDRANT_URL`, `OLLAMA_URL` — `tools/tb/src/infra.ts`). Currently these run locally; the target is to host both on the Rasp so every client (desktop, laptop, Matrix bot) points at a single source of truth — see [tb_on_rasp](tb_on_rasp) and [rasp_node](rasp_node).

## Sandbox

Each `th run` is executed under `bwrap` if available. The filesystem is read-only except for:
- `cwd` (current project directory)
- `~/.pi`
- `~/.bun`
- `/tmp`

The agent cannot write outside these paths.

## Setup

```bash
./setup.sh   # installs tb/th symlinks in ~/.local/bin/, links alfred.md and skills/
```

The wiki needs no install — it is plain markdown in `.wiki/`, maintained by the Omero skill.

## Cross-references

- [agenti](agenti) — available agents and roles
- [th_cli](th_cli) — full `th` CLI
- [roadmap](roadmap) — future task list
- [tb_on_rasp](tb_on_rasp) — tb backing services moving to the Rasp
- [rasp_node](rasp_node) — everything running on the Rasp
- [ti_module](ti_module) — the new context→behavior memory layer
- [tl_module](tl_module) — the new unified event log, replacing `th.db`
- [style_dual_entrypoint](style_dual_entrypoint) — the CLI+HTTP API pattern behind `tb serve`/`ti serve`
