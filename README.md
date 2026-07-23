# Pi

Personal cognitive augmentation system. Three orthogonal layers that cooperate without overlapping.

## The Three Layers

| Access | Name | Purpose |
|--------|------|---------|
| `tb` (CLI) | Third Brain | Semantic memory: ideas, concepts, connections. Immutable associative graph with hybrid search and hubs. |
| `th` (CLI) | Third Hand | Agent orchestration with de Bono hats. Project members, sequential and parallel flows. |
| `.wiki/` (Scribe skill) | Third Wiki | Local project wiki: pages, style guides, code conventions. Plain markdown, maintained by Scribe. Lives and dies with the project. |

## Agents

| Agent | Role |
|-------|------|
| `quartermaster` | Orchestrator: decomposes complex work into multi-hat flows |
| `architect` | Founds new projects through dialogue: produces README, ROADMAP, CLAUDE.md |
| `summoner` | Designs and builds the th member team for a project |
| `gardener` | Sediments ideas in the TB atomically and connectedly |
| `alchemist` | Teaches the TB corpus with the Feynman technique |
| `inquisitor` | Generates cognitive friction: finds contradictions and gaps, never closes |
| `cartographer` | Curates TB syntheses: hubs, missing connections, clusters |
| `oracle` | Retrieves knowledge from the TB without interpreting |
| `courier` | Extracts text from URLs (web articles and YouTube) |
| `prospector` | Code archaeology: diagnoses patterns and technical debt |
| `blacksmith` | Creates and improves skills |
| `scribe` | Maintains the local project wiki in `.wiki/` |
| `postman` | Manages email via Himalaya: triage, search, compose drafts (no send/delete) |

## Setup

```bash
./setup.sh
```

Requires `bun`. Installs the `tb`, `th` symlinks in `~/.local/bin/`, links the identity (`alfred.md`) and the `skills/` directory into both `~/.claude/` and `~/.pi/agent/`.

---

## The Ritual

The system works only if used consistently.

### During work — Alfred + th

Before answering on a topic that might be in the TB:

```bash
tb search "<topic>" --depth 1
```

For complex problems that benefit from multiple perspectives: Quartermaster orchestrates a multi-hat flow via `th run`.
To extract content from URLs or videos: Courier.

### On a project — Scribe

Scribe maintains the local wiki in `.wiki/` — plain markdown pages, style guides and code conventions. Delegate to Scribe to ingest material, ask about the project, or document how the code is written. The skill operates on the files directly.

### End of session — Gardener (10 min)

If there has been valuable output (a decision, an idea, a pattern): Gardener sediments into the TB.
If the work was on a project with a wiki: Scribe updates `.wiki/`.

The rule: if you do not sediment it now, it does not exist tomorrow.

### Periodically — Cartographer

When the TB starts to feel dense (every 2-4 weeks): Cartographer creates hubs and connects isolated notes.

---

### The fundamental distinction

**Third Brain** (`tb`): ideas that have value beyond the project — principles, patterns, cognitive tensions. No code blocks, no detailed technical documentation.

**Local wiki** (`.wiki/`, via Scribe): project-specific documentation — commands, flows, architecture, conventions, lore. Lives and dies with the project.

The two systems complement each other, they do not overlap.
