---
tags: [style, wiki, sources, git]
sources: [conversation]
---

## Decision

When a file listed in `sources:` leaves the tree, the entry changes to `<path>@<hash>`. The hash is the last commit reachable from `HEAD` that still holds the file. `git show <hash>:<path>` gives the file back.

A file that git never tracked, such as a gitignored spike, is written as `<path> (deleted)`. No hash exists for it.

A file with two versions over time gets the hash of the version the page was built from. The SPEC and REVIEW pairs of `tb` are the case: one pair for the refine cycle (`61cd4c3`) and one for the status cycle (`7f3f8be`).

The change touches the frontmatter only. The body of a decision is not edited.

## Why

A source that points to nothing breaks the chain from a decision to its evidence. About 37 entries pointed to files that were gone: roadmaps, specs, spike scripts. The reader could not tell if the file ever existed or where to find it.

A hash costs seven characters and fixes the problem for every file that git has seen. The ritchie close needs it: the SPEC and REVIEW pair leaves the tree on purpose, and the history is the only copy.

A commit that lives only on an unmerged branch is not used. The branch may be deleted, and the hash would then point to nothing. That is why the hash must be reachable from `HEAD`.

Alternative that lost: remove the entry. It hides that the page was built from something. The decision loses its trace.

## Cross-references

- [memory_tb_refine_trust_is_a_derived_number_from_zero_to_one_and_the_first_pass_computes_it_and_stores_nothing](memory_tb_refine_trust_is_a_derived_number_from_zero_to_one_and_the_first_pass_computes_it_and_stores_nothing) — a page whose sources carry the hash of its SPEC and REVIEW pair
