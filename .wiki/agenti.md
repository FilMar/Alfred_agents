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

| Agent | Planned rename | Role | Hat |
|-------|-----------------|------|-----|
| `annibale` | `quartermaster` | Orchestrator: decomposes complex work into multi-agent flows with de Bono hats | Blue (process) |
| `oracolo` | `oracle` | Retrieves knowledge from the TB without interpreting | White (data) |
| `socrate` | `inquisitor` | Generates cognitive friction: finds contradictions and gaps, never closes | Black (critical) |
| `aristotele` | `cartographer` | Curates TB syntheses: hubs, missing connections, dense clusters | Yellow (synthesis) |
| `platone` | `gardener` | Sediments ideas in the TB atomically and connectedly, with serendipity | Green (creative) |
| `feynman` | `alchemist` | Teaches the TB corpus with the three-level Feynman technique | White + Yellow |
| `indiana` | `prospector` | Code archaeology: diagnoses patterns, debt, buried decisions | Black (critical) |
| `ermes` | `courier` | Extracts text from URLs (web articles and YouTube) | White (data) |
| `prometeo` | `blacksmith` | Creates and improves skills, measures performance via evals and benchmarks | Green (creative) |
| `omero` | `scribe` | Maintains the local project wiki in `.wiki/` (direct file edits) | Blue (process) |
| `giano` | `summoner` | Designs and builds the th member team for a project | Blue (process) |
| `architect` (renamed, was `archimede`) | done | Founds new projects through dialogue: produces README, ROADMAP, CLAUDE.md | — |
| `postman` (renamed, was `postino`) | done | Manages email via Himalaya: triage, search, compose drafts (no send/delete) | — |
| `biographer` (renamed, was `vasari`) | done | Generates a Typst CV from free conversation or an existing CV/text | — |

`archimede`, `postino` and `vasari` are operational skills without a de Bono hat — invoked as Claude Code skills, not as `th` members. Total: 14 skills, matching `skills/`.

## Naming rename — mythological figures to professions (decision, not yet executed)

Decision (2026-07-22): drop the mythological/historical-figure names (Annibale, Oracolo, ...) in favour of professions — a mix of historical/real (architect, cartographer, courier, scribe, gardener, postman, biographer, quartermaster, oracle) and fantastical/evocative (alchemist, summoner, prospector, blacksmith, inquisitor). Goal: keep personality per role (unlike flat function names such as `consolidate-memory`) while making the name itself hint at what the role does, which a proper noun cannot.

Two earlier options were tried and rejected before this one:
- Plain functional names (e.g. `consolidate-memory`, `orchestrate`) — technically sufficient since Skill/`th` dispatch matches on *description*, not name, but flattens the per-role personality the mythological names carried.
- D&D classes (Fighter, Wizard, Cleric, ...) — rejected by the user as unconvincing, even after a full 1:1 mapping across all 14 skills.

Naming collisions to note: `oracolo → oracle` and `postino → postman` are near-identical translations, kept because the original name already *was* the job title in spirit — no rename was actually needed there for meaning, only for cross-language/style consistency with the rest of the roster.

Status: decision record only. The `skills/<name>/` directories, `SKILL.md` frontmatter, the `th` member names, and every reference in `alfred.md` / `CLAUDE.md` (workflow trigger table) still use the old mythological names — the rename will be executed incrementally, skill by skill, in follow-up sessions. This table is the source of truth for that work; do not diverge from it without updating this page first.

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
