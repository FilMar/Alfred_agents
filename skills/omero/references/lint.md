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
   - A term in `GLOSSARY.md` never used anywhere in `.wiki/`, or a term used more than once across decisions with no glossary entry.
   - Prose that breaks the easy-English rule (`GLOSSARY.md`): long sentences, subordinate clauses, jargon where a common word would do. This one needs a real read, not a grep — judge it the way you would judge your own writing.
4. Propose open questions to explore.
