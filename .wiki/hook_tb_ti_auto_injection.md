---
tags: [hook, tb, ti, context, injection]
sources: [extensions/tb_ti/pi.ts, extensions/tb_ti/claude.sh]
---

## Decision

`extensions/tb_ti/` runs `tb` and `ti` search on every prompt, before the agent answers, and injects the matches into context. Two entry points, one job: `pi.ts` (pi coding-agent extension, `pi.on("before_agent_start")`, message with `display: false`) and `claude.sh` (Claude Code `UserPromptSubmit` hook). Both call the same CLIs in parallel:

```
ti search "<prompt>" --limit 3 --min-score 0.6
tb search "<prompt>" --depth 1 --limit 5 --min-score 0.6
```

An empty result or a failed search contributes nothing; if both come up empty, no block is injected.

## Why

This turns the "Search Before Answer" discipline from something the agent must remember into something the harness enforces mechanically — the lookup has already run before the first token of the answer. The 0.6 cutoff is applied at the injection boundary, not inside `ti search` itself: the native relevance-cutoff parameter is still open work (see [memory_ti_context_action_rules](memory_ti_context_action_rules)). The hook is only fast and reliable because both stores are a single always-on source of truth — see [memory_tb_ti_on_rasp](memory_tb_ti_on_rasp).

## Cross-references

- [memory_tb_ti_on_rasp](memory_tb_ti_on_rasp) — the stores this hook queries
- [memory_ti_context_action_rules](memory_ti_context_action_rules) — the `ti` collection being searched