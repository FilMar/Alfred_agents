# Architecture

## Frontmatter

tags: [architecture, tb, th, layer]
sources: [README.md, roadmap.md, setup.sh, alfred.md]
updated: 2026-07-02

## The three layers

Pi is a personal cognitive augmentation system. Two orthogonal CLIs plus a skill-managed wiki:

| Access | Name | Purpose |
|--------|------|---------|
| `tb` (CLI) | Third Brain | Semantic memory: ideas, concepts, connections. Immutable associative graph with backrefs and hybrid search. |
| `th` (CLI) | Third Hand | Agent orchestration with de Bono hats. Sequential and parallel flows, bwrap sandbox, SQLite tracking. |
| `.wiki/` (Omero skill) | Third Wiki | Local project wiki: structured markdown pages, style guides, code conventions. Maintained by the Omero skill (Read/Write/Edit/Glob/Grep). |

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
- [roadmap](roadmap) — development phase status
