# Glossary — Omero and the Wiki

The domain model for the wiki Omero maintains. Every term below is a part of the wiki structure or a rule for writing pages. The wiki holds what the project knows; these terms keep that knowledge well-shaped and consistent.

## English style

Wiki page text is written in **easy English**. The wiki lives in a git repo and can be shared, so it sits on the public side of the language split (skills and wiki pages in English; the Third Brain and personal notes in Italian).

Write pages in easy English:

- Short sentences. One idea per sentence.
- No subordinate clauses where two sentences would do.
- Common words over Latinate ones ("use" not "utilize", "fix" not "rectify").
- Active voice ("the script reads the file", not "the file is read by the script").
- No idioms — they don't translate and they don't parse reliably.

The rule serves two readers at once: a human skimming the page, and the agent that maintains it. Short sentences and active voice leave less room for a wrong edit.

## The wiki

### Page

A markdown file in `.wiki/`. Name is `category_subject` (lowercase, underscore). Structure is H2 sections. Ends with a `## Cross-references` section.

### Source

A project file the page was built from. Tracked in the page's `sources:` frontmatter. The wiki reads sources but never modifies them.

### Frontmatter

A fenced `yaml` block at the top of the page. Holds `tags`, `sources`, `updated`. It is metadata — put classification here, not in the page name.

### Tag

A label in frontmatter. Groups pages by theme. Live in frontmatter, never in the file name — the name is a stable identifier; a tag is metadata. Adding a tag must never force a rename.

## Navigation

### Index

The catalogue page (`index.md`). A table listing every page with a link and a one-line summary. Updated on every ingest. It is the entry point for a query.

### Log

The history page (`log.md`). Append-only. Records what changed and when, each entry starting `## [YYYY-MM-DD] <op> | <title>`. A prefix makes the log parseable with simple tools.

### Roadmap

The future task list (`roadmap.md`). One line per task, ten words or fewer, no code names. Group tasks under an H3 per area (engine, render, one per game). A group can start with one plain sentence of status. The reason and the plan live in the linked page, never in the line. Both potential and agreed tasks live here.

### Cross-Reference

A link from one page to another. Written in the `## Cross-references` section and inside the body. The wiki's value lives here: the connections are already written, not recomputed at query time.

## Operations

### Ingest

Reading a source and integrating it into the wiki. Updates the page, the cross-references, the index and the log. Procedure: `ingest.md`.

### Query

Answering a question from the wiki. Grep, read the found pages, answer with citations. Procedure: `query.md`.

### Style

Writing a `style_<name>.md` page for a pattern or convention. Records how the code writes things and how to extend it. Procedure: `style.md`.

### Lint

The health-check. Flags contradictions, orphan pages, missing concept pages, stale statements. Procedure: `lint.md`.

### Orphan

A page no other page links to. Lint flags it: without inbound links it cannot be found.

### Contradiction

Two pages that say things that conflict. Lint flags it; in narrative projects it is a hard error.

## Language of this glossary

This glossary is written in easy English, following the rule above.
