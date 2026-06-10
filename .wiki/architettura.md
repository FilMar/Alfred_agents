# Architecture

## Frontmatter

tags: [architecture, tb, th, tw, layer]
sources: [README.md, roadmap.md]
updated: 2026-06-06

## The three layers

Pi is a personal cognitive augmentation system composed of three orthogonal CLIs:

| CLI | Name | Purpose |
|-----|------|---------|
| `tb` | Third Brain | Semantic memory: ideas, concepts, connections. Immutable associative graph with backrefs and hybrid search. |
| `th` | Third Hand | Agent orchestration with de Bono hats. Sequential and parallel flows, bwrap sandbox, SQLite tracking. |
| `tw` | Third Wiki | Local project wiki. Structured pages, style guides, regex search. |
| `td` | Third Done | GTD: tasks, projects, commitments. Global SQLite DB in `~/.pi/td.db`. |

The layers do not overlap by design:
- **Third Brain**: ideas that have value beyond the project — principles, patterns, cognitive tensions. No code, no technical documentation.
- **Local wiki** (`.wiki/`): project-specific documentation — commands, flows, architecture. Lives and dies with the project.
- **Third Done**: global GTD tasks — not contextualised to the project.

## Storage and filesystem

```
~/.pi/
  agent/           # agent configuration (SYSTEM.md, skills/)
  th.db            # th run tracking (SQLite)
  td.db            # GTD tasks (SQLite)
  tw_registry.json # global wiki registry

~/.local/bin/      # symlinks: tb, th, td (setup.sh)

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
./setup.sh   # installs tb/th/td symlinks in ~/.local/bin/, links alfred.md and skills/
```

`tw` is not yet included in `setup.sh` (to be added, see [roadmap](roadmap)).

## Cross-references

- [agenti](agenti) — available agents and roles
- [th_cli](th_cli) — full `th` CLI
- [tw_cli](tw_cli) — full `tw` CLI
- [roadmap](roadmap) — development phase status
