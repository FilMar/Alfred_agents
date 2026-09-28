---
tags: [memory, tb, ti, embedding, measurement]
sources: [ROADMAP_MEMORIA.md, tools/tb/src/infra.ts, scripts/tb_benchmark.py, scripts/reports/fase0_benchmark.json]
---

## Decision

`tb` and `ti` embed with `nomic-embed-text-v2-moe`, not with `nomic-embed-text` v1.5.
Both stores write documents with the prefix `search_document: ` and run queries with
the prefix `search_query: `. `embed()` is split in two functions, `embedDocument()`
and `embedQuery()`, so a caller cannot pick the wrong task by accident.

## Why

The corpus is written in Italian. v1.5 is trained in English. v2-moe is trained on
about a hundred languages. That is the whole reason, and it is measurable.

The test set is 120 Italian paraphrases of a note's `what`. A paraphrase may not
reuse any word that is rare in the corpus, so the query cannot win on shared
vocabulary. The set is generated once and committed, in `scripts/data/paraphrases.json`.
Dense only, 747 notes:

| measure | v1.5, no prefix | v2-moe, with prefix |
|---|---|---|
| recall@1 | 0.233 | 0.650 |
| MRR@10 | 0.301 | 0.727 |
| note outside the top 10 | 64 of 120 | 16 of 120 |
| ref-recall@10 | 0.246 | 0.345 |
| gap, real query to off-topic query | 0.085 | 0.293 |

The last row matters more than the first. Under v1.5 a question about a carbonara
recipe scored 0.662 and a real question scored 0.747. Every score sat near 0.7. A
model that answers everything with the same number carries no information, whatever
its ranking does.

ref-recall is free: 1134 hand-written links are relevance judgments already paid for.
It is also biased for v1.5, because those links were drawn while looking at v1.5's
neighbours. v2 wins there too, so the win is not an artefact of the test set.

The prefix is not a separate choice to evaluate. A Nomic model is trained on two
tasks and tells them apart by the prefix on the input. Without it, a query vector and
a document vector are not comparable, so the comparison above measures the model as it
is meant to be used. That does mean model and prefix moved together and the test
cannot separate them. Separating them would cost 747 more embeddings to answer a
question nobody needs answered.

Re-embedding 747 notes took 9 minutes 23 seconds, about 0.75 s per note. That is the
price of every future model change, and it is low enough not to be an argument.

## Cross-references

- [The alias makes the migration reversible](memory_alias_makes_migration_reversible)
- [Score cutoffs belong to the model](memory_score_cutoffs_belong_to_the_model)
- [tb and ti on the Pi](memory_tb_ti_on_rasp) — that page argues feasibility with a
  137M model. v2-moe is 475M. If Ollama runs on the Pi, the number needs a new measure.
