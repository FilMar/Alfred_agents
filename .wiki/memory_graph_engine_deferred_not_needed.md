---
tags: [memory, tb, ti, architecture, qdrant]
sources: [conversation, tools/tb/src/qdrant.ts, ROADMAP.md]
---

## Decision

`tb` and `ti` stay in Qdrant. No native graph database, for identity or for knowledge.

The threshold to revisit is written down, so the choice can be reopened on data and not on taste. All three must hold at once:

- more than about 10 edges per note,
- queries shaped as paths with predicates ("every rule that fired in a context tagged X and led to an outcome tagged Y within 3 hops"),
- a graph that no longer fits in memory.

When that day comes the candidate is SQLite with recursive CTEs, already a `tl` dependency. Not Neo4j, and not a second service.

## Why

The corpus is 737 notes and 1150 edges, 1.56 edges per note (2026-09-28). It fits in a few megabytes. `third_os` already plans to hold it in RAM and compute neighbours as a dot product, so traversal over this graph is microseconds of TypeScript. A graph engine would solve a query-speed problem that does not exist and add an operational one that would.

Entry into the store is semantic and stays semantic. The agent asks in natural language mid-session; it does not know the node's name. A graph store would therefore still need a vector index over its node text, so it is a store added next to Qdrant, not one replacing it. Two stores means keeping them in sync, and the failure mode is silent: a divergence returns the wrong identity with no error. This is the layer question the `ti` rule about many-layer designs already asks, and the answer here is that it does not degrade in a known way.

The edges are the scarce resource, not the queries over them. 18 of the 32 most obvious semantic pairs in the corpus have no link. A graph engine makes edges cheaper to query and produces none. `tl` produces them from observed use, for free, which is why it comes first.

Rejected alternative, worth keeping in mind: a second Qdrant collection where every point is an entity linked back to notes, the way Mem0 does it. It gives entity-based reranking with no new engine. It was set aside because it can only reorder the pool already fetched — it cannot reach a note outside it — and `refs` already reach further than any pool. It becomes interesting only as a ranking signal, never as reach.

## Cross-references

- [memory_refs_carry_non_semantic_reach](memory_refs_carry_non_semantic_reach) — the graph is valuable and still small
- [memory_coala_four_types_map_to_pi](memory_coala_four_types_map_to_pi) — where the missing layer actually is
- [memory_tl_work_archive_not_event_log](memory_tl_work_archive_not_event_log) — the component that produces edges without a human
- [graph_third_os_imports_tb_as_library](graph_third_os_imports_tb_as_library) — the in-RAM corpus this decision leans on
