---
tags: [memory, tb, ti, embedding, measurement]
sources: [ROADMAP_MEMORIA.md@7edd8d8, tools/tb/src/infra.ts, spikes/2026-09-28-tb-corpus/tb_benchmark.py (deleted), spikes/2026-09-28-tb-corpus/reports/fase0_benchmark.json (deleted)]
---

## Decision

`tb` and `ti` embed with `nomic-embed-text-v2-moe`, not with `nomic-embed-text` v1.5. Both stores write documents with the prefix `search_document: ` and run queries with `search_query: `. `embed()` is split in two functions, `embedDocument()` and `embedQuery()`, so a caller cannot pick the wrong task by accident.

## Why

The corpus is Italian. v1.5 is trained in English. v2-moe is trained on about a hundred languages. That is the whole reason, and it is measurable.

The test set is 120 Italian paraphrases of the `what` of a note. A paraphrase may not reuse any word that is rare in the corpus, so the query cannot win on shared words. Dense only, 747 notes:

| measure | v1.5, no prefix | v2-moe, with prefix |
|---|---|---|
| recall@1 | 0.233 | 0.650 |
| MRR@10 | 0.301 | 0.727 |
| gap, real query to off-topic query | 0.085 | 0.293 |

The gap matters most. Under v1.5 a question about a carbonara recipe scored 0.662 and a real question scored 0.747: every score sat near 0.7. A model that answers everything with the same number carries no information, whatever its ranking does.

The 1134 hand-written links give a free check, ref-recall@10: 0.246 for v1.5 and 0.345 for v2. It is biased towards v1.5, because the links were drawn while looking at its neighbours, and v2 still wins.

The prefix is part of the model: a Nomic model tells its two tasks apart by the prefix. Model and prefix moved together, so the test cannot separate them. Separating them would cost 747 more embeddings to answer a question nobody needs answered.

Re-embedding 747 notes took 9 minutes 23 seconds, about 0.75 s per note. That is the price of every future model change, and it is low enough not to be an argument.

## Cross-references

- [memory_alias_makes_migration_reversible](memory_alias_makes_migration_reversible)
- [memory_score_cutoffs_belong_to_the_model](memory_score_cutoffs_belong_to_the_model)
- [memory_tb_and_ti_run_against_qdrant_and_ollama_on_the_rasp_and_every_client_points_there](core_tb_and_ti_are_stateless_clients_of_one_store_on_the_rasp) — argues feasibility with a 137M model. v2-moe is 475M, so if Ollama runs on the Pi the number needs a new measure.
