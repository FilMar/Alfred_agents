---
tags: [skill, census, idea, piano, omero]
sources: [conversation]
---

## Decision

This is an open question, not a rule. Nothing is changed yet. The skill `piano` has not been read for this census.

The user finds `piano` rigid and badly joined to `omero`. There are two options to compare after reading it:

- Keep `piano`, and make it produce a seed of the wiki instead of a README. Then `omero` owns `.wiki/` from the first day.
- Fold `piano` into `omero` as a "set up a project" operation, and remove `piano`.

## Why

`piano` ends by writing `README.md`, a `justfile` and `CLAUDE.md`. Two points need a check:

- The justfile layer was retired for skills. It may be sediment in `piano`. A project can still use a justfile, so this is a question and not a finding.
- `omero` already owns the project wiki and has its own setup step. A second founding step creates two ways to start a project.

The decision waits for a read of the skill. It is 157 lines with no `references/`. That size alone makes it a sprawl candidate.

## Cross-references

- [wiki_decision_is_written_when_the_design_ends](wiki_decision_is_written_when_the_design_ends) — why this page is a question and not a decision
- [skill_router_pass_planned](skill_router_pass_planned) — `piano` is on its work order
- [skill_convention_direct_cli](skill_convention_direct_cli) — the justfile layer is retired
