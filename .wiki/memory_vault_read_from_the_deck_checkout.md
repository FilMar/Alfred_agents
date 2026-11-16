---
tags: [memory, vault, quartz, filwiki, alfred]
sources: [conversation, filcloud:notes_quartz/quartz.config.ts, filcloud:notes_quartz/notes-pull.sh]
replaces: [memory_vault_read_only_from_published_site@f5765ae]
---

## Decision

`alfred serve` reads the vault from the markdown files in `~/notes` on the Deck. It never makes an HTTP call to the site. It never reads the repo on the laptop (`~/git_projects/essays`).

It skips what Quartz skips:
- a page with `draft: true` in its frontmatter;
- the paths in Quartz `ignorePatterns`: `private`, `templates`, `.obsidian`, and at any depth `README.md`, `CLAUDE.md`, `ROADMAP.md`, `*.sh`.

A skipped page answers as a missing page.

Writing goes the other way: the agent writes in the repo on the laptop. A page counts as knowledge only once it is pushed and pulled on the Deck.

## Why

`~/notes` on the Deck is the folder Quartz publishes. The Quartz container mounts it read-only. `notes-pull.timer` pulls it every 10 minutes. So the files on disk are what the site shows, and the markdown keeps every heading. The HTML adds nothing the agent needs.

The draft rule keeps its reason: the user knows a published page is checked.

Known cost: the skip list is a copy of a Quartz setting. A change to `quartz.config.ts` must change it too.

## Cross-references

- [memory_vault_read_by_name_from_the_indexes](memory_vault_read_by_name_from_the_indexes) — the read commands
- [memory_tb_dropped_vault_holds_shared_knowledge](memory_tb_dropped_vault_holds_shared_knowledge) — why the vault exists
