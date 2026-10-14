---
tags: [memory, tl, sqlite, schema]
sources: [tools/tl/src/db.ts, tools/tl/README.md]
---

## Decision

A time in `tl` is TEXT that holds ISO-8601 in UTC. Always the `Z`, always fixed width.

## Why

SQLite has no datetime type. It has five storage classes. A column declared `DATETIME` gets NUMERIC affinity, which stores an ISO string as TEXT anyway, plus a lie in the schema.

ISO-8601 at fixed width sorts as text the way it sorts in time. Every SQLite date function reads it. It is already the format of the transcripts and of the `when` field of `tb`.

SQLite enforces none of this, and nothing else does either. The format is a rule the writer holds. A row written any other way sorts in the wrong place and breaks every query without raising an error.

## Cross-references

- [memory_tl_work_archive_not_event_log](memory_tl_work_archive_not_event_log) — the tables that hold these times
