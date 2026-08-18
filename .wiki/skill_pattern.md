---
tags: [pi, skills, convention, scripts]
sources: [skills/efesto/SKILL.md, skills/efesto/references/MIGRATION.md, skills/*/SKILL.md]
updated: 2026-08-18
---

# Skill Pattern

Every skill in `skills/` is one folder with up to three parts:

- `SKILL.md` — the instruction set the model reads. It is a **router**: it
  keeps only what every run needs, and it calls the real CLI **directly**
  (`tb`, `ti`, `th`, `gh`, ...).
- `scripts/` — optional. One executable file per **deterministic
  multi-step sequence**. Every script self-describes with a `# desc:`
  header.
- `references/` — optional. One file per deep-dive topic. `SKILL.md`
  links to them; the model reads one only when the task needs it.

The convention is owned and enforced by **efesto**
(`skills/efesto/SKILL.md`, the three rules). This page records it for the
project; efesto's copy is normative.

---

## Why direct CLI (justfile layer retired, 2026-08-18)

Until 2026-08-18 every CLI call went through a per-skill `justfile`
(called via a `pi-just` wrapper). Retired because the layer duplicated
the interface: every change had to land in both `SKILL.md` and the
justfile, the two drifted, and most recipes were one-line wrappers.
The replacement keeps one source of truth per call:

- One-line CLI call → written directly in `SKILL.md` prose.
- Multi-step deterministic sequence → one script in `scripts/`, called
  from `SKILL.md`. Scripts call the pure CLI too.

One lesson from the justfile era survives: **scripts run with the
caller's cwd**. A script that needs its own location resolves it from
`$0` (bash) or `__file__` (Python) — it does not assume cwd.

---

## The script contract

- Executable, with a shebang line.
- `# desc: <one line>` header in the first 5 lines.
- `# usage: ...` header when it takes arguments.
- Bash scripts set `set -euo pipefail` and validate their arguments.
- The threshold cuts both ways: a sequence reused identically belongs in
  a script; a script that wraps a single command gets deleted and its
  command inlined in `SKILL.md`.

Script lists are computed, never written by hand:

```bash
skills/efesto/scripts/list_scripts.sh <skill_path>   # names + desc headers
```

---

## Audit and lint

```bash
python3 skills/efesto/scripts/lint_skill.py [<skill_path>]  # no arg: whole fleet
```

Lint flags: leftover `justfile`, `just`/`pi-just` calls in `SKILL.md`
code blocks, scripts without `# desc:`, references to missing scripts,
scripts never mentioned in `SKILL.md`, invalid frontmatter, `SKILL.md`
over 200 lines (split into `references/`). Rules 1 (predictability) and
2 (easy English) need a read, not a grep — see efesto.

---

## Non-operational skills

Some skills use only Claude native tools and need no `scripts/`:
`piano` (dialogue), `vinci` (file editing), `omero` (`Read`/`Write`/
`Edit`/`Glob`/`Grep` on `.wiki/`).

---

## Anti-patterns

- **Skill calls a member directly**: `th run --member christopher ...`
  inside a skill is wrong. Use the skill itself inline, or route through
  annibale.
- **Wrapper recipe/script around a single command**: inline the command
  in `SKILL.md` instead.
- **Hand-written script inventory**: lists of scripts in `SKILL.md` or
  wiki pages go stale; derive them from the `# desc:` headers.
- **`pi-just` / `just -f` calls**: justfile-era leftovers; lint flags
  them. See [skill_migration](skill_migration).

---

## Cross-references

- [skill_migration](skill_migration) — ordered tasklist of skills still on the justfile layer
- [agenti](agenti) — list of available skills and their roles
- [th_cli](th_cli) — the runner used by annibale/fury and by efesto's test script
- [architettura](architettura) — the three layers: `tb`, `th`, `.wiki/`
