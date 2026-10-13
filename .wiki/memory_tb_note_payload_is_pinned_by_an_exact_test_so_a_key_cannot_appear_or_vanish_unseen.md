---
tags: [memory, tb, note, payload, tests]
sources: [tools/tb/SPEC.md, tools/tb/REVIEW.md, conversation]
---

## Decision

`tests/tb_note_payload.test.ts` pins the payload of a note with `toStrictEqual`. A key that appears or goes missing fails the test.

A fresh note, as `createNote` stores it, has these keys: `id`, `when`, `why`, `what`, `tags`, `kind`, `refs`, `embed_model`, `about` and `updated_at`. It also has `source` and `exchange`, but only when they are given.

The other fields arrive from one precise write each:

- the first direct hit adds `hits` and `last_hit`;
- the first hit through a ref adds `hits_related` and `last_hit_related`;
- the first link to a note adds `backrefs` on that note.

Before that write the key does not exist. Qdrant drops a key whose value is `null`, so absence is how `null` is spelled. See [memory_absence_is_how_qdrant_stores_null](memory_absence_is_how_qdrant_stores_null).

`createNote` has no contract for the shape.

## Why

The user proposed this test while `status` was being removed. A test that says "`status` is absent" checks a thing that no longer exists. The test says what the payload is, not what it is not.

Before, no test saw the full shape. The tests on the stubs used `toMatchObject`, which ignores extra keys. A new field, or an old one coming back, would pass in silence. An exact test catches any drift, not only this field.

The type already stops an extra key in a `Note` literal, so a contract in `createNote` would only repeat it. An assert on "the note has no `status`" would be true for any implementation.

Six mutants checked the test, and all six were killed: `status` put back, and `about`, `embed_model`, `exchange`, `last_hit` and the backref removed.

Limit: the test with a hit through a ref uses different words for each note and `limit: 1`. It relies on the fake embedding of the stubs to give the first note a direct hit and the second one a hit through the ref.

## Cross-references

- [memory_tb_note_status_field_is_removed_because_nothing_reads_it_and_nothing_promotes_it](memory_tb_note_status_field_is_removed_because_nothing_reads_it_and_nothing_promotes_it) — the field this test replaced as a guard
- [memory_td_edges_are_tested_on_in_memory_stubs_and_an_end_to_end_test_checks_the_stores](memory_td_edges_are_tested_on_in_memory_stubs_and_an_end_to_end_test_checks_the_stores) — the stubs the test runs on
