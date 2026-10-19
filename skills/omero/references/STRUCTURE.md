# Omero — Wiki Structure

The base skeleton of a wiki. Omero reads this to scaffold a new wiki and to keep the layout consistent.

## Base files

Every wiki starts with these files in `.wiki/`:

| File | Purpose |
|------|---------|
| `index.md` | The catalogue. One `## <topic>` section per topic, a table of its decisions, one row each. Updated on every ingest. |
| `roadmap.md` | The future task list. One `## <block>` section per block; short step lines, no code names; reason and plan in the linked decision. Block size follows complexity (see the Roadmap entry in the glossary). |
| `<topic>_<slug>.md` | Decision files. Exactly one decision, one topic, under 40 lines, edited in place until reversed. A style or code convention is a decision too, under topic `style_<name>`. |

There is no history file. Git holds the history of the wiki. A reversed decision is deleted and named in `replaces`.

## Templates

New files are copied from `templates/` (next to this skill): `index.md`, `roadmap.md`, `page.md`. Copy one and fill it in rather than writing structure from memory.

## Init

At setup, Omero creates `index.md` and `roadmap.md` from templates and substitutes the project name. The index is seeded with a row for `roadmap`.

## The three layers

The wiki follows the LLM-wiki pattern:

1. **Raw sources** — the project files the pages are built from. Immutable: read, never modified. Tracked in each page's `sources:` frontmatter.
2. **The wiki** — the `.wiki/` directory. Generated markdown, interlinked. Omero owns it.
3. **The schema** — `wiki.md` if present, else this skill's conventions. It tells Omero how pages are structured.
