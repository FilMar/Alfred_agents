# Agents

## Frontmatter

tags: [agents, skills, th, hats]
sources: [README.md, skills/, annibale/SKILL.md]
updated: 2026-07-27

## Overview

Two distinct things share the word "agent" here — kept separate on purpose (see [Cross-references](#cross-references) → `th_cli` for the full boundary):

- **Skills** — live in `skills/<name>/SKILL.md`, one per role (e.g. platone, omero, annibale). Executed inline: read the `SKILL.md`, follow its protocol directly. Never run via `th run --member`.
- **`th` members** — the project's agent roster (role + de Bono hat), a separate concept from skills. Executed only through annibale, never simulated inline and never invoked by naming a skill as `--member`.

A `SKILL.md` file contains:
- Who the agent is (identity, behaviour)
- When to trigger it (implicit triggers)
- How it operates (work protocol)

## Available agents

The roster is deliberately **not** tabled here — a copy in the wiki goes stale (a previous table claimed 14 skills while `skills/` held 17). The single source of truth is the filesystem; print it on demand:

```
python3 skills/efesto/scripts/roster.py
```

One line per skill (name + first sentence of its `SKILL.md` description), derived from the frontmatter at print time — renames and additions show up automatically.

Historical note: the old table also assigned a de Bono hat to each skill. Hats are a property of `th` members, not of skills (skills are never run as `--member`); per-member hats live in the member definitions (see [th_cli](th_cli)).

## Naming — three eras (current: figures, 2026-07-27)

1. **Figures, first era (original)** — mythological/historical proper nouns (Platone, Annibale, Oracolo, ...).
2. **Professions (2026-07-22)** — English profession names (gardener, quartermaster, oracle, ...) so the name itself hints at the function. Two options tried and rejected on the way: plain functional names (`consolidate-memory` — technically sufficient since dispatch matches on *description*, but flattens per-role personality) and D&D classes (unconvincing even after a full mapping).
3. **Figures, second era (2026-07-27, current)** — professions turned out functional but flavourless. New rule: **the most famous figure whose iconic trait coincides with the skill's function — any pantheon (myth, history, science, pop), single word, and it must pass the "bar test": hearing the name, you guess the function without footnotes.** This restores the personality of era 1 while keeping the name→function link that motivated era 2. Some originals returned to the same posts (platone, annibale).

Mapping (profession era → current): quartermaster→annibale, architect→piano, summoner→fury, gardener→platone, alchemist→feynman, inquisitor→socrate, cartographer→aristotele, oracle→christopher, courier→polo, prospector→indiana, blacksmith→efesto, scribe→omero, postman→ermes, biographer→vinci, foreman→linus, lawgiver→mose, steward→jobs.

Status: executed 2026-07-27 on branch `refactoring/skill-rename` — `skills/<name>/` directories, `SKILL.md` frontmatter, `alfred.md`, `CLAUDE.md`, `README.md` and `.wiki/` references. Profession names survive only in dated log entries and in this record.

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

These apply to `th` members (e.g. `knuth-black`, `turing-green` — real names follow `<name>-<hat>`), never to skills — a skill is never passed as `--member`. A member's `--task` can still ask it to *use* a skill (annibale does this throughout its flows, e.g. `"Use the christopher skill to retrieve..."`) — that's the member following a skill's protocol as instructed, not the harness dispatching to it.

**Sequential** (one's output → next one's context):
```bash
th run --member knuth-black --task "retrieve everything on X" --output /tmp/knuth.out
th run --member turing-green --task "$(cat /tmp/knuth.out) — build on it"
```

**Parallel** with `--detach`:
```bash
th run --member lusk-white --task "find gaps in..." --detach
th run --member von-neumann-blue --task "find clusters in..." --detach
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
