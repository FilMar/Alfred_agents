---
tags: [memory, tb, refine, trust, hits]
sources: [conversation, tools/tb/src/types.ts, tools/tb/src/notes.ts]
replaces: [memory_tb_refine_trust_is_a_derived_number_from_zero_to_one_and_replaces_the_promotion_switch]
---

## Decision

The refiner is a command of `tb`: `tb refine`. It is not a new tool like `td`. It works on data that already exists: the hit counters `tb` writes on every note.

Each note gets one new field, `trust`, a number from 0 to 1. A new note starts at 0.5. The refiner does not add to it. It computes it from zero on every run, from `hits`, `hits_related`, `last_hit`, `last_hit_related` and `when`.

The first formula is chosen by eye. It is tuned on a dry run, not argued here:

```
trust = min(1, 0.5 + 0.05 * min(hits, 10) + 0.02 * min(hits_related, 10))
        * 0.5 ^ (days_since_last_signal / 90)
```

- The last signal is the later of `last_hit` and `last_hit_related`.
- With no hit, the last signal is `max(when, COUNTERS_START)`. `COUNTERS_START` is 2026-09-21, the day of the first `last_hit` in the data.
- Hits are capped at 10, so no note dominates.
- A last signal in the future counts as zero days.
- `trust` never touches the search `score`. The search score stays the engine cosine.
- `status` stays for now, because `td` writes `provvisoria` into it. It becomes derived from `trust`, or goes away, when `trust` has proved itself.

`tb refine` runs as a dry run by default. It prints the spread of `trust` and the notes that would fall under 0.2. Only `--apply` writes. `--apply` does not exist in the first pass.

`COUNTERS_START` is a named constant. It is removed when the counters have months of history.

## Why

A switch from `provvisoria` to `promossa` needs a rule, a moment and an owner for the change. A derived number needs none of them. The same inputs always give the same value, so a change of formula is a rerun, not a migration. The value of a note never drifts toward 0 or 1 between runs. It depends on the days since the last signal, not on the previous value.

Alternatives that lost:

- **A counter that grows on every hit.** It drifts and cannot be replayed. A pure function can.
- **Promote at N hits.** It is a binary again, with one cliff and no way to age.
- **Use `when` as the last signal for every note.** The simulation on 2026-10-12 showed 130 notes under 0.2 at the first run, all with no hit and made in May or June. The counters did not exist then. Those notes had three weeks of measure, not four months. The floor gives them 119 days from 2026-09-21, to 2027-01-18.

The state of the corpus on 2026-10-11 shows why the number fits. Of 793 notes, 747 are `promossa` and 46 are `provvisoria`, all from 2026-09-29 or later. The old corpus never went through the switch. A number covers both groups with one rule.

The weights and the half-life are guesses. They are not fixed until the dry run has been read on the real notes. The decay cannot be tuned before about 30 days of hits exist.

## Cross-references

- [memory_score_is_always_the_engine_cosine](memory_score_is_always_the_engine_cosine) — why `trust` is a separate field
- [memory_tb_refine_hits_count_retrieval_not_use_and_start_on_2026_09_21](memory_tb_refine_hits_count_retrieval_not_use_and_start_on_2026_09_21) — what the inputs mean, and where 2026-09-21 comes from
- [memory_tb_refine_trust_under_point_two_archives_the_note_and_hides_it_from_search](memory_tb_refine_trust_under_point_two_archives_the_note_and_hides_it_from_search) — the first consequence of a low value
- [memory_critic_is_f_textbook_as_a_test_and_no_record_question](memory_critic_is_f_textbook_as_a_test_and_no_record_question) — the open question on the life of provisional notes
- [.memory_tb_refine_trust_is_a_derived_number_from_zero_to_one_and_replaces_the_promotion_switch](.memory_tb_refine_trust_is_a_derived_number_from_zero_to_one_and_replaces_the_promotion_switch) — the first version, without the floor
