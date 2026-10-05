---
tags: [memory, tl, hindsight, mem0, distiller]
sources: [conversation, "https://github.com/vectorize-io/hindsight", "https://github.com/mem0ai/mem0", tools/tl/README.md]
---

## Decision

Hindsight does not replace `tl`, and it is not the engine of the distiller. `tb` and `ti` stay as they are.

What is taken from Hindsight and mem0 is their shape, not their code: one structured LLM call with no tools, and code for every other step. The distiller is built in place on that shape. See [memory_extractor_pipeline_is_v7_with_critic_f_built_in_shadow_first](memory_extractor_pipeline_is_v7_with_critic_f_built_in_shadow_first).

This closes the open question "Hindsight as the engine" in [memory_distillation_stays_manual_for_now](memory_distillation_stays_manual_for_now) and in `tools/tl/ROADMAP.md`.

## Why

**`tl` keeps the raw text, and Hindsight does not.** `tl` exists so that a note can be extracted again when the distiller improves. Hindsight runs an LLM on every chunk at write time and keeps the extracted facts. Swapping `tl` for it brings back the problem `tl` was built to fix: 369 of 737 notes with no source left.

**Hindsight overlaps `tb`.** Its world facts and observations are semantic memory, which is what `tb` holds. Two semantic stores mean two answers at session start, with no rule for which one wins.

**The code was read, not the docs** (mem0 on 2026-09-25, Hindsight on 2026-10-01). Both systems split the work the same way:

| step | mem0 v3 | Hindsight retain |
|---|---|---|
| LLM | one call per `add()`, JSON mode, no tools | one call per 3,000-char chunk, JSON schema, no tools |
| does the LLM see existing memories | yes, the 10 nearest | no |
| "worth remembering" | prompt only, and it says "when in doubt, extract" | prompt only |
| duplicates | code, exact MD5 | none at write time |
| entities and links | code (spaCy, cosine 0.95) | code (trigrams, cosine 0.7, time window) |
| update and delete | removed in v3: add only | add only; a background step merges observations, 8 facts per call |

Neither system asks the model to be selective, and neither one cleans up at write time. Both pay for quality at read time, with BM25, rank fusion and a reranker. Hindsight recommends `gpt-oss-20b` for extraction, because the task is "structured and well-defined".

So the gap between "it works for them with 20B" and "it fails for us with a bigger model" was the shape of the task, not the size of the model. Our first distiller was one agent that read a 15k-token protocol, drove three CLIs and judged value. Theirs is one narrow call.

**The cost of building in place is small.** The spike that copied the shape ran a 38-exchange session in about 2 minutes, for about 2 cents.

## Cross-references

- [memory_coala_four_types_map_to_pi](memory_coala_four_types_map_to_pi) — where Hindsight was first named as a candidate for the episodic slot
- [memory_tl_work_archive_not_event_log](memory_tl_work_archive_not_event_log) — why `tl` keeps the raw text
- [memory_episode_summaries_are_a_derived_index_over_tl](memory_episode_summaries_are_a_derived_index_over_tl) — the search over `tl` that Hindsight would have given
