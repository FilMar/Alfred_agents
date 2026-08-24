# Omero — Lint

Health-check the wiki.

The user requests a health-check. You do:

1. `Glob .wiki/*.md` — list all pages.
2. `Read` each one.
3. Flag:
   - Contradictions between pages.
   - Orphan pages (no incoming links).
   - Concepts mentioned without a dedicated page.
   - Statements replaced by more recent sources.
4. Propose open questions to explore.
