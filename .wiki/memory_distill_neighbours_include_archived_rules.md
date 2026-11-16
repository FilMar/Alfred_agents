---
tags: [memory, distiller, alfred, neighbours, archive]
sources: [spec.json@6af63cb, tools/alfred/src/distill/decide.rs]
---

## Decision

`neighbours_of()` searches `ti` with no filter on `archived_at`. An archived rule is a neighbour like any other. A candidate that says the same thing comes out as `duplicate` and is not saved.

## Why

An archived rule is only hidden from the hook. Its knowledge is still in `ti`. Leaving it out would let the same rule be born again as new.

This is what `td` does.

## Cross-references

- [memory_refine_archive_hides_from_hook_only](memory_refine_archive_hides_from_hook_only) — what archived means
- [memory_td_phase_2a_only_searches_neighbours_and_leaves_no_hit_so_the_cosine_cut_is_gone](memory_td_phase_2a_only_searches_neighbours_and_leaves_no_hit_so_the_cosine_cut_is_gone) — the search with no hits
