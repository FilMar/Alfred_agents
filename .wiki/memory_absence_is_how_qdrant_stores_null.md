---
tags: [memory, tb, qdrant, schema]
sources: [tools/tb/src/types.ts, scripts/tb_fase0_fields.py, ROADMAP_MEMORIA.md]
---

## Decision

A note's schema has no field whose only value is `null`. `superseded_by` and
`source_event` are not written. They appear the day something writes a real value
into them.

## Why

Qdrant drops a payload key whose value is `null`. The migration wrote
`superseded_by: null` on all 747 notes and the key was not there afterwards. So on a
note that has never been superseded, the field cannot exist. Absence is how `null` is
spelled in this store, and it reads the same from every client.

This is not only a storage detail. It removes a class of decision from the schema. The
question "what is the default value of this field" has no answer for a field whose
default is nothing. The reader has to handle a missing key anyway, so writing the key
buys nothing and costs a lookup per note.

The fields that survive the same test are the ones that carry information on an old
note: `embed_model` says which model made the vector, `status: promossa` says a human
read it, `about: mondo` says it describes no one in particular, `updated_at` says when
it last changed. `source_raw: ""` is the one deliberate exception. Empty is not the
same as missing there: it marks a note the migration saw and found no raw text for,
which is different from a note nobody has looked at.

## Cross-references

- [Keep the raw source for re-ingestion](.memory_keep_raw_source_for_reingest)
- [Identity splits into descriptive and prescriptive](memory_identity_splits_descriptive_prescriptive) — `about` is the descriptive half.
