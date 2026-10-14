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

A markdown file in `.wiki/` that records exactly one decision on one topic. Name is `<topic>_<slug>` (lowercase, underscore); the slug is three to six words. Structure is `## Decision`, `## Why`, and `## Cross-references` only when needed. Under 40 lines — a longer file holds more than one decision and gets split. It changes in place while it stays the same decision. A reversal is a new decision file and the old one is deleted.

A decision records the why. The what — the current state of a topic — lives in the code, and a decision does not restate it. A design target with no code yet is the one case where the decision is also the state.

### Topic

The prefix a group of decisions share, e.g. `core_ca_chunk`. Not a file of its own — `Glob .wiki/<topic>_*.md` lists every decision made on it. The files have no order. A style or code convention is a topic too, named `style_<name>`.

### Replaces

A field in a decision's frontmatter: the decision(s) it reverses, written as `file@hash`. The hash is the last commit that held the old file, so `git show <hash>:.wiki/<file>` restores it.

### Live decision

A decision file that exists. It is the current word on its topic and belongs in `index.md`.

### Superseded decision

A decision a newer one reversed. It is deleted in the same change that writes the new one. Git keeps it; the new decision's `replaces` points to it.

### Source

A project file a decision was built from. Tracked in its `sources:` frontmatter. The wiki reads sources but never modifies them.

### Frontmatter

Real YAML frontmatter at the top of a decision, between two `---` lines. Holds `tags`, `sources`, `replaces` (omitted when the decision reverses nothing). It is metadata — put classification here, not in the file name. Special pages (`index`, `roadmap`) keep an `updated: YYYY-MM-DD` field instead of `replaces`, since they are mutable.

### Tag

A label in frontmatter. Groups decisions by theme. Lives in frontmatter, never in the file name — the name is a stable identifier; a tag is metadata. Adding a tag must never force a rename.

## Navigation

### Index

The catalogue page (`index.md`). One `## <topic>` section per topic, each a table of its decisions with a link and a one-line summary. Updated on every ingest — a row is added for a new decision and removed for the one it reversed. It is the entry point for a query.

### Roadmap

The future work (`roadmap.md`), split into blocks. One `## <block>` section per block. The title names the result and links the decision that holds the design. Under it, one line per step, ten words or fewer, no code names. The reason and the plan live in the linked decision, never in the line. Both potential and agreed work live here.

### Block

The smallest unit the user must understand to keep the project in mind, and that one run of the implementing skill can finish alone. Its size follows its logical complexity, inversely:

- The more complex the logic, the smaller the block: one logical decision, one or two entities.
- The more mechanical and repetitive the work, the bigger the block: the same shape applied many times, where understanding the first copy is enough for all.
- Work that repeats is cut in two: a small pilot block that fixes the shape, then one big block that copies it.
- If the steps of a block have different shapes, it is too big. Cut it.

The user judges the complexity. Omero proposes the cuts and the user agrees them.

### Cross-Reference

A link from one decision to another. Written in the `## Cross-references` section and inside the body. The wiki's value lives here: the connections are already written, not recomputed at query time.

## Operations

### Ingest

Reading a source and turning it into decisions and roadmap blocks. The source can be files, directories, `.design/` or the conversation. Writes a new decision file or edits an existing one, updates cross-references, the index and the roadmap. Procedure: `ingest.md`.

### Query

Answering a question from the wiki. Grep, read the decisions found, answer with citations. Procedure: `query.md`.

### Style

A style or code convention recorded as a decision under topic `style_<name>`. Records the pattern and how to extend it. Procedure: `style.md`.

### Lint

The health-check. Flags contradictions, orphan decisions, missing concept decisions, a link to a deleted file, and an `index.md` out of step with the files on disk. Procedure: `lint.md`.

### Orphan

A decision no other decision links to. Lint flags it: without inbound links it cannot be found.

### Contradiction

Two decisions that say things that conflict. Lint flags it; in narrative projects it is a hard error.

## Language of this glossary

This glossary is written in easy English, following the rule above.
