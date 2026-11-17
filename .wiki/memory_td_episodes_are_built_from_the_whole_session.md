---
tags: [memory, distiller, td, episodes]
sources: [SPEC.md@cd6404b, REVIEW.md@cd6404b, tools/alfred/src/distill/session.rs, tools/alfred/src/distill/episodes.rs, tools/alfred/src/hist/episodes.rs, conversation]
---

## Decision

Phase 0 of the distiller in `alfred serve` reads the whole session. The episodes it writes cover every exchange of the session, the ones already distilled and the ones still in the queue. They replace the episodes the session had.

Phases 1 and 2 read only the exchanges in the queue. An exchange already distilled is not extracted again. `SessionRead` holds both sets: `turns()` is the queue, the `earlier` field the distilled ones, `whole()` the two in time order, `isPending(turn)` tells them apart. Noise is left out of `earlier()`.

A failed split writes nothing, so the episodes of the earlier run stay.

## Why

`tl_episodes` replaces all the episodes of a session on each write. Before this change the map came from the queue only. A session distilled on Monday and again on Tuesday would lose Monday's episodes: the second run builds episodes from Tuesday's exchanges only, and the write deletes the rest. Nothing reports it. The rules stay and the exchanges stay in hist, but `alfred hist search` stops finding that part.

Reading the session again for the split costs one call to the model and one read of the archive per earlier exchange. Extraction is the costly part, and it stays on the new exchanges. If it ran on everything, the judge would find the rules just saved and call them duplicates.

Two things were rejected. A filter that skips sessions still open needs a loop over sessions in the hook, and the end of a session is not known. A timer on idle time has the same problem.

Known limits:

- On a second run the model may split the same exchanges in a different way. The episode ids change with the first exchange of an episode. The old ones are replaced and the content stays covered.
- A session still open gets a last episode that is a summary of half the work. The next run rewrites it.
- There is no cap per session, only the budget of a run ([memory_distill_has_no_session_cap](memory_distill_has_no_session_cap)).

## Cross-references

- [memory_episodes_fill_from_the_normal_distill_run](memory_episodes_fill_from_the_normal_distill_run) — phase 0 writes the index
- [memory_distill_starts_on_ingest_by_threshold](memory_distill_starts_on_ingest_by_threshold) — the run that makes a session come back
