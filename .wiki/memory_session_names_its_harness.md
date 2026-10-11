---
tags: [memory, tl, sqlite, schema, pi]
sources: [conversation, tools/tl/src/types.ts, tools/tl/src/db.ts, .wiki/memory_tl_work_archive_not_event_log.md]
---

## Decision

`sessions` carries a `harness` column: `claude` or `pi`, validated against that list, absent on a row written before the column existed. It is **not** repeated on every exchange.

The value is set by the reader that parsed the transcript, and the archive refuses a third name until someone adds it to the list on purpose.

## Why

The archive holds two harnesses now, 969 Claude exchanges and 794 `pi` ones over 153 sessions, and nothing in `sessions` said which tool ran one. Two ways to guess existed, and both are the wrong kind of answer:

- Join to `exchanges` and read a JSON field with `LIKE`. That is a query about rows, used to answer a question about a session.
- Read the UUID version: `pi` numbers its sessions with v7 and Claude Code with v4, and on today's data that separates 110 from 43 perfectly. It is an accident of two implementations, not a contract. The day either changes its generator, the filter keeps working and starts lying — the same shape of failure as a cutoff applied to a score that changed meaning.

The schema decision already gave the rule that settles where it goes: `sessions` holds what stays constant for a whole session, which is why `model` is on the exchange instead — it changes mid-session. A harness never does.

That rule also says it belongs in **one** place, so the reader stopped writing `meta.harness` on every row when the column arrived. A fact with two homes drifts: one copy gets updated and the other lies.

`ALTER TABLE` is needed because `CREATE TABLE IF NOT EXISTS` leaves an existing table alone — a new column has to be said out loud, and the migration runs when the archive is opened. Old rows read back with the field absent rather than null, the same way a note does: absence is how a missing value is spelled.

## Cross-references

- [memory_tl_work_archive_not_event_log](memory_tl_work_archive_not_event_log) — the schema this adds a column to, and the rule that decides where a field lives
- [memory_absence_is_how_qdrant_stores_null](memory_absence_is_how_qdrant_stores_null) — the same treatment of a missing value in the other store
- [core_orthogonal_layers_no_overlap](core_orthogonal_layers_no_overlap) — why a fact gets one home
