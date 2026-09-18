---
tags: [skills, convention, scripts, efesto]
sources: [skills/efesto/SKILL.md, skills/efesto/references/MIGRATION.md]
---

## Decision

Every skill in `skills/` is one folder with up to three parts:

- `SKILL.md` — the instruction set the model reads. It is a **router**: only what every run needs, calling the real CLI **directly** (`tb`, `ti`, `th`, `gh`, ...).
- `scripts/` — optional. One executable file per **deterministic multi-step sequence**, self-described with a `# desc:` header (and `# usage:` when it takes arguments). Bash scripts set `set -euo pipefail` and validate arguments.
- `references/` — optional. One file per deep-dive topic; the model reads one only when the task needs it.

Efesto owns and lints the convention (`skills/efesto/scripts/lint_skill.py`, whole fleet by default). The threshold cuts both ways: a sequence reused identically belongs in a script; a script wrapping a single command gets inlined. Script lists are computed (`list_scripts.sh`), never hand-written. Some skills need no scripts (piano, omero, vinci — native tools only).

**Anti-patterns**: a skill calling `th run --member` directly; a wrapper recipe around a single command; a hand-written script inventory; `pi-just`/`just -f` leftovers.

## Why

Until 2026-08-18 every CLI call went through a per-skill justfile. The layer duplicated the interface: every change landed in both `SKILL.md` and the justfile, the two drifted, and most recipes were one-line wrappers. The fleet migrated off justfiles on 2026-08-18 (18 skills, one commit per skill, lint clean; zero justfiles or guard scripts left). One lesson survives from that era: **scripts run with the caller's cwd** — a script needing its own location resolves it from `$0` (bash) or `__file__` (Python), never from cwd.

## Cross-references

- [skill_router_pass_planned](skill_router_pass_planned) — the next pass on this convention
- [agents_roster_lives_on_filesystem](agents_roster_lives_on_filesystem) — derived-not-copied, applied to the roster too