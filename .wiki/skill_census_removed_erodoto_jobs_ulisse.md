---
tags: [skill, census, removal, distiller]
sources: [conversation]
replaces: [skill_erodoto_removed_because_td_replaces_it_and_it_only_batched_platone_and_mose@ec42277, skill_jobs_removed_because_taskwarrior_is_no_longer_used@bbe04b6, skill_ulisse_removed_because_skill_descriptions_already_route@bbe04b6]
---

## Decision

Three skills were removed on 2026-10-12, in the census of the skills (commit `94723f1`).

- **`erodoto`** emptied the `tl pending` queue. It was a batch version of `platone` (concepts to `tb`) and `mose` (corrections as rules in `ti`). `td` now does the same work on its own. `platone` stays until `td distill --active` has a trigger. Then it retires too.
- **`jobs`** managed tasks through Taskwarrior with GTD semantics. The user does not use Taskwarrior any more. Notes in `tb` that mention it stay: they are knowledge, not a skill.
- **`ulisse`** pointed to the right skill for a task, with the script `list_skills.py`. The roster is still printed by `efesto`: `python3 scripts/roster.py`.

## Why

A skill with no tool under it has no job. The user never used `ulisse`, and there is a structural reason too: the description of every skill is already in the context of the agent, and that is what routes a task to a skill. A navigator skill repeats the work and costs context.

`erodoto` would have been a third path to the same result, beside `platone`, `mose` and `td`. Three paths drift apart.

A lesson from `erodoto`, as an idea and not a rule: an automation replaces a skill only if it also covers the side effects of that skill, not just the main function.
