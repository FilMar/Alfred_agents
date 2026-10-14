---
tags: [core, architecture, layers]
sources: [README.md, .wiki/architettura.md@f87afd9]
---

## Decision

pi is a personal cognitive augmentation system built as five orthogonal layers that cooperate without overlapping:

| Access | Name | Purpose |
|--------|------|---------|
| `tb` (CLI + HTTP) | Third Brain | Semantic memory: ideas, concepts, connections. An associative graph with hybrid search and hubs. Notes are added. `tb refine` archives the unused ones, and deletes one after a year with no signal. |
| `th` (CLI) | Third Hand | Delegated runs: a hat plus instructions, in sequence or in parallel, under a bwrap sandbox. |
| `.wiki/` (Omero), `.design/` (Piano) | Third Wiki | The local project: decisions and conventions in `.wiki/`, what the project is for in `.design/`. Lives and dies with the project. |
| `ti` (CLI + HTTP) | Third Identity | Context to behaviour rules: what to do in a given situation. |
| `tl` (REST) | Third Log | The archive of work done: sessions, exchanges and the register of the distiller. |

`td` is not a layer. It is a worker that reads `tl` and writes to `tb` and `ti`.

The boundary that keeps them apart: the Third Brain holds ideas that have value beyond the project — principles, patterns, cognitive tensions. No code, no technical documentation. The local wiki holds project-specific documentation — commands, flows, architecture, conventions. The two complement each other. They never overlap.

## Why

A fact with two homes drifts: one copy is updated, the other lies. Each layer answers one question: what do I know (`tb`), what do I do given a context (`ti`), who executes (`th`), why is this project built this way and what is it for (`.wiki/`, `.design/`), what happened (`tl`). One home per kind of fact removes the sync problem by construction.

## Cross-references

- [core_tb_stateless_single_source](core_tb_and_ti_are_stateless_clients_of_one_store_on_the_rasp) — how the CLIs stay stateless
- [memory_tl_work_archive_not_event_log](memory_tl_work_archive_not_event_log) — the layer that replaces `th`'s local tracking
- [memory_ti_context_action_rules](memory_ti_context_action_rules) — the `ti` layer in detail
