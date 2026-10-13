---
tags: [memory, tb, refine, output]
sources: [tools/tb/SPEC.md, tools/tb/REVIEW.md]
---

## Decision

The list of notes under 0.2 that `tb refine` prints is sorted by `trust`, lowest first. Notes with the same `trust` are sorted by `id`.

## Why

The spec did not say an order. The notes come from the store in no useful order. Two runs on the same data would print two different lists.

The lowest `trust` first puts the notes closest to loss at the top. That is what the first dry run is for: reading the notes the refiner would archive and judging if they are the right ones. The `id` breaks a tie, so the output is stable and two runs can be compared with a plain `diff`.

Alternative that lost: sort by `when`. It puts the oldest first, but the oldest note with many hits is not the weakest one.

## Cross-references

- [memory_tb_refine_an_archived_note_is_left_out_of_the_hook_only_and_a_deliberate_search_still_finds_it](memory_tb_refine_an_archived_note_is_left_out_of_the_hook_only_and_a_deliberate_search_still_finds_it) — what happens to the notes in this list once `--apply` exists
