---
tags: [memory, tb, refine, archive, search, hook]
sources: [conversation, extensions/tb_ti/claude.sh]
replaces: [memory_tb_refine_trust_under_point_two_archives_the_note_and_hides_it_from_search]
---

## Decision

A note with `trust` under 0.2 is archived. `tb refine --apply` writes `archived_at`, an ISO instant, at the first archive. It does not write it again while the note stays archived.

Archived means only that. Nothing moves and nothing is deleted. The note keeps its content, its refs and its backrefs.

An archived note is left out of the hook only. The hook (`extensions/tb_ti/claude.sh`) injects notes at every prompt with `tb search --depth 1 ...`. It passes `--no-archived` (`SearchOptions.exclude_archived`). The filter is one `is_empty` condition on `archived_at`, reused by the visit of the refs, so it cuts the related notes too. `td` does not pass the flag: a candidate equal to an archived note is a duplicate.

A deliberate `tb search` by the agent still finds archived notes. The result shows `archived_at`. That hit counts as a signal. On the next run `trust` is computed again. If it is 0.2 or more, `archived_at` is cleared and the hook injects the note again.

The threshold 0.2 is by eye. It is fixed later, after the hit rate is known. See [memory_tb_refine_threshold_and_half_life_are_not_fixed_before_the_hit_rate_of_november_and_december_is_known](memory_tb_refine_threshold_and_half_life_are_not_fixed_before_the_hit_rate_of_november_and_december_is_known).

## Why

Keeping a note costs almost nothing. There are about 800 notes, a few hundred KB. The cost is not storage. It is noise. The noise lives in the hook, which injects at every prompt. A deliberate search is read by an agent that reasons, and it is where a good note on a rare topic is found.

A hit measures retrieval, not value. A good note on a rare topic can sit at zero hits. Leaving it out of the hook loses nothing, and a deliberate search can still find it.

Risk: in a deliberate search archived notes compete with live ones by cosine alone, because `trust` never touches the search score. Old notes can appear. The result must show `archived_at`, so the agent can weigh them.

Alternative that lost: hide archived notes from all search, with an option to include them. It closes the way back, because nobody asks for the archive by chance. It turns the archive into a slow path to deletion. It also needs two changes, a hide by default and an option, where the chosen design needs one flag and one filter.

## Cross-references

- [memory_tb_refine_trust_is_a_derived_number_from_zero_to_one_and_the_first_pass_computes_it_and_stores_nothing](memory_tb_refine_trust_is_a_derived_number_from_zero_to_one_and_the_first_pass_computes_it_and_stores_nothing) — where `trust` comes from
- [memory_tb_refine_hits_count_retrieval_not_use_and_start_on_2026_09_21](memory_tb_refine_hits_count_retrieval_not_use_and_start_on_2026_09_21) — what a hit means
- [memory_tb_refine_the_archive_is_not_a_deletion_queue_because_a_deliberate_search_revives_a_note_and_the_hook_never_does](memory_tb_refine_the_archive_is_not_a_deletion_queue_because_a_deliberate_search_revives_a_note_and_the_hook_never_does) — how a note leaves the archive
- [memory_tb_refine_a_note_is_deleted_when_it_is_archived_and_has_had_no_signal_for_a_year_with_a_log_line_first](memory_tb_refine_a_note_is_deleted_when_it_is_archived_and_has_had_no_signal_for_a_year_with_a_log_line_first) — what happens after a year with no signal
- [memory_tb_refine_trust_measures_vitality_not_quality_so_the_archive_comes_before_any_delete](memory_tb_refine_trust_measures_vitality_not_quality_so_the_archive_comes_before_any_delete) — why a low `trust` is a reason to archive and not a proof
