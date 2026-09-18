---
tags: [memory, procedural, gaps, diagnosis]
sources: [conversation, .wiki/procedural_memory_gaps.md]
---

## Decision

`tb` covers semantic memory only — facts, concepts, connections, retrieved by similarity. Six gaps stand between what the system does and what it could learn from doing:

1. **No telemetry on skills** — `th.db` tracks member runs; skills (omero, platone, polo, ...) log nothing: no invocation frequency, context, or outcome.
2. **No extraction of the procedure from the outcome** — even with per-hat metrics, the result is a score, not the action sequence that produced it.
3. **No trigger-indexed procedure store** — `tb` indexes by semantic similarity; skills are triggered by hand-written descriptions. Nothing is indexed by situational context derived from data.
4. **No revision/versioning loop** — `tb` is additive only; skills change only when a human rewrites them.
5. **No bridge between the three stores** — `th.db`, `skills/`, `tb` share no schema or identifiers; no single event spans all three.
6. **No member↔skill promotion pipeline** — an effective member pattern has no path to becoming a skill, and back.

Gap 1 is the hard prerequisite (without skill data, gaps 2-6 have nothing to operate on for half the system). Gap 5 is the architectural bottleneck: with the stores isolated, any fix to 2, 4, or 6 risks being built three times.

## Why

`th.db` (Phase 2C) and the planned per-hat metrics are scoring layers — they measure how well a member performs. They do not extract, store, or revise reusable procedures. Measuring is half the job; the procedure itself is the other half, and nothing touches it.

## Cross-references

- [memory_log_first_three_moves](memory_log_first_three_moves) — the adopted strategy on top of this diagnosis
- [memory_ti_context_action_rules](memory_ti_context_action_rules) — the partial resolution of gaps 3-4
- [memory_tl_unified_event_log](memory_tl_unified_event_log) — move 1, the store that unblocks gaps 1 and 5