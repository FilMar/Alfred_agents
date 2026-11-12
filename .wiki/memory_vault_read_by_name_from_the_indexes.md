---
tags: [memory, vault, alfred, cli]
sources: [conversation, filcloud:notes/CLAUDE.md]
replaces: [memory_vault_read_by_toc_then_section@f5765ae]
---

## Decision

`alfred vault` has one command, `alfred vault read <name> [heading] [--all]`:

- an index page (`index`, or a file named like its folder, such as `MoP/MoP`): the whole page;
- a page of 4000 characters or less, or with no headings: the whole page;
- a longer page with headings: its outline, one line per heading, such as `## tavola-di-verità  211`. The hashes give the level, the number is the length of the section in characters;
- with a heading: that section and its subsections. The heading can be its id or its title;
- with `--all`: the whole page, whatever its size.

The client prints a page without the frontmatter and without blank lines at the ends. A link `[[MoP|Meaning of Power]]` prints as `Meaning of Power (MoP)`. The API stays raw: `/vault/toc` gives the path, the length and the headings, `/vault/read` gives the markdown.

`<name>` is the name used in a vault link `[[name]]`: the file name without `.md`. A path such as `wandering_sun/world/storia` also works. A name that matches more than one page is an error that lists the paths.

There is no list of pages. The agent starts from `read index` and follows the project indexes and their links.

The id of a section is made from its heading text, the way Quartz makes it: `## 2. I Pianeti Gemelli` gives `2-i-pianeti-gemelli`. `read` turns what it gets into an id by the same rule. An id stays the same, and a title becomes its id. So a vault link such as `[[logic_propositional_xor#Tavola di verità]]` works as written. A title used twice in a page gives the first section.

## Why

The vault already has a map written by the user. `index.md` links each project index, `<project>/<project>.md`, and each index links its pages. A flat list of 184 pages throws that order away.

The vault `CLAUDE.md` asks for file names unique in the whole vault. So the link name is already the address of a page, and the agent follows a `[[link]]` with no translation. Three names repeat today (`storia`, `razze_umani`, `plenarmonia`, in `000_old/` and `world/`). The vault writes those links with the path too.

The largest page has about 70 000 characters, 15-20k tokens. The outline lets the agent pick a section before it reads. A separate `toc` command cost the agent a call on every page, short ones included. One command that answers with the page or with its outline costs one call, and the answer says what to do next.

An id is unique within a page. A title is not: "Indice" and "Note" repeat.

## Cross-references

- [memory_vault_read_from_the_deck_checkout](memory_vault_read_from_the_deck_checkout) — the files these commands read
