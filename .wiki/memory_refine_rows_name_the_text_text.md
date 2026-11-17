---
tags: [memory, refine, tb, ti, output]
sources: [conversation, REVIEW.md@47c86ac, tools/alfred/src/rules/refine.rs, tools/tb/src/refine.ts@last-typescript]
---

## Decision

A row under the floor in the output of `alfred rules refine` has the fields `id`, `trust`, `text`, `when`, `hits`, `hits_related`. `text` was `what`. It holds the `if` of a rule, cut to 80 characters (`LOW_TEXT_CHARS`). `hits_related` is always 0: a rule has no related hits.

## Why

When `tb` existed, `tb refine` and `ti refine` used one function and printed one shape. `what` was a field of a note. A rule has no `what`, so a reader of `ti refine` would find the `if` under a wrong name. `text` fit both, and alfred kept the shape.

Rejected: keep `what` and explain it. Rejected: a second row type with an `if` field for `ti`. It doubles the code for one name.

The rename changed the output of `tb refine`. Only its tests read it.

## Cross-references

- [memory_ti_gets_hits_and_refine_exactly_like_tb](memory_ti_gets_hits_and_refine_exactly_like_tb) — why one function serves both
