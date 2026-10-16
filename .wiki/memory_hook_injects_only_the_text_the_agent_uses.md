---
tags: [memory, hook, tb, ti, injection, measurement]
sources: [SPEC.md@c22c073, REVIEW.md@c22c073, extensions/tb_ti/claude.sh, extensions/tb_ti/pi.ts, spikes/2026-10-15-memory-judge/main.py (local, not in git)]
---

## Decision

The hook injects, for each note, the line `-- <id8>`, then `what`, then `why`. For each rule it injects `-- <id8>` and the actions. It injects no `tags`, `kind`, `score`, `via` or `if`.

The text comes straight from `tb search` and `ti search`. Direct notes come first and related notes follow.

## Why

A judge run read 39 turns, 205 injected notes and 117 control notes taken from other turns. The control shows what the judge says about a note that has nothing to do with the answer.

- A clear dependence of the answer on the note: 4.4% for injected notes, 0.9% for the control.
- No link at all: 85% for injected notes, 93% for the control.
- Trust predicts use. By trust of 0.4 to 0.5, 0.5 to 0.7 and 0.7 to 1: 0%, 2.8% and 7.2% clear dependence.
- By kind, `protocollo` reached 8.3% and `dato` 0%.

So most of what the hook injects is not used in that turn. It also costs: one injection is about 4 000 characters, and the `why` is 40% of the note text.

The `why` stays. In the 9 notes with a clear dependence, the answer held 1% of the rare words of the `why` and 2.8% of those of the `what`. That is too few notes to say the `why` is ignored.

A rule without its `if` does not say when it applies. If rules are used out of context, put the `if` back.

The metric is thin. The judge ran once per turn with no second judge. The new format has 14 injections in the transcripts, too few to compare with the 722 of the old one.

## Cross-references

- [hook_tb_ti_auto_injection](hook_tb_ti_auto_injection) — what the hook is and when it runs
- [memory_search_prints_text_blocks_by_default](memory_search_prints_text_blocks_by_default) — the CLI output the hook prints
- [memory_refine_hits_measure_retrieval](memory_refine_hits_measure_retrieval) — a hit counts retrieval, not use
