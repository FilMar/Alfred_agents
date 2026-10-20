---
tags: [memory, tb, merge, refs, aristotele]
sources: [SPEC.md@deaf2ab, REVIEW.md@deaf2ab, tools/tb/src/merge.ts]
---

## Decision

`tb merge <into> <drops...>` moves the refs, backrefs, tags and hits of the drops onto `into`, then deletes the drops. It writes no text.

To merge notes, Aristotele first saves a note with the rewritten text (`tb save`), then merges the old notes into it. The new note has its own vector, from its own text. The merge does not touch the text or the vector of `into`.

- A ref to a drop becomes a ref to `into`, with the same `reason` and `origin`. A ref that `into` already has wins over a moved one.
- Two refs with the same id: the first wins, in the order `into`, then the drops as given.
- Hits are summed, the last hit is the latest one, tags are the union. `archived_at` stays only if every note was archived.
- Past `REFS_LIMIT` the merge fails and writes nothing.
- The plan is pure (`merge.ts`). `mergeNotes` writes the linked notes, then `into`, then deletes the drops.

## Why

`tb delete` removes every link to the note. A merge done as save plus delete loses the links, and those carry reach that vectors do not.

A merge with new text is really two old notes leaving and one new note coming in. The text is judgment, so it stays with Aristotele. The command does only the bookkeeping.

Where it can break: the writes are not atomic. If the process stops halfway, links to a drop remain.

## Cross-references

- [memory_refs_carry_non_semantic_reach](memory_refs_carry_non_semantic_reach) — why losing links matters
- [memory_aristotele_is_a_manual_curator_of_tb_and_ti](memory_aristotele_is_a_manual_curator_of_tb_and_ti) — who calls it
