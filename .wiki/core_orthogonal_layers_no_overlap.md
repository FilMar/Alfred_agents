---
tags: [core, architecture, layers]
sources: [README.md, .wiki/architettura.md]
---

## Decision

pi is a personal cognitive augmentation system built as five orthogonal layers that cooperate without overlapping:

| Access | Name | Purpose |
|--------|------|---------|
| `tb` (CLI + HTTP) | Third Brain | Semantic memory: ideas, concepts, connections. Additive associative graph with hybrid search and hubs. Notes are never deleted; refs and tags can be updated. |
| `th` (CLI) | Third Hand | Agent orchestration with de Bono hats. Members, sequential and parallel flows, bwrap sandbox. |
| `.wiki/` (Omero skill) | Third Wiki | Local project wiki: decisions, style guides, code conventions. Lives and dies with the project. |
| `ti` (CLI + HTTP) | Third Identity | Context→behavior rules: what to do in a given situation. |
| `tl` (REST, founded, not implemented) | Third Log | Unified structured event log shared by `th`/`tb`/`ti`. |

The boundary that keeps them apart: the Third Brain holds ideas that have value beyond the project — principles, patterns, cognitive tensions. No code, no technical documentation. The local wiki holds project-specific documentation — commands, flows, architecture, conventions. The two complement each other; they never overlap.

## Why

A fact with two homes drifts: one copy is updated, the other lies. Each layer answers one question — what do I know (`tb`), what do I do given a context (`ti`), who executes (`th`), what is this project's state (`.wiki/`), what happened (`tl`). One home per kind of fact removes the sync problem by construction.

## Cross-references

- [core_tb_stateless_single_source](core_tb_stateless_single_source) — how the CLIs stay stateless
- [memory_tl_unified_event_log](memory_tl_unified_event_log) — the layer that replaces `th`'s local tracking
- [memory_ti_context_action_rules](memory_ti_context_action_rules) — the `ti` layer in detail