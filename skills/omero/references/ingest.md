# Omero — Ingest

Turn files or directories into wiki decisions.

The user points to files or directories to ingest. You:

1. Read the sources with `Read`.
2. Find the topic: pick the `category_subject` prefix the material belongs to (e.g. `core_ca_chunk`). `Glob .wiki/<topic>_*.md`, then `Read` every match to see which decisions already exist and which are live (see `GLOSSARY.md`).
3. Discuss key points with the user if the material is dense or ambiguous.
4. Decide how to record it:
   - The decision is still the same (a fix, a sharper wording, a new fact) → `Edit` that file in place.
   - A new decision → copy `templates/page.md`, fill it, `Write` it to `.wiki/<topic>_<slug>.md`.
   - A reversal of a live decision → write the new file with `replaces: [old@hash]`, fold the reason for the change and any rejected alternative into `## Why`, then `rm` the old file. Get the hash with `git log -1 --format=%h -- .wiki/<old>.md`.
   - One file per decision. If the material holds three decisions, write three files, each with a short slug (three to six words). Keep each file under 40 lines.
5. Update links: `Grep` for the old filename and repoint every link to the new decision. Edit `## Cross-references` of decisions that depend on what changed.
6. Update `.wiki/index.md`: add the new decision under its `## <topic>` section, remove any row it reversed.

## English style

Write decision text in easy English. See `GLOSSARY.md` — the rule lives there once.
