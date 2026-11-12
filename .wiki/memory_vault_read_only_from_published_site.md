---
tags: [memory, vault, quartz, filwiki, alfred]
sources: [conversation]
---

## Decision

Agents read the vault only from the published site, https://filcloud.fennec-gila.ts.net:8443/. They never read the local repo `~/git_projects/essays`.

Writing goes the other way: the agent writes in the repo. A page counts as knowledge only once it is published.

When the site does not answer, the command fails with a clear error. It never falls back to the local repo.

Reading is routed on demand. A `ti` rule can send the agent to a page, for example "if the user asks about Wandering Sun, read `wandering_sun/wandering_sun`". A rule names a page, never a chapter.

## Why

The published site is a source the user knows is published and checked. Pages marked `draft: true` stay off the site, so the agent cannot see them. A silent fallback to the repo would bring drafts back, and that would break the reason for this rule.

A rule names a page because a chapter id comes from its heading. Renaming the heading changes the id and breaks the rule.

Known cost: a page appears only after the site is built again.

## Cross-references

- [memory_vault_read_by_toc_then_section](memory_vault_read_by_toc_then_section) — the read commands
- [memory_tb_dropped_vault_holds_shared_knowledge](memory_tb_dropped_vault_holds_shared_knowledge) — why the vault exists
