---
tags: [memory, tb, refs, retrieval, measurement]
sources: [conversation, tools/tb/src/qdrant.ts, tools/tb/src/types.ts]
---

## Decision

`refs` stay. Knowledge in `tb` is not only semantic, and the hand-written links are the part a vector index cannot rebuild.

Measured on all 1150 edges of the corpus (2026-09-28). For each edge, the rank of the target inside the 200 nearest dense neighbours of the source note:

| Rank of the target | Edges | Share |
|---|---|---|
| top-5 | 218 | 19% |
| top-10 | 81 | 7% |
| top-25 | 164 | 14% |
| top-50 | 97 | 9% |
| 51-200 | 313 | 28% |
| past 200 | 266 | 23% |

Only 26% of the links point to a note the vector search already returns in the top 10. 23% point past the 200th neighbour, so no reasonable limit would surface them.

One edge from that last group, as the shape of the value: *Kanban against Scrum* to *throughput against latency*, with the reason "same trade-off shape — buying flexibility costs predictability, like throughput costs latency". The two notes share no term. No embedding model links them.

Second use of the same data: these edges are free ground truth. A retrieval benchmark can score ref-recall@10 with no labels and no human judgment. The measure is biased toward the model the corpus was built with, so it reads as a conservative test, never as proof a new model is better.

## Why

The question was whether an agent needs links at all, since retrieval is semantic. The data answers it. Cosine similarity measures what a note is about. A ref records what shape a thought has, and the two are different. Drop the refs and the 26% redundant part is not what goes missing.

Debt found and not fixed: 11 edges point to notes that no longer exist. `deleteNote` cleans links, so these survived deletions made outside that path.

## Cross-references

- [memory_related_notes_ranked_not_cut](memory_related_notes_ranked_not_cut) — the fix to how these edges are used at search time
- [memory_graph_engine_deferred_not_needed](memory_graph_engine_deferred_not_needed) — why a sparse valuable graph still needs no graph engine
- [memory_human_gate_is_the_bottleneck](memory_human_gate_is_the_bottleneck) — who writes these edges today, and the cost
