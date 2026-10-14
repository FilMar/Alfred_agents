---
tags: [memory, tb, refine, archive, search, hook]
sources: [conversation, extensions/tb_ti/claude.sh, tools/tb/src/refine.ts]
replaces: [memory_tb_refine_an_archived_note_is_left_out_of_the_hook_only_and_a_deliberate_search_still_finds_it@89f7ae3, memory_tb_refine_the_archive_is_not_a_deletion_queue_because_a_deliberate_search_revives_a_note_and_the_hook_never_does@e3c3ec1, memory_tb_refine_apply_owns_archived_at@89f7ae3]
---

## Decision

A note with `trust` under 0.2 is archived. Archived means only that. Nothing moves and nothing is deleted. The note keeps its content, its refs and its backrefs.

- **One owner.** Only `tb refine --apply` writes and clears `archived_at`, an ISO instant. A note that already has it keeps it, so the moment of the first archive stays. After a run, a note has `archived_at` if and only if its trust is under 0.2. A hit on an archived note does not clear it. The next run does.
- **Two requests, not one per note:** `setPayloadMany` for the notes to archive, and one removal of the key for the notes to restore. Reading and computing 798 notes took about 0.55 seconds on 2026-10-13.
- **The hook leaves archived notes out.** The hook passes `--no-archived` (`SearchOptions.exclude_archived`). It is one `is_empty` condition on `archived_at`, reused by the visit of the refs, so it cuts the related notes too. `td` does not pass the flag: a candidate equal to an archived note is a duplicate.
- **A deliberate search still finds them.** A `tb search` by the agent shows `archived_at` in the result, and the hit counts as a signal. On the next run `trust` is computed again. At 0.2 or more, `archived_at` is cleared and the hook injects the note again. The hook never revives a note, because it gives archived notes no hit.
- So the archive is not a deletion queue. A note can leave it.

The threshold of 0.2 is by eye. See [memory_tb_refine_threshold_and_half_life_are_not_fixed_before_the_hit_rate_of_november_and_december_is_known](memory_tb_refine_threshold_and_half_life_are_not_fixed_before_the_hit_rate_of_november_and_december_is_known).

## Why

Keeping a note costs almost nothing: about 800 notes, a few hundred KB. The cost is noise, and the noise lives in the hook, which injects at every prompt. A deliberate search is read by an agent that reasons, and it is where a good note on a rare topic is found.

A hit measures retrieval, not value. A good note on a rare topic can sit at zero hits. Leaving it out of the hook loses nothing.

If the search cleared the key at the hit, there would be two writers of one fact, and they would drift. Waiting for the next run costs little.

A hook hit is a weak signal: the hook injects every match above 0.5 and the agent may ignore it. A revival that comes only from a deliberate search is closer to a real use.

Risk: in a deliberate search, archived notes compete with live ones by cosine alone, because `trust` never touches the score. The result shows `archived_at` so the agent can weigh them.

Lost: hiding archived notes from all search. It closes the way back, because nobody asks for the archive by chance. It would also need two changes, a hide by default and an option.

Limit: it is still retrieval, not value. A note on a topic nobody searches for a year can be deleted, by the rule in [memory_tb_refine_a_note_is_deleted_when_it_is_archived_and_has_had_no_signal_for_a_year_with_a_log_line_first](memory_tb_refine_a_note_is_deleted_when_it_is_archived_and_has_had_no_signal_for_a_year_with_a_log_line_first).
