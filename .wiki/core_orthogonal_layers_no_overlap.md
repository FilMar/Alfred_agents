---
tags: [core, architecture, layers]
sources: [README.md, .wiki/architettura.md@f87afd9, tools/alfred/src/main.rs]
---

## Decision

pi is a personal cognitive augmentation system built as five orthogonal layers that cooperate without overlapping:

| Access | Name | Purpose |
|--------|------|---------|
| `alfred vault` | Vault | Shared knowledge across projects: ideas, principles, patterns. The user and the agent write it together. Agents read it on demand. |
| `alfred command` (CLI) | Third Hand | Delegated runs: a hat plus instructions, in sequence or in parallel, under a bwrap sandbox. |
| `.wiki/` (Omero), `.design/` (Piano) | Third Wiki | The local project: decisions and conventions in `.wiki/`, what the project is for in `.design/`. Lives and dies with the project. |
| `alfred rules` (CLI + HTTP) | Third Identity | Context to behaviour rules: what to do in a given situation. |
| `alfred hist` (CLI + HTTP) | Third Log | The archive of work done: sessions, exchanges and the register of the distiller. |

The distiller is not a layer. It is a worker inside `alfred serve`. It reads hist and writes rules and episodes.

The vault (the published FilWiki site) took the place of `tb`, the old Third Brain of notes: see [memory_tb_dropped_vault_holds_shared_knowledge](memory_tb_dropped_vault_holds_shared_knowledge).

The boundary that keeps them apart: the vault holds ideas that have value beyond the project — principles, patterns, cognitive tensions. No code, no technical documentation. The local wiki holds project-specific documentation — commands, flows, architecture, conventions. The two complement each other. They never overlap.

## Why

A fact with two homes drifts: one copy is updated, the other lies. Each layer answers one question. What do I know (the vault)? What do I do given a context (`alfred rules`)? Who executes (`alfred command`)? Why is this project built this way, and what is it for (`.wiki/`, `.design/`)? What happened (`alfred hist`)? One home per kind of fact removes the sync problem by construction.

## Cross-references

- [core_tb_stateless_single_source](core_alfred_v2_one_binary_serve_on_the_deck) — how the CLIs stay stateless
- [memory_tl_work_archive_not_event_log](memory_tl_work_archive_not_event_log) — the layer that replaces `th`'s local tracking
- [memory_ti_context_action_rules](memory_ti_context_action_rules) — the `ti` layer in detail
