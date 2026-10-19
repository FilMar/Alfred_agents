---
tags: [memory, tb, link, refs, hubs, aristotele, architecture, idea]
sources: [conversation, tools/tb/src/types.ts, tools/tb/SPEC.md@61cd4c3]
---

## Decision

This is a possible architecture, not a settled one. No code exists. It records the shape agreed in conversation.

`aristotele` is replaced by a command, `tb link`, plus one LLM pass. Code does what is deterministic: find notes with few refs, find near candidates (the vectors are in Qdrant), later find saturated clusters. The LLM does only the judgment: say if a bridge is real and write its `reason`, in one `th` run with one hat and pairs as input. Later, it writes the text of a hub.

- `tb link` follows the shape of `tb refine`: pure functions, I/O at the edge, a dry run first, `--apply` only after two or three dry runs are read.
- The dry run prints candidate pairs as JSON and writes nothing. The LLM sees pairs, never the whole graph.
- An accepted pair becomes a ref through `tb update --add-ref`. The `Link` has an `origin` field, and an automatic ref sets it to `tb-link`, so every automatic edge is known and can be undone. A cap on refs per run, for example 20.
- Order on the timer: `td distill`, then `tb link`, then `tb refine`.
- Hubs come last. First measure how many saturated clusters exist. If few, hubs stay manual.

When this is built, `aristotele` is retired.

## Why

`aristotele` does three things and only one needs judgment. Running all three through an LLM on the whole graph is costly and hard to audit. Splitting by nature keeps the call small and every write traceable.

`tb refine` measures if a note is alive. `aristotele` shapes the graph. They are different problems.

Phase 3 of the distiller looks for bridges only for each new note. `tb link` covers the existing corpus. If fewer than half of those bridges hold, bridges go back to a whole-graph curator, and this design is that curator in code.

A near candidate is not a bridge by itself: only 26% of refs point to the top 10 of a vector search. The judge keeps "when in doubt, it is not connected".

Where it can break: the similarity threshold. Too low gives trivial bridges, too high leaves notes isolated. Fix it after reading a dry run.

## Cross-references

- [memory_bridges_by_shape_are_judged_by_reading](memory_bridges_by_shape_are_judged_by_reading) — phase 3 of the distiller, new notes only
- [memory_refs_carry_non_semantic_reach](memory_refs_carry_non_semantic_reach) — why near is not enough
- [memory_td_distills_by_itself_at_session_start](memory_td_distills_by_itself_at_session_start) — the distiller that replaces `platone` and `erodoto`
- [memory_tb_refine_trust_is_a_derived_number_from_zero_to_one_and_the_first_pass_computes_it_and_stores_nothing](memory_tb_refine_trust_is_a_derived_number_from_zero_to_one_and_the_first_pass_computes_it_and_stores_nothing) — the pattern `tb link` copies
