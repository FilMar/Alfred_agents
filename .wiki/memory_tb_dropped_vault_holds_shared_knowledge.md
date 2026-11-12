---
tags: [memory, tb, ti, tl, vault, alfred]
sources: [conversation, spikes/2026-11-12-memory-tl-vs-tbti/main.py]
---

## Decision

In alfred v2 the memory has three parts:

- `alfred rules` (`ti` today): context-to-action rules. The distiller writes them. The prompt hook injects them.
- `alfred hist` (`tl` today): the episodes of past work, archived without any manual step.
- The vault: the FilWiki Quartz site (repo `~/git_projects/essays`). The user and the agent write it together, in the repo. Agents read it on demand.

`tb` is not migrated. Its notes are dropped. The distiller only produces rules and episodes.

This is a design target. `tb` still runs until alfred v2 replaces the hook.

## Why

A spike ran the current hook (`tb` plus `ti`) and a search on `tl` episodes only, on 32 real past prompts:

- `tl` helped more on 12 prompts, `tb` plus `ti` on 5, there were 4 ties, and nothing helped on 11.
- `tb` was decisive once.
- `ti` won where a precise working rule applied, for example "use the CLI, not curl".

About a third of the prompts are quick reactions inside a flow. No memory helps there.

`tb` notes are written by a machine and read by a machine, so nobody checks them. Vault pages are written with the user and published by the user. So they are knowledge the user stands behind.

Two defects were found and are still open:
- Generic `ti` rules score 0.5-0.6 on every prompt.
- Empty `tl` episodes ("Saluto iniziale", ":q") pollute the results.

## Cross-references

- [memory_vault_read_only_from_published_site](memory_vault_read_only_from_published_site) — how agents read the vault
- [memory_hook_two_stage_tl_then_ti_rejected](memory_hook_two_stage_tl_then_ti_rejected) — the hook variant tried in the same spike
- [core_alfred_v2_one_binary_serve_on_the_deck](core_alfred_v2_one_binary_serve_on_the_deck) — where the stores live
