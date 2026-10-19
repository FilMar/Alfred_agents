---
tags: [memory, tl, episodic, search, qdrant]
sources: [SPEC.md@cbce0c9, REVIEW.md@cbce0c9, tools/tl/src/episode_store.ts]
---

## Decision

`tl search` asks Qdrant for exactly `--limit` episodes. The period is a filter in the same call. It is a `range` on the `to` and `from` of the episode. `to` must be on or after the start of `--since`. `from` must be on or before the end of `--until`. An episode that overlaps the period enters.

The code checks every hit again with `periodOverlaps`. A hit outside the period is an error.

The default minimum score is 0.30.

## Why

A filter done after the search needs a margin. Ask for 10 and drop two, and eight episodes in the right period stay unseen. A filter in Qdrant counts only the episodes inside the period, so the limit means what it says.

The check was made on the `third-brain` collection, read only. A `range` on the field `when`, a plain ISO string with no index, found 47 notes of October out of 798. That is the count `tb browse` gives. So the Qdrant of the Rasp applies a `range` to an ISO string without a payload index.

The filter on `tl_episodes` is not tried on the real store, because the collection does not exist yet. A payload index of type `datetime` on `from` and `to` is for later, if the search gets slow.

The score 0.30 comes from one real episode in the store of the Rasp. Questions that make sense scored 0.35 to 0.48. Off-topic questions scored 0.12 to 0.17. The band between is empty, and 0.30 keeps a generic question that scored 0.348. One episode is a small sample, so the value is to be checked on more.

## Cross-references

- [memory_episode_summaries_are_a_derived_index_over_tl](memory_episode_summaries_are_a_derived_index_over_tl) — what the payload holds
- [memory_score_cutoffs_belong_to_the_model](memory_score_cutoffs_belong_to_the_model) — why a cutoff belongs to the embedding model
