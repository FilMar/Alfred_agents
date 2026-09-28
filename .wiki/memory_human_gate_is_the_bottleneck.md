---
tags: [memory, tb, diagnosis, curation]
sources: [conversation, ROADMAP_MEMORIA.md, tools/tb/src/notes.ts]
---

## Decision

The limit on memory growth is the human approval step, not storage and not retrieval. Every new memory feature must cut the number of notes the human has to read. No feature may add a review step.

The measured shape of the problem (2026-09-28):

- Note production fell from 309 notes in May 2026 to 39 in September 2026.
- The user does not write the notes. An agent writes them. The user reads each one and says OK, or asks to trim it.
- `hits` and `last_hit` are written on every search and read by nobody. 538 of 737 notes have never been a direct search hit. 266 hits in total, 4 at most on one note.

So new notes enter with `status: provvisoria` and no approval. A note is promoted by use, not by reading.

## Why

The gate looked like curation. It is a queue with one worker, and the worker is the user. Production tracks the worker's free time, not the value of what there is to remember. A store that grows only as fast as one person can read cannot serve an agent that works every day.

Adding a better review tool would make the gate faster. It would not remove it. Removing it needs a different judge, and use is the only judge that costs the user nothing.

Widening the gate was rejected for the same reason. The cost is the reading, so any change that keeps the reading keeps the cost.

## Cross-references

- [memory_refs_carry_non_semantic_reach](memory_refs_carry_non_semantic_reach) — what the hand-written part of the graph is worth
- [memory_keep_raw_source_for_reingest](memory_keep_raw_source_for_reingest) — what a note must carry so a later pass can redo the work
- [memory_related_notes_ranked_not_cut](memory_related_notes_ranked_not_cut) — the missing telemetry that would let use act as judge
