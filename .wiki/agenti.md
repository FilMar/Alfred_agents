# Agents

## Frontmatter

tags: [agents, skills, th, hats]
sources: [README.md, skills/]
updated: 2026-07-16

## Overview

Agents are Claude Code instances with a specialised system prompt (role + de Bono hat). They live in `skills/<name>/SKILL.md` and are executed via `th run --member <name>` or as Claude Code skills.

The `SKILL.md` file contains:
- Who the agent is (identity, behaviour)
- When to trigger it (implicit triggers)
- How it operates (work protocol)

## Available agents

| Agent | Role | Hat |
|-------|------|-----|
| `annibale` | Orchestrator: decomposes complex work into multi-agent flows with de Bono hats | Blue (process) |
| `oracolo` | Retrieves knowledge from the TB without interpreting | White (data) |
| `socrate` | Generates cognitive friction: finds contradictions and gaps, never closes | Black (critical) |
| `aristotele` | Curates TB syntheses: hubs, missing connections, dense clusters | Yellow (synthesis) |
| `platone` | Sediments ideas in the TB atomically and connectedly, with serendipity | Green (creative) |
| `feynman` | Teaches the TB corpus with the three-level Feynman technique | White + Yellow |
| `indiana` | Code archaeology: diagnoses patterns, debt, buried decisions | Black (critical) |
| `ermes` | Extracts text from URLs (web articles and YouTube) | White (data) |
| `prometeo` | Creates and improves skills, measures performance via evals and benchmarks | Green (creative) |
| `omero` | Maintains the local project wiki in `.wiki/` (direct file edits) | Blue (process) |
| `giano` | Designs and builds the th member team for a project | Blue (process) |
| `archimede` | Founds new projects through dialogue: produces README, ROADMAP, CLAUDE.md | — |
| `postino` | Manages email via Himalaya: triage, search, compose drafts (no send/delete) | — |
| `vasari` | Generates a Typst CV from free conversation or an existing CV/text | — |

`archimede`, `postino` and `vasari` are operational skills without a de Bono hat — invoked as Claude Code skills, not as `th` members. Total: 14 skills, matching `skills/`.

## De Bono hats

De Bono hats define the agent's cognitive frame:

| Hat | Frame | Typical use |
|-----|-------|-------------|
| White | Pure data, no interpretation | Retrieval, extraction |
| Black | Critical, risks, problems | Review, stress test |
| Yellow | Optimism, value, opportunities | Synthesis, positive synthesis |
| Green | Creativity, new ideas | Generation, design |
| Blue | Process, organisation | Orchestration, planning |
| Red | Emotions, intuitions | — |

Hats live in `tools/th/src/` (directory `hats/`). Use `th hats list` to see them all.

## Execution patterns

**Sequential** (one's output → next one's context):
```bash
th run --member oracolo --task "retrieve everything on X" --output /tmp/oracolo.out
th run --member feynman --task "$(cat /tmp/oracolo.out) — teach"
```

**Parallel** with `--detach`:
```bash
th run --member socrate --task "find gaps in..." --detach
th run --member aristotele --task "find clusters in..." --detach
# poll on /tmp/th-*.status, then synthesise
```

**Annibale** automatically orchestrates the right pattern by decomposing the problem into sub-tasks.

## Member lifecycle

1. `th member create <name> --hat <hat> --role "<role>"` — create the member
2. `th run --member <name> --task "<task>"` — execute in bwrap sandbox
3. `th history --member <name>` — run history
4. `th member promote <name>` — promote from local to global

## Cross-references

- [architettura](architettura) — system overview and sandbox
- [th_cli](th_cli) — full `th` commands
- [procedural_memory_gaps](procedural_memory_gaps) — why skills and `th` members don't yet learn from outcomes
