---
tags: [memory, tb, refine, trust, hits]
sources: [tools/tb/SPEC.md@61cd4c3, tools/tb/REVIEW.md@61cd4c3, conversation]
replaces: [memory_tb_refine_trust_is_a_derived_number_from_zero_to_one_and_the_last_signal_floors_at_the_counter_start]
---

## Decision

The refiner is a command of `tb`: `tb refine`. It is not a new tool like `td`. It works on data that already exists: the hit counters `tb` writes on every note.

`trust` is a number from 0 to 1. A new note starts at 0.5. The refiner does not add to it. It computes it from zero on every run, from `hits`, `hits_related`, `last_hit`, `last_hit_related` and `when`.

The first pass computes `trust` and writes nothing. It prints the spread and the notes under 0.2. No `trust` field is added to the note. A stored `trust` would be a cache: a second copy of a fact the counters already hold. It is decided later, and only when a consumer needs to read it. Until then the only field worth storing is `archived_at`, because it is a decision taken on one day and no counter can rebuild it.

The formula is chosen by eye. It is tuned on a dry run, not argued here:

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

`tb refine` is a dry run. Only `--apply` will write, and it does not exist in the first pass. An unknown option is refused.

`COUNTERS_START` is a named constant. It is removed when the counters have months of history.

## Why

A switch from `provvisoria` to `promossa` needs a rule, a moment and an owner for the change. A derived number needs none of them. The same inputs always give the same value, so a change of formula is a rerun, not a migration. The value of a note never drifts toward 0 or 1 between runs. It depends on the days since the last signal, not on the previous value.

Alternatives that lost:

- **A counter that grows on every hit.** It drifts and cannot be replayed. A pure function can.
- **Promote at N hits.** It is a binary again, with one cliff and no way to age.
- **Use `when` as the last signal for every note.** The simulation on 2026-10-12 showed 130 notes under 0.2 at the first run, all with no hit and made in May or June. The counters did not exist then. Those notes had three weeks of measure, not four months. The floor gives them 119 days from 2026-09-21, to 2027-01-18.
- **Store `trust` on every note now.** Two copies of one fact drift apart. The signals are the source and `trust` is a function of them. Nothing reads the field yet, so it would be debt with no user.

The state of the corpus on 2026-10-11 shows why the number fits. Of 793 notes, 747 are `promossa` and 46 are `provvisoria`, all from 2026-09-29 or later. The old corpus never went through the switch. A number covers both groups with one rule.

The weights and the half-life are guesses. They are not fixed until the dry run has been read on the real notes. The decay cannot be tuned before about 30 days of hits exist.

## Cross-references

- [memory_score_is_always_the_engine_cosine](memory_score_is_always_the_engine_cosine) — why `trust` is a separate number
- [memory_tb_refine_hits_count_retrieval_not_use_and_start_on_2026_09_21](memory_tb_refine_hits_count_retrieval_not_use_and_start_on_2026_09_21) — what the inputs mean
- [memory_tb_refine_trust_measures_vitality_not_quality_so_the_archive_comes_before_any_delete](memory_tb_refine_trust_measures_vitality_not_quality_so_the_archive_comes_before_any_delete) — what the number does not say
- [memory_tb_refine_an_archived_note_is_left_out_of_the_hook_only_and_a_deliberate_search_still_finds_it](memory_tb_refine_an_archived_note_is_left_out_of_the_hook_only_and_a_deliberate_search_still_finds_it) — the first consequence of a low value
- [memory_critic_is_f_textbook_as_a_test_and_no_record_question](memory_critic_is_f_textbook_as_a_test_and_no_record_question) — the open question on the life of provisional notes
- `memory_tb_refine_trust_is_a_derived_number_from_zero_to_one_and_the_last_signal_floors_at_the_counter_start@e3c3ec1` — the version that said each note gets a `trust` field
