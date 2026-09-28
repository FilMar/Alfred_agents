---
tags: [memory, tb, retrieval, telemetry, scoring]
sources: [conversation, scripts/reports/fase1_related.json, tools/tb/src/qdrant.ts, tools/tb/src/types.ts, .wiki/memory_refs_carry_non_semantic_reach.md]
replaces: [memory_related_results_need_scores]
---

## Decision

A note reached through an edge gets a real score, and the related block is **ranked and capped by rank**. `min_score` never touches it: the cutoff applies to matched notes only.

Written in Fase 1:

1. Related results carry the cosine the engine computes against the query, so a related score and a direct score are one quantity.
2. The block is sorted by score, ties broken on id, and cut to `related_limit` (default 25, `--related-limit` on the CLI, 3 in the injection hook).
3. `hits_related` and `last_hit_related` count arrivals through an edge, in fields of their own.
4. The traversal follows `refs` **and** `backrefs`, and the search filter now applies to it, so `--kind`, `--evidence-only` and the hub exclusion hold for related notes too.

Every result carries `via`: `search` for a match, `related` for an arrival through an edge. A consumer that must tell them apart reads that field, not the score.

## Why

The plan said the related block would be "ranked, cut by `min_score`, and compared with a direct hit". Ranking survived the measurement; cutting did not.

Measured on 747 notes, 8 queries, `limit 10` (`scripts/reports/fase1_related.json`):

| | value |
|---|---|
| related notes per search, `refs` only | 14.6 |
| related notes per search, with `backrefs` | 23.1 |
| related results surviving `min_score 0.35` | 44 / 161 |
| related results surviving `min_score 0.5` (the hook's) | **0 / 161** |

At the cutoff the hook actually uses, a threshold does not trim the related block, it deletes it. And it deletes the useful half first: [memory_refs_carry_non_semantic_reach](memory_refs_carry_non_semantic_reach) measured that 23% of edges point past the 200th dense neighbour of their source. Those are the edges that justify having a graph at all — a link drawn for a reason the query does not carry scores low by construction, not by irrelevance. A cosine cutoff keeps the edges the vectors would have found anyway and drops the ones only the graph knows.

A cap by rank bounds the payload without that bias, and it is deterministic: the ids of each hop are sorted before truncation, so two searches over the same data return the same notes. The previous bound, 500 visited notes, was 67% of the corpus and truncated in Qdrant's response order.

`via` matters because the hook injects into a context nobody reviews. Before this change `score: null` was the only marker of a related note, and the hook's jq did not even project it — so scoring the block without adding `via` would have made an edge-reached note indistinguishable from a match.

## Cross-references

- [memory_refs_carry_non_semantic_reach](memory_refs_carry_non_semantic_reach) — the measurement that makes the cutoff wrong
- [memory_score_is_always_the_engine_cosine](memory_score_is_always_the_engine_cosine) — why the two blocks share one scale
- [memory_score_cutoffs_belong_to_the_model](memory_score_cutoffs_belong_to_the_model) — where the 0.5 comes from
- [memory_human_gate_is_the_bottleneck](memory_human_gate_is_the_bottleneck) — why use has to become the judge
