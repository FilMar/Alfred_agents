---
tags: [memory, tb, tl, schema]
sources: [ROADMAP_MEMORIA.md, tools/tb/src/types.ts, spikes/2026-09-28-tb-corpus/data/translations_it.json]
replaces: [memory_keep_raw_source_for_reingest]
---

## Decision

A note does not carry the raw text it was distilled from. The `source_raw` field is
removed from the schema and from all 747 notes. The raw text lives where records live:
in `tl` for work the agent did, and in git for anything a human committed. A note
points at it with `session`, the id of where it was born.

The field was called `source_event`. It is now `session`. There is no "event" in `tl`
any more.

## Why

The need is real and the place was wrong. A note must be re-extractable when the
distiller improves, and 369 notes of 737 cannot be, because their raw text is gone.
That argument holds. It does not follow that every note should carry a copy.

The raw text of one exchange feeds many notes. Copying it into each one pays for the
same text several times, and pays in the worst place: the payload is what a search
returns and what a hook puts in a context window that gets re-read about 29 times per
session. A record that is read rarely does not belong in the object that is read
constantly. It belongs in the archive, with one address per note.

`tl` is the archive and it holds the raw text once. So the note needs a pointer, not a
payload — and this is the case where the rule applies cleanly: point when the target is
durable and addressable, copy when it is not. `tl` is durable because it is ours and
nothing rotates it away. That was never true of a chat transcript, which is why the
copy looked necessary in the first place.

The field also failed a rule this project already had: do not add a field because it
might be needed; find the query that reads it. `source_raw` had no reader. Its only
content after the migration was an empty string on 725 notes and the English original
of 22 translated ones — and those 22 originals belong in git next to their translation,
which is where they now are, in `spikes/2026-09-28-tb-corpus/data/translations_it.json`.

On the name: "event" came from the first design of `tl`, when it was an event log with
one row per event. `tl` is a work archive with `sessions` and `exchanges`, and no table
called events. A name that survives the concept it described keeps pulling the design
back — that is how the same schema once reached nineteen columns.

## Cross-references

- [tl is a work archive, not an event log](memory_tl_work_archive_not_event_log) — the archive the pointer points into
- [Absence is how Qdrant stores null](memory_absence_is_how_qdrant_stores_null) — written the same day; `source_raw: ""` was its one named exception, and the exception is gone
- [The human gate is the bottleneck](memory_human_gate_is_the_bottleneck) — why re-extraction must not need a human
- [A decision is written when the design ends](wiki_decision_is_written_when_the_design_ends) — the superseded page was written mid-design, which is how an unasked-for field became a rule
