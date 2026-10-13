---
tags: [memory, tb, refine, archive, delete, log]
sources: [conversation]
replaces: [memory_tb_refine_a_note_is_deleted_after_six_months_in_the_archive_with_a_log_line_first]
---

## Decision

The refiner deletes a note when the note is archived and its last signal is older than 365 days.

Zero means no signal in a year. It does not mean `trust` near zero, because `trust` never reaches zero. It only decays.

The hit counters start on 2026-09-21. So no note can have a year of silence before 2027-09-21, and no note can be deleted before that day. The rule needs no extra guard.

A note with no signal for a year is under 0.2 even at `trust` 1.0, because `1.0 * 0.5^(365/90)` is about 0.06 with the half-life of 90. The rule still asks for archived, because the half-life is not fixed.

Before each delete, the refiner appends one line to a log. The log is append-only. The line holds the `id`, `what`, `why` and `exchange` of the note.

- A hit before the last year gives no immunity. The decay already moved `trust` under 0.2.
- A ref does not save a note. `tb delete` removes the refs and backrefs of the neighbours, so the graph stays whole, with one node less.
- A note that came back above 0.2 left the archive. It has a recent signal, so the rule does not touch it.

## Why

The two errors do not cost the same. Keeping a useless note costs almost nothing. Deleting a good note that is the only copy costs all of it. For the old corpus that copy is the only one: of 793 notes, 756 have no `exchange`, so no raw text to rebuild from. The log is the only trace, and one line is cheap.

The count starts at the last signal. That removes the second clock that ran from `archived_at`. There is one date to reason about.

The step cannot be undone, so the notice is one year and not six months.

Alternatives that lost:

- **Six months from `archived_at`.** The first delete would come in July 2027, before one year of measure exists.
- **Delete after one month under 0.2.** About 328 old notes have no direct hit and would go.
- **Never delete.** The corpus grows without end and only moves the problem.
- **A ref or one old hit saves a note.** The first is a link, not a use. The second is a hook hit on an unrelated prompt.

## Cross-references

- [memory_tb_refine_an_archived_note_is_left_out_of_the_hook_only_and_a_deliberate_search_still_finds_it](memory_tb_refine_an_archived_note_is_left_out_of_the_hook_only_and_a_deliberate_search_still_finds_it) — how a note enters the archive
- [memory_tb_refine_the_archive_is_not_a_deletion_queue_because_a_deliberate_search_revives_a_note_and_the_hook_never_does](memory_tb_refine_the_archive_is_not_a_deletion_queue_because_a_deliberate_search_revives_a_note_and_the_hook_never_does) — how a note leaves the archive
- [memory_tb_refine_trust_measures_vitality_not_quality_so_the_archive_comes_before_any_delete](memory_tb_refine_trust_measures_vitality_not_quality_so_the_archive_comes_before_any_delete) — why an archive comes before a delete
- [memory_tb_refine_threshold_and_half_life_are_not_fixed_before_the_hit_rate_of_november_and_december_is_known](memory_tb_refine_threshold_and_half_life_are_not_fixed_before_the_hit_rate_of_november_and_december_is_known) — the half-life is not fixed yet
- [memory_raw_text_lives_in_the_archive_not_the_note](memory_raw_text_lives_in_the_archive_not_the_note) — why `exchange` is the way back to the raw text
