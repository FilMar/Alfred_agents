---
tags: [pi, skills, migration, tasklist]
sources: [skills/efesto/references/MIGRATION.md, skills/*/justfile]
updated: 2026-08-18
---

# Skill Migration — justfile → direct CLI + scripts

Tracks the migration of the fleet to the convention in
[skill_pattern](skill_pattern). Procedure per skill:
`skills/efesto/references/MIGRATION.md`. Live state of the fleet (this
page is a snapshot; the lint is the truth):

```bash
python3 skills/efesto/scripts/lint_skill.py
```

Done: **the whole fleet** (2026-08-18, branch
`refactoring/drop-justfile-abstraction`, one commit per skill starting
at `95bea9c` for efesto). The clio systemd unit (installed copy and
in-repo template) now points at `scripts/backup_all.sh`; the timer was
disabled before and stays disabled. Only the "After the fleet" items
below remain.

## Tasklist (in order)

Order: first the skills whose justfiles are referenced by `CLAUDE.md`
quick-lookups, then by frequency of use.

- [x] 1. `christopher` — CLAUDE.md quick-lookup (`tb search`). Update CLAUDE.md line in the same commit.
- [x] 2. `mose` — CLAUDE.md quick-lookup (`ti search`). Update CLAUDE.md line in the same commit. Also propose via mose the `ti` rule updates: the two justfile-era rules (lint-before-close, propose-new-recipe) plus the new "repeated flow → propose script" rule.
- [x] 3. `platone` — session-end ritual, used every day.
- [x] 4. `annibale` — orchestrator; biggest justfile, `th` flows; delete `scripts/guard.sh`; check the `ti` rule about task-text escaping (it names the annibale justfile).
- [x] 5. `jobs` — daily task management (`task`).
- [x] 6. `ermes` — email (`himalaya`).
- [x] 7. `linus` — GitHub for Emotion-SRL (`gh`).
- [x] 8. `draghi` — expenses (`xan`); recent active development.
- [x] 9. `clio` — backup: **check the systemd timer first** — if the unit calls the justfile, repoint it to the script in the same change.
- [x] 10. `atlante` — charts.
- [x] 11. `polo` — extraction; `scripts/article.py` and `scripts/youtube.py` need `# desc:` headers and exec bit.
- [x] 12. `feynman` — small justfile (`tb`).
- [x] 13. `socrate` — small justfile (`tb`).
- [x] 14. `aristotele` — `tb` read/write.
- [x] 15. `fury` — `th` member management.
- [x] 16. `indiana` — `find`/`grep`/`git`/`tb`.
- [x] 17. `ulisse` — `scripts/list_skills.py` needs header; probably redundant with efesto's roster — consider deleting the script.
- [x] 18. `vinci` — `typst`.

No justfile, nothing to migrate: `piano`, `omero`.

## After the fleet

- [ ] `alfred.md` — replace `pi-just` references.
- [ ] `CLAUDE.md` (global `~/.claude/CLAUDE.md` and project) — quick-lookup lines, roster line.
- [ ] Dotfiles — remove the `pi-just` shell function and `just` from skill docs.
- [ ] `ti` — rewrite the justfile-era rules (via mose, user confirms).
- [x] `.wiki/` — this page, [skill_pattern](skill_pattern), [agenti](agenti) roster command updated 2026-08-18; `th_cli` and `architettura` checked clean.

## Cross-references

- [skill_pattern](skill_pattern) — the target convention
- [agenti](agenti) — roster command
