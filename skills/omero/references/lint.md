# Omero — Lint

Health-check the wiki.

The user requests a health-check. You do:

1. `Glob .wiki/*.md` — list all pages.
2. `Read` each one.
3. Flag:
   - Contradictions between pages.
   - Orphan pages (no incoming links).
   - Concepts mentioned without a dedicated decision.
   - A `replaces` target that does not exist.
   - A decision listed in `index.md` that is actually superseded, or a live decision missing from `index.md`.
4. Propose open questions to explore.
