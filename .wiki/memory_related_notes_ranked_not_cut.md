---
tags: [memory, tb, retrieval, telemetry, scoring]
sources: [conversation, spikes/2026-09-28-tb-corpus/reports/fase1_related.json (deleted), tools/tb/src/qdrant.ts, tools/tb/src/types.ts, .wiki/memory_refs_carry_non_semantic_reach.md]
replaces: [memory_related_results_need_scores]
---

## Decision

A note reached through an edge gets a real score, and the related block is **ranked and capped by rank**. `min_score` never touches it: the cutoff applies to matched notes only.

1. Related results carry the cosine the engine computes against the query, so a related score and a direct score are one quantity.
2. The block is sorted by score, ties broken on id, and cut to `related_limit` (default 25, `--related-limit` on the CLI, 3 in the hook).
3. `hits_related` and `last_hit_related` count arrivals through an edge, in fields of their own.
4. The traversal follows `refs` and `backrefs`, and the search filter applies to it, so `--kind`, `--evidence-only` and the hub exclusion hold for related notes too.

Every result carries `via`: `search` for a match, `related` for an arrival through an edge. A consumer that must tell them apart reads that field, not the score.

## Why

The plan said the block would be ranked and cut by `min_score`. Ranking survived the measurement. Cutting did not. On 747 notes and 8 queries (`limit 10`), a search gave 14.6 related notes with `refs` only and 23.1 with `backrefs`. At `min_score 0.35`, 44 of 161 related results survive. At 0.5, the cutoff of the hook, **0 of 161**.

At the cutoff of the hook, a threshold does not trim the block, it deletes it, and it deletes the useful half first. 23% of edges point past the 200th dense neighbour of their source ([memory_refs_carry_non_semantic_reach](memory_refs_carry_non_semantic_reach)). A link drawn for a reason the query does not carry scores low by construction, not by irrelevance.

A cap by rank bounds the payload without that bias, and it is deterministic. The old bound, 500 visited notes, was 67% of the corpus and cut in the order Qdrant answered.

`via` is in the `--json` output. The text of the hook has no `via`: direct notes come first and related notes follow, in the order of the result.

## Cross-references

- [memory_refs_carry_non_semantic_reach](memory_refs_carry_non_semantic_reach) — the measurement that makes the cutoff wrong
- [memory_score_is_always_the_engine_cosine](memory_score_is_always_the_engine_cosine) — why the two blocks share one scale
- [memory_score_cutoffs_belong_to_the_model](memory_score_cutoffs_belong_to_the_model) — where the 0.5 comes from
- [memory_human_gate_is_the_bottleneck](memory_human_gate_is_the_bottleneck) — why use has to become the judge
