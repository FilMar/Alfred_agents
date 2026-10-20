---
tags: [memory, ti, ghost-rules, aristotele]
sources: [conversation, SPEC.md@deaf2ab]
---

## Decision

A ghost rule is a plain `ti add`: a new `if` with the same `do` as a rule that the prompts rarely reach. `ti` has no multi-trigger rule and no command for it.

This is not the case of the td rule "one `if`, append each action to the list". That rule is about extraction. Ghost rules are a curation move made on purpose by Aristotele.

## Why

Separate rules keep separate stats: each trigger gets its own hits, and `ti refine` archives the triggers that never come up.

A multi-vector point would need a new collection and a migration, and would hide which trigger was used.

## Cross-references

- [memory_ti_gets_hits_and_refine_exactly_like_tb](memory_ti_gets_hits_and_refine_exactly_like_tb) — the counters each ghost rule gets
- [memory_aristotele_is_a_manual_curator_of_tb_and_ti](memory_aristotele_is_a_manual_curator_of_tb_and_ti) — who adds them
