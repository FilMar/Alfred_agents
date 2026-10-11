---
tags: [agents, skills, th, boundary]
sources: [.wiki/agenti.md, .wiki/log.md]
---

## Decision

Two distinct things share the word "agent" in this repo — kept separate on purpose:

- **Skills** live in `skills/<name>/SKILL.md`, one per role. Executed inline: read the `SKILL.md`, follow its protocol directly. Never run via `th run --member`.
- **`th` members** are the project's agent roster (role + de Bono hat) — a separate concept from skills. Executed only through annibale or `th run`; never simulated inline, never invoked by naming a skill as `--member`.

A member's task text may ask it to *use* a skill ("use the christopher skill to retrieve...") — the member following a skill's protocol as instructed. That is not the harness dispatching to a skill.

## Why

Hats are a property of `th` members, not of skills — an old roster table that assigned hats to skills hid that boundary and went stale in the same move. The boundary also keeps accountability clear: a skill is a procedure a reader follows; a member is a sandboxed run with its own output files. Collapsing them makes every skill look runnable through `th` and every member look like documentation.

## Cross-references

- [agents_roster_lives_on_filesystem](agents_roster_lives_on_filesystem) — where the roster lives
- [th_verification_outside_members](th_verification_outside_members) — what members may and may not do
- [skill_convention_direct_cli](skill_convention_direct_cli) — the skill folder convention