---
tags: [skill, census, removal, distiller, platone, mose]
sources: [conversation, SPEC.md@d8c9f7c, REVIEW.md@d8c9f7c]
replaces: [skill_platone_may_retire_when_td_distill_runs_on_a_timer_and_its_quality_rules_must_outlive_it@c517871]
---

## Decision

`platone` and `mose` were removed on 2026-10-19 (commit `3e74af7`). `td` is now the only path that writes notes to `tb` and rules to `ti` from sessions.

Five `ti` rules that sent the agent to the two skills were deleted, not rewritten: `06dbf0d2`, `a031e066`, `afcdeb50`, `8454824e`, `f81885bf`. A rule that is still needed will come back from a session, through `td`.

A rule the user asks for explicitly does not need a skill. `td` picks it up from the session. If the user wants it now, the agent runs `ti guide`, then `ti search` and `ti add`.

## Why

`td` does the same work as both skills. It runs at session start when 50 exchanges are pending. Two paths that write the same stores drift apart. The trigger that `platone` waited for exists now.

The quality rules were the part with value after the skills. They moved into the tools: see [skill_quality_guides_are_printed_by_tb_guide_and_ti_guide](skill_quality_guides_are_printed_by_tb_guide_and_ti_guide).

What is lost, by choice:

- The serendipity bridge of `platone` (a random note and a ref). Phase 3 of `td` looks for bridges by shape, which is close.
- Distillation of a chosen window of `tl`. `td distill` by hand empties the pending queue, not a window.
- Rules from `tb` notes of kind `protocollo` (workflow B of `mose`). It was a one-time fill.
- Dedupe and clean-up of `ti`. Nothing owns it now.

A rule saved by `td` is not certain. The critic and the novelty judge can drop it. A rule that matters is checked later with `ti search`.

## Cross-references

- [memory_td_distills_by_itself_at_session_start](memory_td_distills_by_itself_at_session_start) — the trigger
- [skill_census_removed_erodoto_jobs_ulisse](skill_census_removed_erodoto_jobs_ulisse) — the batch skill removed before
