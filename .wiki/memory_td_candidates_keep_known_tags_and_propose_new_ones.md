---
tags: [memory, distiller, td, tags, checks]
sources: [conversation, tools/td/src/candidate.ts, tests/td_candidate.test.ts, spikes/2026-10-01-extraction-hats/main.py]
---

## Decision

A note or rule candidate may propose new tags. It must still carry at least one known tag.

- The phase 1 check splits the tags of a candidate in two lists: `tags`, the known ones, and `proposedTags`, the new ones.
- A tag is known when its lexical key matches a tag of `tb tags`. The key ignores case, accents, spaces, underscores and repeated hyphens. A known tag is written back in its vocabulary form: `Sviluppo_Software` becomes `sviluppo-software`.
- A candidate with no known tag drops with `check:tags`.
- At most 3 tags in all: the known ones first, then proposed ones in the free slots.
- Italian plurals are not matched. `dato` and `data` are two different words, and a wrong rule there costs more than the synonym it would catch.

Semantic synonyms (`ai` and `intelligenza-artificiale`) are not caught here. In shadow, the proposed tags reach `extractions`. The data then picks the guard: an embedding of the tags, or the novelty judge.

## Why

The extraction spike gave the model a closed vocabulary: the first 80 tags of `tb tags`. Nobody had decided it. It only followed from "no valid tag" in the list of checks. With a closed vocabulary a new topic never gets its own tag, unless a person adds it by hand. Manual distillation (platone, erodoto) does create tags: 126 tags today, many used once.

An open vocabulary brings back what the spike avoided: synonyms of tags that exist. The known tag keeps every candidate tied to the graph. The proposed tags show, with data, how often a new tag is needed and how often it is a synonym.

The lexical match is pure code, so it lives in the checks. A semantic match needs embeddings, which are I/O, so it does not.

The extraction prompt still says "only from the given vocabulary". It is part of the config, and it must change before the shadow run.

## Cross-references

- [memory_extractor_pipeline_is_v7_with_critic_f_built_in_shadow_first](memory_extractor_pipeline_is_v7_with_critic_f_built_in_shadow_first) — phase 1 and its checks
- [memory_distiller_td_is_fourteen_components_behind_one_entry_point](memory_distiller_td_is_fourteen_components_behind_one_entry_point) — component 7
