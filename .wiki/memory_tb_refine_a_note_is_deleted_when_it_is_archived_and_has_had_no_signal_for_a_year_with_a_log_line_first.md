---
tags: [memory, tb, refine, archive, delete, log]
sources: [conversation]
replaces: [memory_tb_refine_a_note_is_deleted_after_six_months_in_the_archive_with_a_log_line_first]
---

## Decision

The refiner deletes a note when it is archived and its last signal is older than 365 days. Zero means no signal in a year. It does not mean `trust` near zero, because `trust` never reaches zero: it only decays.

The hit counters start on 2026-09-21, so no note can have a year of silence before 2027-09-21, and none can be deleted before that day. The rule needs no extra guard. A note with no signal for a year is under 0.2 even at `trust` 1.0, because `1.0 * 0.5^(365/30)` is far under 0.01. The rule still asks for archived, because the half-life may change.

Before each delete, the refiner appends one line to an append-only log: the `id`, `what`, `why` and `exchange` of the note.

- A hit before the last year gives no immunity. The decay already moved `trust` under 0.2.
- A ref does not save a note. `tb delete` removes the refs and backrefs of the neighbours, so the graph stays whole with one node less.
- A note that came back above 0.2 left the archive and has a recent signal, so the rule does not touch it.

## Why

The two errors do not cost the same. Keeping a useless note costs almost nothing. Deleting a good note that is the only copy costs all of it. For the old corpus that copy is the only one: of 793 notes, 756 have no `exchange`, so no raw text to rebuild from. The log is the only trace, and one line is cheap. The step cannot be undone, so the notice is a year and not six months.

The count starts at the last signal. That removes the second clock that ran from `archived_at`.

Lost: six months from `archived_at`, because the first delete would come in July 2027, before one year of measure exists. Lost: one month under 0.2, because about 328 old notes with no direct hit would go. Lost: never delete, because the corpus grows without end. Lost: a ref or one old hit saves a note, because a link is not a use and an old hook hit is on an unrelated prompt.

## Cross-references

- [memory_tb_refine_an_archived_note_is_left_out_of_the_hook_only_and_a_deliberate_search_still_finds_it](memory_refine_archive_hides_from_hook_only) — how a note enters the archive
- [memory_tb_refine_trust_measures_vitality_not_quality_so_the_archive_comes_before_any_delete](memory_refine_hits_measure_retrieval) — why an archive comes before a delete
- [memory_tb_refine_threshold_and_half_life_are_not_fixed_before_the_hit_rate_of_november_and_december_is_known](memory_tb_refine_half_life_is_30_days) — the half-life is not fixed yet
- [memory_raw_text_lives_in_the_archive_not_the_note](memory_raw_text_lives_in_the_archive_not_the_note) — why `exchange` is the way back to the raw text
