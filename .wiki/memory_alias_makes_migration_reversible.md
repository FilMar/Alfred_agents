---
tags: [memory, tb, qdrant, migration, embedding]
sources: [conversation, ROADMAP_MEMORIA.md, tools/tb/src/infra.ts, tools/tb/src/qdrant.ts]
---

## Decision

`COLLECTION` in `tb` becomes the name of a Qdrant alias. Real collections are named after the model and the vector size that built them, for example `third-brain__nomic-v1.5-768`. Changing the embedding model means building a new collection next to the old one and moving the alias.

The recipe, verified live on 2026-09-28:

1. Snapshot first, through Clio.
2. Create `third-brain__nomic-v1.5-768`.
3. Copy the points with `scroll(with_vector=true)` then `upsert`. Dense vector, sparse vector and payload come across unchanged.
4. Verify the count and a sample.
5. Delete `third-brain`. An alias cannot take the name of a collection that exists — Qdrant answers 409 — so the delete comes before the alias.
6. Create the alias `third-brain` on the new collection.

The swap between two models is one `POST /collections/aliases` carrying `delete_alias` and `create_alias` together, so it is atomic. An alias is transparent to upsert, to query, and to collection-info, so no caller changes.

Prerequisite, not optional: `ensureCollection()` deletes the collection when `sparse_vectors` is missing from the config, then rebuilds it empty. That must become a loud error before any migration runs.

## Why

Re-embedding a corpus in place is irreversible. If the new model turns out worse, the old vectors are gone and the only way back is a restore. With a collection per model the old vectors are never touched, rollback is one API call, and both models can be queried side by side while they are compared.

The name carries the model and the size on purpose. A collection whose vectors came from an unknown model is a collection nobody can safely extend.

The `ensureCollection()` prerequisite is the real risk in this plan. A migration creates exactly the state — a fresh collection, a config that may not match what the code expects — where that function is most likely to fire, and what it does is delete the thing just built.

## Cross-references

- [memory_keep_raw_source_for_reingest](.memory_keep_raw_source_for_reingest) — the other half of a migration that can be redone
- [memory_tb_ti_on_rasp](memory_tb_ti_on_rasp) — where the collections live, and where mass re-embedding runs from
- [core_tb_stateless_single_source](core_tb_stateless_single_source) — why an alias is enough to repoint every client
