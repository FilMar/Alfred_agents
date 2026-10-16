---
tags: [memory, episodic, td, tl, backfill]
sources: [.design/memory.md@0e0a366, conversation]
---

## Decision

Phase 0 of `td distill` writes the episodes of every session it reads. Nothing else fills the index. The past queue is read by running `distill` in batches with `--max-saved`.

The index is built before the automatic run exists, so the automatic run writes into it from its first day.

Sessions already distilled are not read again. They have no episodes. A rebuild mode is for later.

## Why

Figures from 2026-10-16: 313 sessions in `tl`, 238 with exchanges in the queue, 71 with every exchange already distilled, 4 empty. The 71 hold 112 of 3 048 exchanges, 3.7%. Most are from September, from before `td`, and have fewer than two exchanges each.

A rebuild mode is needed anyway when the prompt of phase 0 improves, because the index is derived. That mode will fill the gap as well. Building it now for 112 exchanges is not worth it.

Open: does `td` in shadow mode write episodes? Decide when it is built.

## Cross-references

- [memory_episode_summaries_are_a_derived_index_over_tl](memory_episode_summaries_are_a_derived_index_over_tl) — the index and its rebuild
- [memory_distillation_stays_manual_for_now](memory_distillation_stays_manual_for_now) — the automatic run waits for this
