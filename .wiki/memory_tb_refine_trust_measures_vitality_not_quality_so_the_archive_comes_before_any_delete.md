---
tags: [memory, tb, refine, trust, quality]
sources: [tools/tb/SPEC.md@61cd4c3, tools/tb/REVIEW.md@61cd4c3, conversation]
---

## Decision

`trust` measures if a note is alive. It does not measure if the note is true, useful or right.

The signal is a hit. A hit says the note was retrieved. It does not say the note was used, or that it changed an answer. So a low `trust` is a reason to archive, never a proof that the note is bad.

Quality is an open problem. No signal for it exists in the first pass.

## Why

Two cases break the number:

- A wrong or old note that matches many queries keeps a high `trust`.
- A good note on a rare topic sits at zero hits and falls under 0.2.

The second case is the reason the archive comes before any delete. Hiding a note loses nothing. Deleting it can lose the only copy.

Three signals could measure quality. None is built, and none is a decision:

- **The agent names the notes it used.** It costs one step per answer and it relies on the agent being honest.
- **The user corrects the agent after a note was injected.** It is the strongest signal. `td` would have to read it from `tl`.
- **A periodic critic reads the notes with low `trust`.** It costs model calls and it saves good rare notes.

The first dry run is the test. If the notes under 0.2 include notes the user knows are good, a second signal is needed.

## Cross-references

- [memory_tb_refine_hits_count_retrieval_not_use_and_start_on_2026_09_21](memory_tb_refine_hits_count_retrieval_not_use_and_start_on_2026_09_21) — what a hit means, and its noise
- [memory_tb_refine_an_archived_note_is_left_out_of_the_hook_only_and_a_deliberate_search_still_finds_it](memory_tb_refine_an_archived_note_is_left_out_of_the_hook_only_and_a_deliberate_search_still_finds_it) — the archive comes first because of this
- [memory_tb_refine_a_note_is_deleted_when_it_is_archived_and_has_had_no_signal_for_a_year_with_a_log_line_first](memory_tb_refine_a_note_is_deleted_when_it_is_archived_and_has_had_no_signal_for_a_year_with_a_log_line_first) — the delete, with its log line
