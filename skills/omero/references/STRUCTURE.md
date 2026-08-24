# Omero — Wiki Structure

The base skeleton of a wiki. Omero reads this to scaffold a new wiki and to keep the layout consistent.

## Base files

Every wiki starts with these files in `.wiki/`:

| File | Purpose |
|------|---------|
| `index.md` | The catalogue. A table of Page + Content, one row per page. Updated on every ingest. |
| `log.md` | The history. Append-only record of changes. |
| `roadmap.md` | The future task list. One line per task, deep dives in linked files. |
| `<name>.md` | Content pages. Named `category_subject`. |
| `style_<name>.md` | Style pages. Document patterns and conventions. |

## Templates

New files are copied from `templates/` (next to this skill): `index.md`, `log.md`, `roadmap.md`, `page.md`, `style.md`. Copy one and fill it in rather than writing structure from memory.

## Init

At setup, Omero creates `index.md`, `log.md`, `roadmap.md` from templates and substitutes the project name. The index is seeded with rows for `log` and `roadmap`.

## The three layers

The wiki follows the LLM-wiki pattern:

1. **Raw sources** — the project files the pages are built from. Immutable: read, never modified. Tracked in each page's `sources:` frontmatter.
2. **The wiki** — the `.wiki/` directory. Generated markdown, interlinked. Omero owns it.
3. **The schema** — `wiki.md` if present, else this skill's conventions. It tells Omero how pages are structured.
