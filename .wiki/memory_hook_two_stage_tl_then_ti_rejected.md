---
tags: [memory, hook, ti, tl, spike]
sources: [conversation, spikes/2026-11-12-memory-tl-vs-tbti/main.py]
---

## Decision

The prompt hook searches `ti` with the prompt alone. It does not run a second `ti` search enriched with the best `tl` episode.

## Why

The spike tried the two-stage version. It searched `ti` on the prompt. When the best `tl` episode scored at least 0.55, it searched `ti` again on the prompt plus that episode's summary. The two result lists were merged, keeping the 5 best.

On 32 real prompts the second stage ran 17 times. It mostly reshuffled the generic rules. Sometimes it lost a precise rule, for example "never commit a spike". It did not trigger on a project question where the best episode scored 0.45.

The average hook time grew from 0.9 s to 1.6 s, with a maximum of 4.1 s.

It cannot work while `ti` holds no rules bound to a project. An episode about a project finds nothing extra to bring in.

## Cross-references

- [memory_tb_dropped_vault_holds_shared_knowledge](memory_tb_dropped_vault_holds_shared_knowledge) — the same spike
- [hook_tb_ti_auto_injection](hook_tb_ti_auto_injection) — the hook today
