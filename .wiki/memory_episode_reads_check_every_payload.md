---
tags: [memory, tl, episodic, contract]
sources: [SPEC.md@cbce0c9, REVIEW.md@cbce0c9, tools/tl/src/episode_read.ts, tools/tl/src/episode_store.ts]
---

## Decision

Every payload read back from `tl_episodes` is checked before it becomes an episode. `episodeFromPayload` in `episode_read.ts` does it, and it is a pure function.

A payload is an episode when all of this holds:

- `session` is an id.
- `exchanges` has at least one id.
- `from` and `to` are ISO-8601 UTC times, and `from <= to`.
- `summary` is not blank.
- `extractor` is a positive integer.
- `model` is not blank.
- `created` is an ISO-8601 UTC time.
- The id of the point is the one derived from `session` and the first exchange.

If one thing fails, the result is a message that names the field. `tl search` and `tl episode` print it as an error.

A missing collection holds no episode. `tl search` prints nothing for it.

## Why

A write and a read are two moments of one program, and the store is shared. The write checks the episode when it builds it. The read checks again, because the payload crossed a boundary and another version of the code may have written it.

A bad payload is an error of the world and not of the program. It comes back as a value and names the field, so the fault is easy to find.

`tl episode` and `tl search` take a unique id prefix, as `tb` and `ti` do. A prefix that matches no episode is an error, and one that matches several is an "Ambiguous" error that lists up to five.

## Cross-references

- [memory_episode_index_belongs_to_tl](memory_episode_index_belongs_to_tl) — who owns the collection and its reads
- [memory_search_prints_text_blocks_by_default](memory_search_prints_text_blocks_by_default) — the output of the commands
