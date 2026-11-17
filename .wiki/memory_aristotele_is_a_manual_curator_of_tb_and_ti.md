---
tags: [memory, aristotele, curation, tb, ti, refs, hubs]
sources: [conversation, .design/memory.md, skills/aristotele/SKILL.md]
replaces: [memory_tb_link_is_a_possible_architecture_that_replaces_aristotele_with_vector_candidates_and_one_llm_judge@b063976]
---

## Decision

Aristotele stays. It is the curator of the rules in `alfred rules`, and the user starts it by hand when they want. It curated the `tb` notes too, until `tb` was removed.

- It acts without asking for approval.
- It merges rules (`alfred rules add` of the new rule, `alfred rules delete` of the old ones), and deletes rules that are wrong or out of date.
- It adds ghost rules for rules that the prompts rarely reach ([ghost rules](memory_ghost_rules_are_plain_ti_rules_with_the_same_do)).
- At the end it shows a temporary web report of what it did, with charts.
- It runs no backup of its own. The server backs up the memory by itself.
- It works on the close pairs that `alfred rules near` finds and on the rules the prompts rarely reach.

`tb link`, the command plus one LLM judge planned to replace Aristotele, is not built.

## Why

The user decides when curation runs, and the agent decides what to keep. This matches `.design/memory.md`.

`alfred rules refine` measures whether a rule is alive, from use. Aristotele judges whether it is right: duplicate, wrong, or worth a link or a hub. They stay separate, so each can be checked on its own.

The report replaces approval. The user reads what happened afterwards, instead of approving each change before it happens.

A backup step was planned first. The user dropped it: the backup already happens on the server, so a second one in the skill is a manual copy of an automatic step.

The first real run, on notes, showed that a large tag cannot be read whole: `sistema` held hundreds of notes. So a run works on a list it can finish.

## Cross-references

- [memory_near_and_reach_find_what_aristotele_judges](memory_near_and_reach_find_what_aristotele_judges) — the lists a run works on
- [memory_ghost_rules_are_plain_ti_rules_with_the_same_do](memory_ghost_rules_are_plain_ti_rules_with_the_same_do) — what a ghost rule is
