---
tags: [memory, tb, refine, trust, threshold]
sources: [spikes/2026-10-13-trust-distribution/main.mjs, conversation]
---

## Decision

The archive threshold (0.2) and the half-life (90 days) are not fixed before the hit rate of November and December 2026 is known.

Until then `tb refine` stays a dry run. The weights stay as they are in the first pass. The first `--apply` waits for this reading.

## Why

A spike read the 798 real notes on 2026-10-13. The spike folder is not in git, so the numbers are here.

Today no note is under 0.2. All sit above 0.4, because the floor starts the clock for every old note on 2026-09-21. The dry run today says almost nothing. The future says more.

With no new hit from now on, the notes under 0.2 would be:

| Day from 2026-10-13 | Date | Notes under 0.2 |
|---|---|---|
| +60 | 2026-12-12 | 0 |
| +97 | 2027-01-18 | 164 |
| +120 | 2027-02-10 | 300 |
| +150 | 2027-03-12 | 589 |
| +200 | 2027-05-01 | 764 |
| +300 | 2027-08-09 | 798 |

Three facts follow:

- **One wave.** The 164 notes of 2027-01-18 have no hit and were made before the floor. They share one start date, so they fall on the same day. The first `--apply` on that day would archive 164 notes at once, unless some get a hit before.
- **A note must be found about every 4 to 5 months.** A note with no hit stays above 0.2 for 119 days. A note with 3 hits stays for about 150 days. The half-life of 90 days is hard on a corpus where 190 of 798 notes have no hit yet.
- **The rate is unknown.** The counters have 3 weeks of data. How often a note is found in a normal month is not measured. It decides if 90 days is too short and if 0.2 is too high.

Alternatives that lost:

- **Fix the values now, from the formula.** The weights are guesses made by eye. A wrong half-life archives good notes in a wave, and the archive can lose notes.
- **Move the floor to make the wave smaller.** It hides the problem. It does not give a better reading of the hit rate.

The review is simple. In January 2027, read the hit counts of the 190 notes with no hit. If most got a hit, keep 90 days. If few did, lengthen the half-life or lower the threshold before any `--apply`.

## Cross-references

- [memory_tb_refine_trust_is_a_derived_number_from_zero_to_one_and_the_first_pass_computes_it_and_stores_nothing](memory_tb_refine_trust_is_a_derived_number_from_zero_to_one_and_the_first_pass_computes_it_and_stores_nothing) — the formula and its weights
- [memory_tb_refine_the_archive_is_not_a_deletion_queue_because_a_deliberate_search_revives_a_note_and_the_hook_never_does](memory_tb_refine_the_archive_is_not_a_deletion_queue_because_a_deliberate_search_revives_a_note_and_the_hook_never_does) — how a note leaves the archive
- [memory_tb_refine_hits_count_retrieval_not_use_and_start_on_2026_09_21](memory_tb_refine_hits_count_retrieval_not_use_and_start_on_2026_09_21) — the hit counters and the date they start
