---
tags: [memory, tl, td, episodic, ownership]
sources: [.design/memory.md@0e0a366, conversation]
---

## Decision

`tl` owns the episode collection. The struct, the embedding, the write and the search live in `tools/tl`. `td` builds the text: it splits a session into episodes and writes a summary for each one. Then `td` passes the text to `tl`, which writes it.

This is the shape `td` already has with `tb` and `ti`. `td` calls their functions, and each tool keeps its own state.

`tl` does not distil. It stores the episodes it is given and finds them.

## Why

State has one owner. If `td` wrote the collection and `tl` read it, a change of shape in one tool would break the other.

`tl` stays the source of truth for the exchanges. The collection holds pointers to exchanges and a summary, never their text.

Rejected: `td` writes the collection and `tl` only reads it. Also rejected: `td` posts to the HTTP API of `tl`, because `td` would then need the Rasp service up even in local work. If `td` runs on another machine one day, the call can move to the HTTP API and the functions stay the same.

## Cross-references

- [memory_episode_summaries_are_a_derived_index_over_tl](memory_episode_summaries_are_a_derived_index_over_tl) — what the index holds
- [memory_tl_work_archive_not_event_log](memory_tl_work_archive_not_event_log) — why `tl` never distils
