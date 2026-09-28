---
tags: [memory, tb, retrieval, telemetry, planned]
sources: [conversation, tools/tb/src/qdrant.ts, tools/tb/src/notes.ts]
---

## Decision

Design target, no code yet. Three changes to `tb` search:

1. **Related results get a score.** A note reached through `refs` is scored by cosine against the query, not left at `score: null`. Then it can be ranked, cut by `min_score`, and compared with a direct hit.
2. **Hits are recorded for related results too**, in a field of their own. Today `recordHits` filters `r.via === "search"`, so a note that arrives through a ref never increments any counter. Nothing in the system measures whether refs are used.
3. **Traversal follows `backrefs` as well as `refs`.** `traverseCorrelates` walks `refs` only, so the read path is one-way: searching A finds B, searching B never finds A. Half the written edges are never walked.

## Why

A top-10 search at depth 1 adds 11.9 notes on average (measured 2026-09-28). They arrive with no score, no threshold, no order, appended after the ranked block, capped only by `MAX_CORRELATES_VISITED` at 500. So a search more than doubles its payload with unranked material.

45% of those added notes sit past the 200th neighbour of the query. That group holds both the structural links that are the whole point of refs and notes that are simply far from the question. With `score: null` nothing tells them apart, so the agent sorts them by eye.

Scoring is cheap. The vectors are already in Qdrant, and `third_os` plans to hold the whole corpus in RAM anyway, where this is a dot product.

Point 2 is the one that answers a question the system cannot answer about itself today. After a month of recorded hits on related results, "does the agent use the refs" is a query, not an analysis.

## Cross-references

- [memory_refs_carry_non_semantic_reach](memory_refs_carry_non_semantic_reach) — the measurement that makes this worth fixing instead of removing
- [memory_human_gate_is_the_bottleneck](memory_human_gate_is_the_bottleneck) — why use has to become the judge
- [hook_tb_ti_auto_injection](hook_tb_ti_auto_injection) — the caller that applies a cutoff today, outside the search
