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
| `quartermaster` | Orchestrator: decomposes complex work into multi-agent flows with de Bono hats | Blue (process) |
| `oracle` | Retrieves knowledge from the TB without interpreting | White (data) |
| `inquisitor` | Generates cognitive friction: finds contradictions and gaps, never closes | Black (critical) |
| `cartographer` | Curates TB syntheses: hubs, missing connections, dense clusters | Yellow (synthesis) |
| `gardener` | Sediments ideas in the TB atomically and connectedly, with serendipity | Green (creative) |
| `alchemist` | Teaches the TB corpus with the three-level Feynman technique | White + Yellow |
| `prospector` | Code archaeology: diagnoses patterns, debt, buried decisions | Black (critical) |
| `courier` | Extracts text from URLs (web articles and YouTube) | White (data) |
| `blacksmith` | Creates and improves skills, measures performance via evals and benchmarks | Green (creative) |
| `scribe` | Maintains the local project wiki in `.wiki/` (direct file edits) | Blue (process) |
| `summoner` | Designs and builds the th member team for a project | Blue (process) |
| `architect` | Founds new projects through dialogue: produces README, ROADMAP, CLAUDE.md | — |
| `postman` | Manages email via Himalaya: triage, search, compose drafts (no send/delete) | — |
| `biographer` | Generates a Typst CV from free conversation or an existing CV/text | — |

`architect`, `postman` and `biographer` are operational skills without a de Bono hat — invoked as Claude Code skills, not as `th` members. Total: 14 skills, matching `skills/`.

## Naming rename — mythological figures to professions (done, 2026-07-23)

Decision (2026-07-22): drop the mythological/historical-figure names (Annibale, Oracolo, ...) in favour of professions — a mix of historical/real (architect, cartographer, courier, scribe, gardener, postman, biographer, quartermaster, oracle) and fantastical/evocative (alchemist, summoner, prospector, blacksmith, inquisitor). Goal: keep personality per role (unlike flat function names such as `consolidate-memory`) while making the name itself hint at what the role does, which a proper noun cannot.

Two earlier options were tried and rejected before this one:
- Plain functional names (e.g. `consolidate-memory`, `orchestrate`) — technically sufficient since Skill/`th` dispatch matches on *description*, not name, but flattens the per-role personality the mythological names carried.
- D&D classes (Fighter, Wizard, Cleric, ...) — rejected by the user as unconvincing, even after a full 1:1 mapping across all 14 skills.

Naming collisions to note: `oracolo → oracle` and `postino → postman` are near-identical translations, kept because the original name already *was* the job title in spirit — no rename was actually needed there for meaning, only for cross-language/style consistency with the rest of the roster.

Status: executed. All 14 `skills/<name>/` directories, `SKILL.md` frontmatter, `th` member names, and every reference in `alfred.md` / `CLAUDE.md` (workflow trigger table) and `.wiki/` now use the profession names. Old mythological names survive only in dated `.wiki/log.md` entries (historical record) and in this decision record itself.

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
th run --member oracle --task "retrieve everything on X" --output /tmp/oracle.out
th run --member alchemist --task "$(cat /tmp/oracle.out) — teach"
```

**Parallel** with `--detach`:
```bash
th run --member inquisitor --task "find gaps in..." --detach
th run --member cartographer --task "find clusters in..." --detach
# poll on /tmp/th-*.status, then synthesise
```

**Quartermaster** automatically orchestrates the right pattern by decomposing the problem into sub-tasks.

## Member lifecycle

1. `th member create <name> --hat <hat> --role "<role>"` — create the member
2. `th run --member <name> --task "<task>"` — execute in bwrap sandbox
3. `th history --member <name>` — run history
4. `th member promote <name>` — promote from local to global

## Cross-references

- [architettura](architettura) — system overview and sandbox
- [th_cli](th_cli) — full `th` commands
- [procedural_memory_gaps](procedural_memory_gaps) — why skills and `th` members don't yet learn from outcomes
