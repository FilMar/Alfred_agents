---
tags: [memory, aristotele, curation, tb, ti, refs, hubs]
sources: [conversation, .design/memory.md]
replaces: [memory_tb_link_is_a_possible_architecture_that_replaces_aristotele_with_vector_candidates_and_one_llm_judge@b063976]
---

## Decision

Aristotele stays. It is the curator of both `tb` and `ti`, and the user starts it by hand when they want.

- It acts without asking for approval.
- It merges notes ([tb merge](memory_tb_merge_moves_links_onto_one_note)) and rules (`ti add` of the new rule, `ti delete` of the old ones).
- It adds refs where they are useful, and writes hubs that sum up several notes in one argument.
- It adds ghost rules for rules that the prompts rarely reach ([ghost rules](memory_ghost_rules_are_plain_ti_rules_with_the_same_do)).
- At the end it shows a temporary web report of what it did, with charts.

`tb link`, the command plus one LLM judge planned to replace Aristotele, is not built.

## Why

The user decides when curation runs, and the agent decides what to keep. This matches `.design/memory.md`.

`tb refine` measures whether a note is alive, from use. Aristotele judges whether it is right: duplicate, wrong, or worth a link or a hub. They stay separate, so each can be checked on its own.

The report replaces approval. The user reads what happened afterwards, instead of approving each change before it happens.

## Cross-references

- [memory_refs_carry_non_semantic_reach](memory_refs_carry_non_semantic_reach) — why links are worth curating
- [memory_bridges_by_shape_are_judged_by_reading](memory_bridges_by_shape_are_judged_by_reading) — bridges the distiller draws for new notes
