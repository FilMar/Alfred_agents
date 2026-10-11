---
tags: [memory, tb, refine, delete, log]
sources: [conversation, tools/tb/src/notes.ts]
---

## Decision

The refiner deletes a note when it has stayed in the archive for six months.

- The six months count from `archived_at`. The clock starts when the system goes live, at the first archive. It does not start at the creation of the note.
- A hit before the archive does not give the note immunity. The decay already moved `trust` under 0.2.
- A ref does not save a note. `tb delete` removes the refs and backrefs of the neighbours, so the graph stays whole, with one node less.
- A note that came back above 0.2 left the archive. Its clock is gone.

Before each delete, the refiner appends one line to a log. The log is append-only. The line holds the `id`, `what`, `why` and `exchange` of the note.

No note can be deleted before six months after the first run of `tb refine --apply`.

## Why

The two errors do not cost the same. Keeping a useless note costs almost nothing. Deleting a good note that is the only copy costs all of it. For the old corpus that copy is the only one: of 793 notes, 756 have no `exchange`, so no raw text to rebuild from. The log is the only trace, and one line is cheap.

Counting from `archived_at` gives unread notes time to come back. A count from creation would delete notes with only three weeks of real measure, because hit counters exist only since 2026-09-21.

Alternatives that lost:

- **Delete after one month under 0.2.** About 328 old notes have no direct hit and would go.
- **Never delete.** The archive grows without end and only moves the problem.
- **A ref or one old hit saves a note.** The first is a link, not a use. The second is a hook hit on an unrelated prompt. Neither shows the note is alive today.

## Cross-references

- [memory_tb_refine_trust_under_point_two_archives_the_note_and_hides_it_from_search](memory_tb_refine_trust_under_point_two_archives_the_note_and_hides_it_from_search) — how a note enters the archive
- [memory_raw_text_lives_in_the_archive_not_the_note](memory_raw_text_lives_in_the_archive_not_the_note) — why `exchange` is the way back to the raw text
