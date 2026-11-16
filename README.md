# Pi

Personal agent tooling. One binary, `alfred`, holds the memory and runs delegated work. The skills in `skills/` tell an agent how to use it.

## The layers

| Access | Name | Purpose |
|--------|------|---------|
| `alfred rules` | Third Identity | Context→action rules: what to do in a given situation. The server distils them from past sessions. |
| `alfred hist` | Third Log | The archive of past sessions, with an episode per run of work: a summary and a date. |
| `alfred vault` | Vault | Shared knowledge across projects, written with the user. |
| `alfred command` | Third Hand | Delegated runs: a hat plus instructions, pi as a child process inside a bwrap sandbox. |
| `.wiki/` (Omero skill) | Third Wiki | Local project wiki: decisions, style guides, code conventions. Lives and dies with the project. |

`alfred serve` runs on the home server and holds the state. Every other `alfred` command is a client of it, through `ALFRED_URL`. `alfred command` runs on the local machine.

## Skills

| Skill | Role |
|-------|------|
| `annibale` | Agentic debate: viewpoints made on the fly, one synthesis |
| `piano` | Debates what a project or feature is for: writes `.design/main.md` |
| `polo` | Research by kind of question (Wikipedia, studies, data, news, web) and reading any URL |
| `feynman` | Teaches a topic as one visual page, from sources |
| `socrate` | Puts your reasoning under pressure with logic, memory and the web |
| `aristotele` | Curates the rules: duplicates, wrong rules, ghost rules |
| `indiana` | Code archaeology: diagnoses patterns and technical debt |
| `ritchie` | Production code: spec, contracts, tests, bodies, review |
| `pike` | Short, solid scripts |
| `dijkstra` | Makes code shorter after ritchie or pike |
| `edison` | Throwaway spikes |
| `efesto` | Creates and improves skills |
| `omero` | Maintains the local project wiki in `.wiki/` |
| `linus` | Manages GitHub via gh: issues, project board, recaps |
| `kara` | Bookmarks on Karakeep |

The always-current roster comes from the filesystem:

```bash
python3 skills/efesto/scripts/roster.py
```

## Setup

On a client:

```bash
./setup.sh
```

It needs `git` and `cargo`. It links the identity (`alfred.md`), the `skills/` directory and the extensions into `~/.claude/` and `~/.pi/agent/`, then installs `alfred` into `~/.local/bin` with `cargo install --git`. Set `ALFRED_URL` to the server, like `http://<server>:8791`.

On the server, the `filcloud_init` repo runs `setup.sh` and then starts `alfred serve` as a user unit, from `tools/alfred/deploy/alfred.service`.

## The rules and the wiki

**Rules** (`alfred rules`): what to do in a situation that recurs across projects. A hook searches them on every prompt.

**Local wiki** (`.wiki/`, via Omero): project-specific decisions, flows, architecture and conventions.

The two complement each other: a rule says what to do, the wiki says why this project does it this way.
