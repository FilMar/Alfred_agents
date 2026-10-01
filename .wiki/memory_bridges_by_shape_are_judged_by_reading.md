---
tags: [memory, tb, refs, bridges, distiller]
sources: [conversation, spikes/2026-10-01-extraction-hats/main.py, spikes/2026-10-01-extraction-hats/bridges.jsonl]
---

## Decision

Phase 3 of the distiller looks for bridges by shape, not by topic. It stays as a candidate step. It is judged by reading the bridges it proposes, not by how many hand-written refs it finds again.

The step, once per new note:

1. LLM (green hat): write 2 or 3 sentences with the shape of the note and no domain words. Example: "Kanban against Scrum" becomes "buying flexibility costs predictability".
2. Code: `tb search` each sentence, top 5. Remove the note itself and its 10 nearest topic neighbours.
3. LLM (black hat): for each candidate, `{connected, reason}`. "When in doubt, it is not connected."
4. Code: `tb update --add-ref` for each connected one.

## Why

Links to near neighbours add little. 74% of the refs in `tb` point past the top 10 of a vector search ([memory_refs_carry_non_semantic_reach](memory_refs_carry_non_semantic_reach)). Phase 2 already links a note to its near neighbours. The value of the graph is in the other links. A search by shape is the one cheap way to reach them. `tb random`, the bridge of the note bar, is a lottery: most random notes share nothing, and a weak model says yes to fill the gap.

The spike tested recovery first, because it needs no human. It took 20 hand-written refs whose target lies past rank 50 of a topic search. The shape search found the target 0 times out of 20. The judge said yes to 30 of 241 candidates (12%). The bridges that were read are real ones, for example "an A6 page forces small projects" and "a limit on work in progress forces decisions".

Recovery is a weak test. Many far human refs are loose themselves, for example System 1 linked to "the deferred life". A step can make good new links and still miss these. So the measure is a human reading of the yes answers. If fewer than half hold, bridges go back to aristotele, who works on the whole graph.

## Cross-references

- [memory_refs_carry_non_semantic_reach](memory_refs_carry_non_semantic_reach) — why the far links are the valuable ones
- [memory_distiller_is_a_pipeline_of_small_calls_with_no_tools](memory_distiller_is_a_pipeline_of_small_calls_with_no_tools) — the pipeline this step closes
