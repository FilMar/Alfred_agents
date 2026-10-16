---
tags: [memory, ti, cli, id]
sources: [SPEC.md@c22c073, tools/ti/src/identity.ts, tools/ti/src/cli.ts]
---

## Decision

`ti meta`, `ti delete` and `ti append-do` take a full id or a unique prefix of a rule id. `resolveEntryId` in `tools/ti/src/identity.ts` resolves it, as `resolveNoteId` does for `tb`.

No rule starts with the prefix: an error. Several rules do: an "Ambiguous" error with up to five candidates. An empty prefix is refused.

## Why

The hook shows an id of 8 characters. An id the agent cannot use in a command is of no help. `tb` already took a prefix, `ti` did not.

The 71 rules have 71 different prefixes of 8 characters, and none matches the id of a note.

`resolveEntryId` reads the whole list of rules to find the match. That is cheap for 71 rules. With thousands of rules, scroll only the ids.

## Cross-references

- [memory_search_prints_text_blocks_by_default](memory_search_prints_text_blocks_by_default) — where the short id comes from
- [memory_ti_context_action_rules](memory_ti_context_action_rules) — the rules this id names
