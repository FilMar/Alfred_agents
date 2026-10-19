---
tags: [memory, distiller, td, episodes]
sources: [SPEC.md@cd6404b, REVIEW.md@cd6404b, tools/td/src/session.ts, tools/td/src/episodes.ts, tools/td/src/distiller.ts, conversation]
---

## Decision

Phase 0 of `td distill` reads the whole session. The episodes it writes cover every exchange of the session, the ones already distilled and the ones still in the queue. They replace the episodes the session had.

Phases 1 and 2 read only the exchanges in the queue. An exchange already distilled is not extracted again. `SessionRead` holds both sets: `turns()` is the queue, `earlier()` the distilled ones, `whole()` the two in time order, `isPending(turn)` tells them apart. Noise is left out of `earlier()`.

A failed split writes nothing, so the episodes of the earlier run stay.

## Why

`tl_episodes` replaces all the episodes of a session on each write. Before this change the map came from the queue only. A session distilled on Monday and again on Tuesday would lose Monday's episodes: the second run builds episodes from Tuesday's exchanges only, and the write deletes the rest. Nothing reports it. The notes stay and the exchanges stay in `tl`, but `tl search` stops finding that part.

Reading the session again for the split costs one call to the model and one request to `tl` per earlier exchange. Extraction is the costly part, and it stays on the new exchanges. If it ran on everything, the judge would find the notes just saved and call them duplicates.

Two things were rejected. A filter that skips sessions still open needs a loop over sessions in the hook, and the end of a session is not known. A timer on idle time has the same problem.

Known limits:

- On a second run the model may split the same exchanges in a different way. The episode ids change with the first exchange of an episode. The old ones are replaced and the content stays covered.
- A session still open gets a last episode that is a summary of half the work. The next run rewrites it.
- The cap per session counts items per run, so a session that comes back can save more.

## Cross-references

- [memory_episodes_fill_from_the_normal_distill_run](memory_episodes_fill_from_the_normal_distill_run) — phase 0 writes the index
- [memory_td_distills_by_itself_at_session_start](memory_td_distills_by_itself_at_session_start) — the run that makes a session come back
