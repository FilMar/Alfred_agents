---
tags: [memory, tb, tl, schema]
sources: [ROADMAP_MEMORIA.md@7edd8d8, tools/tb/src/types.ts, spikes/2026-09-28-tb-corpus/data/translations_it.json (deleted)]
replaces: [memory_keep_raw_source_for_reingest]
---

## Decision

A note does not carry the raw text it was distilled from. The `source_raw` field is removed from the schema and from all 747 notes. The raw text lives where records live: in `tl` for work the agent did, and in git for anything a human committed. A note points at it with `session`, the id of where it was born. The field `source_event` is now `session`, because there is no "event" in `tl` any more.

## Why

The need is real and the place was wrong. A note must be re-extractable when the distiller improves, and 369 notes of 737 cannot be, because their raw text is gone. That does not mean every note should carry a copy.

The raw text of one exchange feeds many notes. A copy in each pays for the same text several times, and in the worst place: the payload is what a search returns and what a hook puts in a context window that is re-read about 29 times per session. A record that is read rarely does not belong in the object that is read constantly.

So the note holds a pointer. The rule: point when the target is durable and addressable, copy when it is not. `tl` is durable because it is ours and nothing rotates it. A chat transcript is not, which is why the copy looked necessary.

The field also failed an old rule: do not add a field because it might be needed, find the query that reads it. `source_raw` had no reader. Its content was an empty string on 725 notes and the English original of 22 translated ones. Those originals are in git next to their translation, in `spikes/2026-09-28-tb-corpus/data/translations_it.json`.

A name that survives the concept it described keeps pulling the design back. "Event" came from the first design of `tl`, an event log. That is how the same schema once reached nineteen columns.

## Cross-references

- [tl is a work archive, not an event log](memory_tl_work_archive_not_event_log) — the archive the pointer points into
- [Absence is how Qdrant stores null](memory_absence_is_how_qdrant_stores_null) — written the same day; `source_raw: ""` was its one named exception, and the exception is gone
- [The human gate is the bottleneck](memory_human_gate_is_the_bottleneck) — why re-extraction must not need a human
- [A decision is written when the design ends](wiki_decision_is_written_when_the_design_ends) — the superseded page was written mid-design, which is how an unasked-for field became a rule
