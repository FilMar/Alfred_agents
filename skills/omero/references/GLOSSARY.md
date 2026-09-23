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

### Decision

A markdown file in `.wiki/` that records exactly one decision on one topic. Name is `<topic>_<slug>` (lowercase, underscore); the slug is long and says the whole decision. Structure is `## Decision`, `## Why`, `## Cross-references`. Under 100 lines — a longer file holds more than one decision and gets split. Once written, its body never changes — a typo fix is the only exception. A change of course is a new decision file, never an edit to the old one.

A decision records the why. The what — the current state of a topic — lives in the code, and a decision does not restate it. A design target with no code yet is the one case where the decision is also the state.

### Topic

The prefix a group of decisions share, e.g. `core_ca_chunk`. Not a file of its own — `Glob .wiki/<topic>_*.md` lists every decision made on it. The files have no order; `replaces` says which one is live. A style or code convention is a topic too, named `style_<name>`.

### Replaces

A field in a decision's frontmatter: the filename(s) of the decision(s) it replaces. Written once, on the new file — the old file is never touched.

### Live decision

A decision no other decision names in its `replaces` field. It is the current word on its topic and belongs in `index.md`.

### Superseded decision

A decision some other decision names in `replaces`. It is renamed with a leading dot (`.<topic>_<slug>.md`) and drops out of `index.md`. It stays on disk as history — it is never deleted — but the dot keeps it out of `ls`, out of `Glob`, and out of ripgrep, which skips hidden files by default. So a search of `.wiki/` returns live decisions only. Links to it keep the dot in the target: `[Text](.old_decision)`.

### Source

A project file a decision was built from. Tracked in its `sources:` frontmatter. The wiki reads sources but never modifies them.

### Frontmatter

Real YAML frontmatter at the top of a decision, between two `---` lines. Holds `tags`, `sources`, `replaces` (omitted when the decision replaces nothing). It is metadata — put classification here, not in the file name. Special pages (`index`, `roadmap`) keep an `updated: YYYY-MM-DD` field instead of `replaces`, since they are mutable.

### Tag

A label in frontmatter. Groups decisions by theme. Lives in frontmatter, never in the file name — the name is a stable identifier; a tag is metadata. Adding a tag must never force a rename.

## Navigation

### Index

The catalogue page (`index.md`). A table listing every live decision with a link and a one-line summary. Updated on every ingest — a row is added for a new decision and removed for the one it superseded. It is the entry point for a query.

### Roadmap

The future task list (`roadmap.md`). One line per task, ten words or fewer, no code names. Group tasks under an H3 per area (engine, render, one per game). A group can start with one plain sentence of status. The reason and the plan live in the linked decision, never in the line. Both potential and agreed tasks live here.

### Cross-Reference

A link from one decision to another. Written in the `## Cross-references` section and inside the body. The wiki's value lives here: the connections are already written, not recomputed at query time.

## Operations

### Ingest

Reading a source and turning it into a decision. Writes a new decision file (or edits a same-session typo), updates cross-references and the index. Procedure: `ingest.md`.

### Query

Answering a question from the wiki. Grep, read the decisions found, answer with citations. Procedure: `query.md`.

### Style

A style or code convention recorded as a decision under topic `style_<name>`. Records the pattern and how to extend it. Procedure: `style.md`.

### Lint

The health-check. Flags contradictions, orphan decisions, missing concept decisions, a `replaces` target that does not exist, and an `index.md` out of step with which decisions are live. Procedure: `lint.md`.

### Orphan

A decision no other decision links to. Lint flags it: without inbound links it cannot be found.

### Contradiction

Two decisions that say things that conflict. Lint flags it; in narrative projects it is a hard error.

## Language of this glossary

This glossary is written in easy English, following the rule above.
