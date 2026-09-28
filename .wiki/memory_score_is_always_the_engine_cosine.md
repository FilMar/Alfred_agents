---
tags: [memory, tb, retrieval, scoring, qdrant]
sources: [conversation, tools/tb/src/qdrant.ts, skills/christopher/SKILL.md, https://qdrant.tech/documentation/concepts/hybrid-queries/]
---

## Decision

`score` on a search result is always the cosine Qdrant computes between the query vector and the note's stored vector. One field, one quantity, every path.

Consequences in `tb`:

- **Related notes** are scored with one `/points/query` carrying `filter: {must: [{has_id: [...]}]}`. The engine returns its own cosine plus the payload, so no vector crosses the wire and no similarity is recomputed in TypeScript.
- **Hybrid search** uses RRF for recall only. The fusion query asks for ids (`with_payload: false`), then the same `has_id` query scores them. The block is then ordered and cut by cosine.
- `min_score` is therefore comparable across dense, hybrid, and related.

## Why

An RRF score is `1/(k + rank)` summed over the prefetches, with `k = 2` in Qdrant. A document ranked first in one list scores 0.5, one ranked fifth in both scores about 0.29. Those numbers look like similarities and are not: they carry no information about how close the note is to the question.

`tb` passed the user's `min_score` to Qdrant as `score_threshold` on both paths, and `skills/christopher/SKILL.md` documents `--min-score 0.35` and `--hybrid` as a valid combination. So a cutoff measured in cosine units was being applied to a rank-reciprocal number: it selected roughly "first in at least one list" and threw the rest away, while looking like a similarity filter.

Scoring related notes made this unavoidable rather than merely wrong. The moment one array holds both blocks, a single `score` field either means one thing or nothing.

Fusion still earns its place: it changes which candidates come back. Measured on the corpus, `--hybrid` on a query with technical terms returns a note that the dense-only top-3 misses. What it no longer does is decide the order or the cutoff.

Using the engine instead of local arithmetic is the cheaper half of the decision. The alternative was fetching stored vectors and computing the cosine in `tb`: 768 floats is about 16 KB of JSON per note, so a depth-1 search with backrefs would have moved roughly 400 KB against a 5 second client timeout, for a number the engine already has.

## Cross-references

- [memory_related_notes_ranked_not_cut](memory_related_notes_ranked_not_cut) — what the shared scale is used for
- [memory_score_cutoffs_belong_to_the_model](memory_score_cutoffs_belong_to_the_model) — why the number itself is a property of the model
