---
tags: [memory, tb, refine, trust, hits]
sources: [tools/tb/SPEC.md@61cd4c3, tools/tb/REVIEW.md@61cd4c3, conversation]
replaces: [memory_tb_refine_trust_is_a_derived_number_from_zero_to_one_and_the_last_signal_floors_at_the_counter_start]
---

## Decision

The refiner is a command of `tb`: `tb refine`. It is not a new tool like `td`. It works on the hit counters that `tb` writes on every note.

`trust` is a number from 0 to 1. A new note starts at 0.5. The refiner computes it from zero on every run, from `hits`, `hits_related`, `last_hit`, `last_hit_related` and `when`. No `trust` field is stored: it would be a cache of a fact the counters already hold. The one stored field is `archived_at`, a decision taken on one day that no counter can rebuild ([memory_refine_archive_hides_from_hook_only](memory_refine_archive_hides_from_hook_only)).

```
trust = min(1, 0.5 + 0.05 * min(hits, 10) + 0.02 * min(hits_related, 10))
        * 0.5 ^ (days_since_last_signal / 90)
```

- The last signal is the later of `last_hit` and `last_hit_related`. With no hit it is `max(when, COUNTERS_START)`, where `COUNTERS_START` is 2026-09-21, the first `last_hit` in the data. A future signal counts as zero days.
- The cap on `hits` does no work today, because the outer `min(1, ...)` cuts it. It stays because the weights are guesses. The cap on `hits_related` works.
- `trust` never touches the search `score`.
- Without `--apply` it is a dry run. The list of notes under 0.2 is sorted by `trust`, then by `id`: the notes closest to loss come first, and two runs compare with `diff`.

## Why

A derived number needs no rule, moment or owner for a change. The same inputs give the same value, so a new formula is a rerun, not a migration, and the value never drifts.

Lost: a counter that grows on every hit, because it drifts and cannot be replayed. Lost: promotion at N hits, a cliff with no ageing. Lost: `when` as the last signal for every note, because 130 notes sat under 0.2 at the first run, made before the counters existed. The floor gives them 119 days. Lost: a stored `trust`, because two copies drift and nobody reads it.

The weights and the half-life are guesses: [memory_tb_refine_threshold_and_half_life_are_not_fixed_before_the_hit_rate_of_november_and_december_is_known](memory_tb_refine_threshold_and_half_life_are_not_fixed_before_the_hit_rate_of_november_and_december_is_known).

## Cross-references

- [memory_score_is_always_the_engine_cosine](memory_score_is_always_the_engine_cosine) — why `trust` is a separate number
- [memory_tb_refine_hits_count_retrieval_not_use_and_start_on_2026_09_21](memory_refine_hits_measure_retrieval) — what the inputs mean
- [memory_tb_refine_an_archived_note_is_left_out_of_the_hook_only_and_a_deliberate_search_still_finds_it](memory_refine_archive_hides_from_hook_only) — the first consequence of a low value
- [memory_critic_is_f_textbook_as_a_test_and_no_record_question](memory_critic_is_f_textbook_as_a_test_and_no_record_question) — the open question on the life of provisional notes
- `memory_tb_refine_trust_is_a_derived_number_from_zero_to_one_and_the_last_signal_floors_at_the_counter_start@e3c3ec1` — the version that said each note gets a `trust` field
