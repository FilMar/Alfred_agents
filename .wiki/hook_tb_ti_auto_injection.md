---
tags: [hook, rules, context, injection]
sources: [extensions/rules/pi.ts, extensions/rules/claude.sh, tools/alfred/src/rules/cli.rs, extensions/tb_ti/claude.sh@last-typescript]
---

## Decision

`extensions/rules/` runs `alfred rules search` on every prompt, before the agent answers, and injects the matches into context. Two entry points, one job: `pi.ts` (pi coding-agent extension, `pi.on("before_agent_start")`, message with `display: false`) and `claude.sh` (Claude Code `UserPromptSubmit` hook). Both call the same command:

```
alfred rules search "<prompt>" --limit 5 --min-score 0.3 --no-archived --timeout 1000
```

The command prints text blocks. The hook adds the header `## Rule matches` and injects the text as it is. What the blocks hold is in [memory_hook_injects_only_the_text_the_agent_uses](memory_hook_injects_only_the_text_the_agent_uses).

An empty result, a failed search, or a server that does not answer in 1 second injects nothing.

## Why

This turns the "Search Before Answer" discipline from something the agent must remember into something the harness enforces. The lookup has already run before the first token of the answer. The cutoff is 0.3, measured on the model in use ([memory_score_cutoffs_belong_to_the_model](memory_score_cutoffs_belong_to_the_model)). Archived rules are left out ([memory_refine_archive_hides_from_hook_only](memory_refine_archive_hides_from_hook_only)). The hook is only fast and reliable because the rules live in one always-on store behind `alfred serve` — see [memory_tb_and_ti_run_against_qdrant_and_ollama_on_the_rasp_and_every_client_points_there](core_alfred_v2_one_binary_serve_on_the_deck).

## Cross-references

- [memory_tb_and_ti_run_against_qdrant_and_ollama_on_the_rasp_and_every_client_points_there](core_alfred_v2_one_binary_serve_on_the_deck) — the store this hook queries
- [memory_ti_context_action_rules](memory_ti_context_action_rules) — the rules collection being searched