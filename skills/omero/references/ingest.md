# Omero — Ingest

Turn files or directories into wiki decisions.

The user points to files or directories to ingest. You:

1. Read the sources with `Read`.
2. Find the topic: pick the `category_subject` prefix the material belongs to (e.g. `core_ca_chunk`). `Glob .wiki/<topic>_*.md`, then `Read` every match to see which decisions already exist and which are live (see `GLOSSARY.md`).
3. Discuss key points with the user if the material is dense or ambiguous.
4. Decide how to record it:
   - A typo or wording fix to a decision you wrote earlier **in this same session** → `Edit` that file directly.
   - Anything else — a new decision, a change of course, a correction — copy `templates/page.md`, fill it, `Write` it to `.wiki/<topic>_<slug>.md`. Never edit an existing decision's body.
   - If it changes course from a live decision, add that decision's filename to the new file's `replaces:` list. Fold any rejected alternative into `## Why` — it does not get its own file.
5. Update cross-references: `Read` + `Edit` the `## Cross-references` section of decisions that depend on what changed.
6. Update `.wiki/index.md`: add the new decision, remove any row it superseded.
7. Update the log: `Read` `.wiki/log.md` (create it with a `## Log` heading if absent), then `Edit` to prepend a new entry under `## Log`:
   `## [YYYY-MM-DD] ingest | [<topic>_<slug>](<topic>_<slug>)`

## English style

Write decision text in easy English. See `GLOSSARY.md` — the rule lives there once.
