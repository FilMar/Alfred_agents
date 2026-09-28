---
tags: [memory, tb, schema, migration]
sources: [conversation, ROADMAP_MEMORIA.md, tools/tb/src/types.ts]
---

## Decision

Every new note keeps the raw text it was distilled from, in a `source_raw` field. Old notes keep the field empty. The field is required on writes from now on.

## Why

"Dump the store, empty it, and re-insert everything with more thought" is not possible for this corpus. 369 of 737 notes have no recoverable raw source (measured 2026-09-28). For those notes the distilled text is all there is, so a better schema or a better model cannot be applied backwards.

A schema change can be replayed if the input still exists. A lost input cannot be recovered at any price. Keeping the raw text costs storage, which is the cheapest thing in the stack.

The user's own note `99e6a68e` already said to keep the raw material. It was never applied. Writing it as a decision here makes the rule checkable.

## Cross-references

- [memory_human_gate_is_the_bottleneck](memory_human_gate_is_the_bottleneck) — why re-ingestion must not need a human pass
- [memory_alias_makes_migration_reversible](memory_alias_makes_migration_reversible) — the other half of a safe migration
- [core_tb_stateless_single_source](core_tb_stateless_single_source) — the store this schema lives in
