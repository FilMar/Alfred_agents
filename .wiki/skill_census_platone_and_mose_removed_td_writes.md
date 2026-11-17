---
tags: [skill, census, removal, distiller, platone, mose]
sources: [conversation, SPEC.md@d8c9f7c, REVIEW.md@d8c9f7c, tools/alfred/src/distill/cli.rs]
replaces: [skill_platone_may_retire_when_td_distill_runs_on_a_timer_and_its_quality_rules_must_outlive_it@c517871]
---

## Decision

`platone` and `mose` were removed on 2026-10-19 (commit `3e74af7`). The distiller is now the only path that writes rules from sessions. Today it runs in `alfred serve` and writes no notes.

Five `ti` rules that sent the agent to the two skills were deleted, not rewritten: `06dbf0d2`, `a031e066`, `afcdeb50`, `8454824e`, `f81885bf`. A rule that is still needed will come back from a session, through the distiller.

A rule the user asks for explicitly does not need a skill. The distiller picks it up from the session. If the user wants it now, the agent runs `alfred rules guide`, then `alfred rules search` and `alfred rules add`.

## Why

The distiller does the same work as both skills. It starts on the server after an ingest, past a threshold. Two paths that write the same stores drift apart. The trigger that `platone` waited for exists now.

The quality rules were the part with value after the skills. They moved into the tools: see [skill_quality_guides_are_printed_by_tb_guide_and_ti_guide](skill_quality_guides_are_printed_by_tb_guide_and_ti_guide).

What is lost, by choice:

- The serendipity bridge of `platone` (a random note and a ref). Phase 3 of `td` looked for bridges by shape, which was close. The distiller in `alfred serve` writes no notes, so no bridge is left.
- Distillation of a chosen window of `tl`. `alfred distill` by hand runs the pending queue or one session, not a window.
- Rules from `tb` notes of kind `protocollo` (workflow B of `mose`). It was a one-time fill.
- Dedupe and clean-up of the rules. Nothing owned it then. Aristotele owns it now.

A rule saved by `td` is not certain. The critic and the novelty judge can drop it. A rule that matters is checked later with `alfred rules search`.

## Cross-references

- [memory_distill_starts_on_ingest_by_threshold](memory_distill_starts_on_ingest_by_threshold) — the trigger
- [skill_census_removed_erodoto_jobs_ulisse](skill_census_removed_erodoto_jobs_ulisse) — the batch skill removed before
