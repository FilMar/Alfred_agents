---
tags: [skill, census, removal, distiller]
sources: [conversation]
---

## Decision

The skill `erodoto` is removed on 2026-10-12. It emptied the `tl pending` queue. The removal is staged in git, not yet committed.

`platone` stays for now. It is the only way to consolidate by hand until `td distill --active` runs on a timer. When that happens, `platone` is retired too.

## Why

`erodoto` was a batch version of two other skills. It saved concepts to the Third Brain, which is the job of `platone`. It saved corrections as rules in Third Identity, which is the job of `mose`. The distiller `td` now does the same work on its own. Three paths to the same result would drift apart.

The roadmap task said "then retire erodoto" after the timer. The user decided to retire it earlier. The task now says "then retire platone".

A lesson from this case, as an idea and not a rule: an automation replaces a skill only if it also covers the side effects of that skill, not just the main function.

## Cross-references

- [memory_distillation_stays_manual_for_now](memory_distillation_stays_manual_for_now) — the earlier plan, written when distillation was manual
- [memory_distiller_is_its_own_tool_td_and_tl_stays_the_register](memory_td_is_its_own_tool) — the tool that replaces it
- [skill_platone_may_retire_when_td_distill_runs_on_a_timer_and_its_quality_rules_must_outlive_it](skill_platone_may_retire_when_td_distill_runs_on_a_timer_and_its_quality_rules_must_outlive_it) — what is left to do for `platone`
