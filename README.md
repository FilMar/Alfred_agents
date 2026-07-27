# Pi

Personal cognitive augmentation system. Three orthogonal layers that cooperate without overlapping.

## The Three Layers

| Access | Name | Purpose |
|--------|------|---------|
| `tb` (CLI) | Third Brain | Semantic memory: ideas, concepts, connections. Immutable associative graph with hybrid search and hubs. |
| `th` (CLI) | Third Hand | Agent orchestration with de Bono hats. Project members, sequential and parallel flows. |
| `.wiki/` (Omero skill) | Third Wiki | Local project wiki: pages, style guides, code conventions. Plain markdown, maintained by Omero. Lives and dies with the project. |

## Agents

| Agent | Role |
|-------|------|
| `annibale` | Orchestrator: decomposes complex work into multi-hat flows |
| `piano` | Founds new projects through dialogue: produces README, ROADMAP, CLAUDE.md |
| `fury` | Designs and builds the th member team for a project |
| `platone` | Sediments ideas in the TB atomically and connectedly |
| `feynman` | Teaches the TB corpus with the Feynman technique |
| `socrate` | Generates cognitive friction: finds contradictions and gaps, never closes |
| `aristotele` | Curates TB syntheses: hubs, missing connections, clusters |
| `christopher` | Retrieves knowledge from the TB without interpreting |
| `polo` | Extracts text from URLs (web articles and YouTube) |
| `indiana` | Code archaeology: diagnoses patterns and technical debt |
| `efesto` | Creates and improves skills |
| `omero` | Maintains the local project wiki in `.wiki/` |
| `ermes` | Manages email via Himalaya: triage, search, compose drafts (no send/delete) |

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

For complex problems that benefit from multiple perspectives: Annibale orchestrates a multi-hat flow via its justfile.
To extract content from URLs or videos: Polo.

### On a project — Omero

Omero maintains the local wiki in `.wiki/` — plain markdown pages, style guides and code conventions. Delegate to Omero to ingest material, ask about the project, or document how the code is written. The skill operates on the files directly.

### End of session — Platone (10 min)

If there has been valuable output (a decision, an idea, a pattern): Platone sediments into the TB.
If the work was on a project with a wiki: Omero updates `.wiki/`.

The rule: if you do not sediment it now, it does not exist tomorrow.

### Periodically — Aristotele

When the TB starts to feel dense (every 2-4 weeks): Aristotele creates hubs and connects isolated notes.

---

### The fundamental distinction

**Third Brain** (`tb`): ideas that have value beyond the project — principles, patterns, cognitive tensions. No code blocks, no detailed technical documentation.

**Local wiki** (`.wiki/`, via Omero): project-specific documentation — commands, flows, architecture, conventions, lore. Lives and dies with the project.

The two systems complement each other, they do not overlap.
