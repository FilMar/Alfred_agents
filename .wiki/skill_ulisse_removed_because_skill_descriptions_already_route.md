---
tags: [skill, census, removal]
sources: [conversation]
---

## Decision

The skill `ulisse` is removed on 2026-10-12, with its script `list_skills.py`. It pointed to the right skill for a task. The removal is staged in git, not yet committed.

## Why

The user never used it. There is also a structural reason. The description of every skill is already in the agent's context, and that is what routes a task to a skill. A navigator skill repeats this work. It costs context and adds nothing.

The roster of skills is still available from `efesto`: `python3 scripts/roster.py`. It is computed from the files, so it cannot go stale.

## Cross-references

- [skill_jobs_removed_because_taskwarrior_is_no_longer_used](skill_jobs_removed_because_taskwarrior_is_no_longer_used) — removed in the same pass
- [agents_roster_lives_on_filesystem](agents_roster_lives_on_filesystem) — the same rule for the roster: derive it, never table it
- [agents_named_after_famous_figures](agents_named_after_famous_figures) — lists `ulisse` among current names; that page is history
