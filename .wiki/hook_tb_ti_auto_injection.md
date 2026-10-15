---
tags: [hook, tb, ti, context, injection]
sources: [extensions/tb_ti/pi.ts, extensions/tb_ti/claude.sh]
---

## Decision

`extensions/tb_ti/` runs `tb` and `ti` search on every prompt, before the agent answers, and injects the matches into context. Two entry points, one job: `pi.ts` (pi coding-agent extension, `pi.on("before_agent_start")`, message with `display: false`) and `claude.sh` (Claude Code `UserPromptSubmit` hook). Both call the same CLIs in parallel:

```
ti search "<prompt>" --limit 2 --min-score 0.5
tb search "<prompt>" --depth 1 --limit 2 --min-score 0.5 --related-limit 3 --no-archived
```

An empty result or a failed search contributes nothing; if both come up empty, no block is injected.

## Why

This turns the "Search Before Answer" discipline from something the agent must remember into something the harness enforces. The lookup has already run before the first token of the answer. The cutoff is 0.5, measured on the model in use ([memory_score_cutoffs_belong_to_the_model](memory_score_cutoffs_belong_to_the_model)). Archived notes are left out ([memory_refine_archive_hides_from_hook_only](memory_refine_archive_hides_from_hook_only)). The hook is only fast and reliable because both stores are a single always-on source of truth — see [memory_tb_and_ti_run_against_qdrant_and_ollama_on_the_rasp_and_every_client_points_there](core_tb_and_ti_are_stateless_clients_of_one_store_on_the_rasp).

## Cross-references

- [memory_tb_and_ti_run_against_qdrant_and_ollama_on_the_rasp_and_every_client_points_there](core_tb_and_ti_are_stateless_clients_of_one_store_on_the_rasp) — the stores this hook queries
- [memory_ti_context_action_rules](memory_ti_context_action_rules) — the `ti` collection being searched