# Omero — Ingest

Turn files or directories into structured wiki pages.

The user points to files or directories to ingest. You:

1. Read the sources with `Read`.
2. Discover what already exists: `Glob .wiki/*.md`, then `Read` the relevant pages.
3. Discuss key points with the user if the material is dense or ambiguous.
4. Write or update the page:
   - New page → copy `templates/page.md`, fill it, `Write` to `.wiki/<name>.md`.
   - Existing page → `Read` it, then `Edit` the affected `## Section` in place. Do not rewrite the whole file.
5. Update cross-references in related pages (`Read` + `Edit` the `## Cross-references` section).
6. Update the index `.wiki/index.md` (`## Pages` section).
7. Update the log: `Read` `.wiki/log.md` (create it with a `## Log` heading if absent), then `Edit` to prepend a new entry under `## Log`:
   `## [YYYY-MM-DD] ingest | <title>`

## English style

Write page text in easy English. See `GLOSSARY.md` — the rule lives there once.
