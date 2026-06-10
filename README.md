# Pi

Personal cognitive augmentation system. Three orthogonal layers that cooperate without overlapping.

## The Three Layers

| CLI | Name | Purpose |
|-----|------|---------|
| `tb` | Third Brain | Semantic memory: ideas, concepts, connections. Immutable associative graph. |
| `td` | Third Done | GTD: tasks, projects, commitments. Capture without friction, process with method. |
| `th` | Third Hand | Agent orchestration with de Bono hats. Sequential and parallel flows. |

## Agents

| Agent | Role |
|-------|------|
| `annibale` | Orchestrator: decomposes complex work into multi-hat flows |
| `platone` | Sediments ideas in the TB atomically and connectedly |
| `feynman` | Teaches the TB corpus with the Feynman technique |
| `socrate` | Generates cognitive friction: finds contradictions and gaps, never closes |
| `aristotele` | Curates TB syntheses: hubs, missing connections, clusters |
| `oracolo` | Retrieves knowledge from the TB without interpreting |
| `ermes` | Extracts text from URLs (web articles and YouTube) |
| `indiana` | Code archaeology: diagnoses patterns and technical debt |
| `prometeo` | Creates and improves skills |
| `omero` | Maintains the local project wiki in `.wiki/` |
| `giano` | Designs and builds the th member team for a project |

## Setup

```bash
./setup.sh
```

Installs the `tb`, `td`, `th` symlinks in `~/.local/bin/`.

---

## The Ritual

The system works only if used consistently. Three moments a day.

### Morning — Seneca (5 min)

```bash
td inbox      # process everything that has come in
td next       # pick 2-3 real tasks for the day
```

Nothing else. Do not plan the entire week — choose what you close today.

### During work — Alfred + th

Before answering on a topic that might be in the TB:

```bash
tb search "<topic>" --depth 1
```

For complex problems that benefit from multiple perspectives: Annibale orchestrates.
To extract content from URLs or videos: Ermes.
To capture tasks that emerge during work: `td add "<what>"` — without processing.

### End of session — Platone (10 min)

If there has been valuable output (a decision, an idea, a pattern): Platone sediments into the TB.
If the work was on a project with a wiki: Omero updates `.wiki/`.

The rule: if you do not sediment it now, it does not exist tomorrow.

### Weekly — Seneca + Aristotele

**Seneca weekly review**: empty inbox, review next actions, verify every project has a next action, look at the week ahead.

**Aristotele** (every 2-4 weeks): when the TB starts to feel dense, Aristotele creates hubs and connects isolated notes.

---

### The fundamental distinction

**Third Brain**: ideas that have value beyond the project — principles, patterns, cognitive tensions. No code blocks, no detailed technical documentation.

**Local wiki** (`.wiki/`): project-specific documentation — commands, flows, architecture, lore. Lives and dies with the project.

The two systems complement each other, they do not overlap.
