---
tags: [memory, tb, ti, refine, trust, threshold]
sources: [conversation, SPEC.md@67c44cc, REVIEW.md@67c44cc, tools/tb/src/refine.ts]
replaces: [memory_tb_refine_threshold_and_half_life_are_not_fixed_before_the_hit_rate_of_november_and_december_is_known@86b2f64]
---

## Decision

The half-life of `trust` is 30 days (`HALF_LIFE_DAYS`), for `tb` and `ti` alike. The archive threshold stays at 0.2. The weights do not change.

A note with no hit drops under 0.2 about 40 days after its last signal: `0.5 * 0.5^(40/30)` is about 0.198. The notes with no signal since the floor of 2026-09-21 are archived from 2026-10-31. The rules of `ti`, with the floor on 2026-10-20, from 2026-11-29.

## Why

The archive is cheap. An archived note leaves the hook only. A deliberate search still finds it, and a hit brings it back. A note is deleted only after a year with no signal. So an early archive costs little, and a store that keeps notes nobody finds costs hook space every session.

The first plan waited for the hit rate of November and December 2026, with 90 days and a first wave on 2027-01-18. The user chose not to wait. The wait guarded against a wrong archive, and a wrong archive is undone by one search.

Where it will likely break: one wave on 2026-10-31. Every old note with no hit shares the floor date, so they leave the hook on the same day. A rule that fires twice a year is archived between two uses. Read the first archive list: if notes still in use leave, lengthen the half-life.

## Cross-references

- [memory_tb_refine_trust_is_a_derived_number_from_zero_to_one_and_the_first_pass_computes_it_and_stores_nothing](memory_tb_refine_trust_is_a_derived_number_from_zero_to_one_and_the_first_pass_computes_it_and_stores_nothing) — the formula and its weights
- [memory_refine_archive_hides_from_hook_only](memory_refine_archive_hides_from_hook_only) — how a note leaves the archive
- [memory_refine_hits_measure_retrieval](memory_refine_hits_measure_retrieval) — the hit counters and the date they start
