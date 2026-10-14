---
tags: [memory, tb, qdrant, migration, embedding]
sources: [conversation, ROADMAP_MEMORIA.md@7edd8d8, tools/tb/src/infra.ts, tools/tb/src/qdrant.ts]
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

`ensureCollection()` throws an error when `sparse_vectors` is missing from the config. It used to delete the collection and rebuild it empty. Keep it loud.

## Why

Re-embedding a corpus in place is irreversible. If the new model turns out worse, the old vectors are gone and the only way back is a restore. With a collection per model the old vectors are never touched, rollback is one API call, and both models can be queried side by side while they are compared.

The name carries the model and the size on purpose. A collection whose vectors came from an unknown model is a collection nobody can safely extend.

The old `ensureCollection()` was the real risk of this plan. A migration creates a fresh collection, with a config that may not match the code, and that is where the function fired. It deleted the thing just built.

## Cross-references

- `memory_keep_raw_source_for_reingest@08e919f` — the other half of a migration that can be redone
- [memory_tb_and_ti_run_against_qdrant_and_ollama_on_the_rasp_and_every_client_points_there](core_tb_and_ti_are_stateless_clients_of_one_store_on_the_rasp) — where the collections live, and where mass re-embedding runs from
