---
tags: [memory, rules, cli, id]
sources: [SPEC.md@c22c073, tools/alfred/src/rules/store/mod.rs, tools/alfred/src/qdrant.rs, tools/ti/src/identity.ts@last-typescript]
---

## Decision

`alfred rules meta`, `alfred rules delete` and `alfred rules append-do` take a full id or a unique prefix of a rule id. `Rules::resolve` in `tools/alfred/src/rules/store/mod.rs` resolves it, through `Qdrant::resolve`.

No rule starts with the prefix: an error. Several rules do: an "Ambiguous" error with up to five candidates. An empty prefix is refused.

## Why

The hook shows an id of 8 characters. An id the agent cannot use in a command is of no help. `tb` already took a prefix, `ti` did not.

The 71 rules have 71 different prefixes of 8 characters, and none matches the id of a note.

`Qdrant::resolve` reads the whole list of ids to find the match. That is cheap for 71 rules. With thousands of rules, scroll only the ids.

## Cross-references

- [memory_search_prints_text_blocks_by_default](memory_search_prints_text_blocks_by_default) — where the short id comes from
- [memory_ti_context_action_rules](memory_ti_context_action_rules) — the rules this id names
