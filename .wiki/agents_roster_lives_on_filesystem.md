---
tags: [agents, roster, skills]
sources: [.wiki/agenti.md]
---

## Decision

The skill roster is never tabled in wiki pages. The single source of truth is the filesystem; print it on demand:

```bash
python3 skills/efesto/scripts/roster.py
```

One line per skill (name + first sentence of its description), derived from the frontmatter at print time — renames and additions show up automatically.

## Why

A copy in the wiki goes stale: a previous table claimed 14 skills while `skills/` held 17. Deriving the roster from the filesystem costs nothing and cannot drift. A static table is only acceptable where it documents a *decision*, not an inventory.

## Cross-references

- [agents_skills_inline_members_via_th](agents_skills_inline_members_via_th) — the skills/members boundary the roster respects
- [skill_convention_direct_cli](skill_convention_direct_cli) — what a skill folder contains