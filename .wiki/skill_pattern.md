---
tags: [pi, skills, convention, justfile]
sources: [skills/*/SKILL.md, skills/*/justfile]
updated: 2026-07-27
---

# Skill Pattern

Every operational skill in `skills/` is **two files**: `SKILL.md` + `justfile`.

- `SKILL.md` is the instruction set the model reads.
- `justfile` is the executable boundary the model calls.

The model must never invoke a CLI tool directly from `SKILL.md`. It issues a `just` recipe. The recipe hides the underlying binary, its flags, and its plumbing.

---

## Why

Separation keeps the skill stable when the tool changes:

- Swap `tb` from local CLI to HTTP API → change the `justfile`, not the skill instructions.
- Change `th` command syntax → change the `justfile`.
- Move from `himalaya` to another mail client → change the `justfile`.

It also prevents the model from confusing **skill** with **member**. A skill is executed inline by reading its `SKILL.md`. A `th` member is a separate agent launched only through orchestrator recipes. The justfile is the clean boundary between the two.

---

## Anatomy

### SKILL.md

- **Frontmatter**: `name`, `description` (trigger text), `compatibility` (must say "this skill's justfile + underlying ... available"), `allowed-tools`.
- **Body**: prose instructions + code blocks that show only `just` recipes.
- **No direct CLI references**: no `tb`, `ti`, `th`, `gh`, `himalaya`, `taskwarrior`, `python`, `curl`, etc. in command examples.

### justfile

- Lives in the same directory as `SKILL.md`.
- Exposes semantic recipes named after what the skill does, not after the wrapped binary.
- Handles all flag plumbing, defaults, quoting, and multi-step commands.
- For multi-word arguments uses `just` positional parameters or `variadic *FLAGS`.

Example from `skills/christopher/justfile`:

```just
default:
    @just --list

search query *FLAGS:
    tb search "{{query}}" {{FLAGS}}

browse *FLAGS:
    tb browse {{FLAGS}}

random:
    tb random

tags:
    tb tags
```

Used in `SKILL.md` as:

```bash
just search "Zettelkasten" --limit 5 --depth 1
```

---

## Migration checklist

When creating or updating a skill:

1. Does the skill touch an external CLI? If yes, it needs a `justfile`.
2. Does `SKILL.md` show any command that is not `just ...`? If yes, wrap it.
3. Does `compatibility` mention the skill's `justfile` instead of the raw binary?
4. Do all examples use the recipe names defined in the justfile?

---

## Non-operational skills

Some skills do not wrap a CLI and do not need a `justfile`:

- `piano` — pure dialogue, produces markdown files via Claude tools.
- `vinci` — pure file editing inside Typst templates.
- `omero` — uses Claude native tools (`Read`, `Write`, `Edit`, `Glob`, `Grep`) on `.wiki/`.

If a later evolution adds an external dependency, add a `justfile` then.

---

## Current skills following the pattern

| Skill | justfile wraps |
|---|---|
| linus | `gh` |
| ermes | `himalaya`, `ti` (triage rules) |
| jobs | `taskwarrior` |
| annibale | `th` (member/run/flow orchestration) |
| fury | `th` (member management) |
| efesto | `th`, `pi`, Python scripts |
| christopher | `tb` read |
| feynman | `tb` search |
| socrate | `tb` read |
| aristotele | `tb` read/write |
| platone | `tb`, `ti add` |
| mose | `ti` |
| polo | `python3` scripts |
| indiana | `find`, `grep`, `git`, `tb` search |

---

## Anti-patterns

- **Skill calls a member directly**: `th run --member christopher ...` inside a skill is wrong. Use the skill itself inline, or route through `annibale` recipes.
- **Direct binary in SKILL.md**: `tb search ...`, `gh issue create ...`, etc. belong in `justfile`, not in the markdown instructions.
- **No justfile for a CLI-wrapping skill**: the skill is not yet complete.

---

## Related

- [agenti](agenti) — list of available skills and their roles
- [th_cli](th_cli) — the runner that lives behind annibale/fury justfiles
- [architettura](architettura) — the three layers: `tb`, `th`, `.wiki/`
