---
tags: [pi, skills, convention, justfile]
sources: [skills/*/SKILL.md, skills/*/justfile]
updated: 2026-08-10
---

# Skill Pattern

Every operational skill in `skills/` is **two files**: `SKILL.md` + `justfile`.

- `SKILL.md` is the instruction set the model reads.
- `justfile` is the executable boundary the model calls.

The model must never invoke a CLI tool directly from `SKILL.md`. It issues a `just` recipe, always through the `pi-just` wrapper (see below). The recipe hides the underlying binary, its flags, and its plumbing.

---

## Calling convention: `pi-just`

Every recipe call in `SKILL.md` uses `pi-just <skill> <recipe> [args...]`, never bare `just` and never `just -f <path>`:

```bash
pi-just christopher search "Zettelkasten" --limit 5 --depth 1
```

`pi-just` is a shell function (in dotfiles, `PI_REPO` exported):

```bash
pi-just() {
  local skill="$1"; shift
  local f
  f=$(find "$PI_REPO/skills" "$PI_REPO/tools" -maxdepth 2 -name justfile -path "*/$skill/justfile" 2>/dev/null | head -1)
  if [[ -z "$f" ]]; then
    echo "pi-just: no justfile found for skill '$skill'" >&2
    return 1
  fi
  just --justfile "$f" --working-directory "$(pwd)" "$@"
}
```

Why not bare `just` or `just -f`:

- **Bare `just <recipe>`** only works if the shell's cwd already happens to be the skill's own directory. It breaks the moment the recipe is invoked from anywhere else (e.g. a `th` member spawned by `annibale`, or a skill called from another skill's context).
- **`cd skills/<name> && just ...`** is worse: the Bash tool's cwd persists across calls in the same session, so this silently changes the working directory for every subsequent command — including unrelated ones.
- **`just -f <path>/justfile <recipe>`** finds the right justfile but, by `just`'s own default behavior, also switches the recipe's working directory to the justfile's directory. Fine for skills that only touch their own internal state (e.g. `mose`, `fury`), but wrong for anything that reads or writes files in the *caller's* actual working directory — `vinci` compiling a `.typ` the user is editing, `draghi` importing a CSV from the current project, a `th` member `annibale` launches that must operate on the real project tree, not on `skills/annibale/`.

`pi-just` resolves the justfile path from `PI_REPO` (so it works from any cwd) and explicitly pins `--working-directory` to the caller's actual `$(pwd)` (so the recipe's file operations land in the right place). One function, same call shape, correct in both cases — no per-skill judgment call needed.

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
pi-just christopher search "Zettelkasten" --limit 5 --depth 1
```

---

## Migration checklist

When creating or updating a skill:

1. Does the skill touch an external CLI? If yes, it needs a `justfile`.
2. Does `SKILL.md` show any command that is not `pi-just <skill> ...`? If yes, wrap it.
3. Does `compatibility` mention the skill's `justfile` instead of the raw binary?
4. Do all examples use the recipe names defined in the justfile, called through `pi-just`?

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
- **Bare `just <recipe>` or `just -f <path> <recipe>`**: works by accident when the cwd matches, breaks silently otherwise (wrong justfile found, or recipe runs with the wrong working directory). Always `pi-just <skill> <recipe>`.

---

## Related

- [agenti](agenti) — list of available skills and their roles
- [th_cli](th_cli) — the runner that lives behind annibale/fury justfiles
- [architettura](architettura) — the three layers: `tb`, `th`, `.wiki/`
