---
tags: [memory, distiller, td, novelty]
sources: [tools/td/SPEC_ACTIVE.md@61d5a9f, tools/td/src/novelty.ts, tools/td/src/save.ts]
---

## Decision

The verdict `ref_only` writes nothing to `tb`. The candidate stays in `extractions` with its verdict and `of`, and that is all.

`ref_only` is what phase 2b makes of an `extends` whose `adds` is not a new idea. The `duplicate` verdict is handled the same way.

Only these verdicts write:

| verdict | effect |
|---|---|
| note `new` | save the note |
| note `extends`, `contradicts` | save the note, then a ref to the note it names |
| rule `new` | add the rule |
| rule `append` | add a `do` to the rule it names |

## Why

A ref links two notes. A `ref_only` candidate creates no note, so there is nothing to link from. The first spec said "ref only" and gave no source note. The gap showed up while writing Save.

The other way is to save the note with a ref. That fills `tb` with near copies of notes it already holds. In the first shadow run, six of fourteen kept candidates were `ref_only`. Three of them were about a join on a key that is not unique, and `tb` already held two notes on that idea. Saving them would have made three more.

The cost of this choice is one lost link: the fact that a second source said the same thing. `extractions` keeps it, so a later job can count it if that proves useful.

## Cross-references

- [memory_extractor_pipeline_is_v7_with_critic_f_built_in_shadow_first](memory_extractor_pipeline_is_v7_with_critic_f_built_in_shadow_first) — phase 2b and the rule on `extends`
- [memory_refs_carry_non_semantic_reach](memory_refs_carry_non_semantic_reach) — what a ref is worth
- [memory_distiller_td_is_fourteen_components_behind_one_entry_point](memory_distiller_td_is_fourteen_components_behind_one_entry_point) — components 10 and 11
