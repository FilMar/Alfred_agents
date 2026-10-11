---
tags: [memory, architecture, coala, tl, survey]
sources: [conversation, "https://www.youtube.com/watch?v=BacJ6sEhqMo", "https://www.youtube.com/watch?v=aYfZN8t6AQs", "https://www.youtube.com/watch?v=R1TNGOZAOZs", "https://www.youtube.com/watch?v=0P-ACuHyu-0"]
---

## Decision

Use CoALA (Cognitive Architectures for Language Agents, Princeton) as the map of the memory stack. It names four memory types. Each one already has a home in pi, except one:

| CoALA type | What it holds | Where it lives in pi | State |
|---|---|---|---|
| Working | what the model sees right now | context window, `CLAUDE.md`, the `tb`/`ti` injection hook | built |
| Semantic | facts, concepts, conventions | `tb`, cross-project | built |
| Procedural | how to do things | skills (`SKILL.md`) and `ti` rules (`if` to `do`) | built |
| Episodic | what happened, and what was learned from it | `tl` | founded, not built |

`.wiki/` is not one of the four. It is the project's notebook — see [memory_wiki_is_the_project_notebook](memory_wiki_is_the_project_notebook).

So the hole in the stack is episodic memory, and it already has a name. Every memory product surveyed — Hindsight, Mnemosyne, Mem0 — sits in that slot. Any of them is a candidate engine for `tl`. None of them is a replacement for `tb` or `ti`.

The survey also gives a clean test for the `tb` / `ti` split, from the Hermes stack: knowledge you want to keep and organise across everything you do is world knowledge, so it is `tb`. A fact about how you like to work, or about what you are doing right now, is operational memory, so it is `ti`.

## Why

The layers of pi were designed from the inside, one need at a time. CoALA is an outside frame, and it agrees with the split. That is worth more than agreement from inside, because it makes the missing piece visible by absence instead of by intuition. Three of four types exist and one does not, and the one that does not is the one already planned and unbuilt.

It also settles a recurring question. Products in this space are easy to mistake for competitors of `tb`, because they all say "memory". They are not: they store distilled experience across sessions, which is episodic. `tb` stores facts and concepts, which is semantic. The two answer different questions and both are needed.

The surveyed systems agree on one more point, and it is the hard one: forgetting is engineering, not a side effect. Episodic memory is the type where what to drop, and when something goes stale, must be decided explicitly.

## Cross-references

- [memory_tl_work_archive_not_event_log](memory_tl_work_archive_not_event_log) — the episodic layer, specified
- [memory_log_first_three_moves](memory_log_first_three_moves) — the same ordering reached from inside the project
- [core_orthogonal_layers_no_overlap](core_orthogonal_layers_no_overlap) — the layer boundary this map confirms
- [memory_graph_engine_deferred_not_needed](memory_graph_engine_deferred_not_needed) — why the gap is not a storage-engine problem
