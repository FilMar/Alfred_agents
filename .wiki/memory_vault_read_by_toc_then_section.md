---
tags: [memory, vault, quartz, alfred, cli]
sources: [conversation]
---

## Decision

`alfred vault` has three read commands:

- `alfred vault ls`: the pages, with slug and title. They come from `static/contentIndex.json`.
- `alfred vault toc <slug>`: the headings of one page, each with its level and its id.
- `alfred vault read <slug> <id>`: the text of one section, with its subsections.

`toc` and `read` take the headings from the published HTML page. A heading there looks like `<h2 id="2-i-pianeti-gemelli">`.

A section is chosen by its id, not by its title text.

A page with no headings comes back whole. Its length still needs a limit or a warning, which is not decided yet.

## Why

The largest page, `wandering_sun/000_old/00_ESSENTIALS`, has 62 783 characters, about 15-20k tokens. It is too big to give the agent whole. The full `contentIndex.json` is 1.2 MB.

`contentIndex.json` keeps the content as flat text: a heading is just a line like any other. Finding the chapters there would mean guessing. The HTML has every heading with a stable id.

Titles repeat across pages, for example "Indice" or "Note". An id is unique within one page.

## Cross-references

- [memory_vault_read_only_from_published_site](memory_vault_read_only_from_published_site) — the source these commands read
