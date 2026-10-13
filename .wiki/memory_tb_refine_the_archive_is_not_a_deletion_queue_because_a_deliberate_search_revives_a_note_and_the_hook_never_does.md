---
tags: [memory, tb, refine, archive, search]
sources: [conversation]
replaces: [memory_tb_refine_the_archive_is_a_deletion_queue_with_six_months_notice_because_archived_notes_get_no_hits]
---

## Decision

The archive is not a deletion queue. A note can leave it.

The way back is a deliberate search. A `tb search` by the agent that finds an archived note counts as a hit. On the next run `trust` is computed again. At 0.2 or more, `archived_at` is cleared.

The hook never revives a note. It does not inject archived notes, so it gives them no hit.

## Why

The first version of this page said the opposite. It assumed archived notes get no hits, because they were hidden from all search. Then the only way back was an explicit search that nobody would run, and six months later the note was deleted.

That is false once only the hook leaves them out. A deliberate search finds them and counts a hit.

There is a gain. A hook hit is a weak signal: the hook injects every match above 0.5 and the agent may ignore it. One use can give two hits. A revival that comes only from a deliberate search is closer to a real use.

Limit: it is still retrieval, not value. A note on a topic nobody searches for during a year can be deleted. That is the rule of the next page.

## Cross-references

- [memory_tb_refine_an_archived_note_is_left_out_of_the_hook_only_and_a_deliberate_search_still_finds_it](memory_tb_refine_an_archived_note_is_left_out_of_the_hook_only_and_a_deliberate_search_still_finds_it) — what archived means
- [memory_tb_refine_a_note_is_deleted_when_it_is_archived_and_has_had_no_signal_for_a_year_with_a_log_line_first](memory_tb_refine_a_note_is_deleted_when_it_is_archived_and_has_had_no_signal_for_a_year_with_a_log_line_first) — the delete, after a year with no signal
- [memory_tb_refine_hits_count_retrieval_not_use_and_start_on_2026_09_21](memory_tb_refine_hits_count_retrieval_not_use_and_start_on_2026_09_21) — what a hit means, and the noise of the hook
