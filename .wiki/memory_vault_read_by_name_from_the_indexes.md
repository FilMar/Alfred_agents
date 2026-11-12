---
tags: [memory, vault, alfred, cli]
sources: [conversation, filcloud:notes/CLAUDE.md]
replaces: [memory_vault_read_by_toc_then_section@f5765ae]
---

## Decision

`alfred vault` has two commands:

- `alfred vault toc <name>`: one line per heading, such as `## tavola-di-verità  211`. The hashes give the level. The number is the length of the section in characters.
- `alfred vault read <name> [heading]`: the markdown of the page, without the frontmatter. With a heading, only that section and its subsections. The heading can be its id or its title.

`<name>` is the name used in a vault link `[[name]]`: the file name without `.md`. A path such as `wandering_sun/world/storia` also works. A name that matches more than one page is an error that lists the paths.

There is no list of pages. The agent starts from `read index` and follows the project indexes and their links.

The id of a section is made from its heading text, the way Quartz makes it: `## 2. I Pianeti Gemelli` gives `2-i-pianeti-gemelli`. `read` turns what it gets into an id by the same rule. An id stays the same, and a title becomes its id. So a vault link such as `[[logic_propositional_xor#Tavola di verità]]` works as written. A title used twice in a page gives the first section.

## Why

The vault already has a map written by the user. `index.md` links each project index, `<project>/<project>.md`, and each index links its pages. A flat list of 184 pages throws that order away.

The vault `CLAUDE.md` asks for file names unique in the whole vault. So the link name is already the address of a page, and the agent follows a `[[link]]` with no translation. Three names repeat today (`storia`, `razze_umani`, `plenarmonia`, in `000_old/` and `world/`). The vault writes those links with the path too.

The largest page has 62 783 characters, about 15-20k tokens. The lengths in `toc` let the agent pick a section before it reads. No length limit is needed.

An id is unique within a page. A title is not: "Indice" and "Note" repeat.

## Cross-references

- [memory_vault_read_from_the_deck_checkout](memory_vault_read_from_the_deck_checkout) — the files these commands read
