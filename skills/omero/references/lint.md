# Omero — Lint

Health-check the wiki.

The user requests a health-check. You do:

1. `Glob .wiki/*.md` — list all pages.
2. `Read` each one.
3. Flag:
   - Contradictions between pages.
   - Orphan pages (no incoming links).
   - Concepts mentioned without a dedicated decision.
   - A link to a file that does not exist, or a leftover dot-named file.
   - A decision file over 40 lines, or one that holds more than one decision.
   - A row in `index.md` with no file, a decision file missing from `index.md`, or a row under the wrong `## <topic>`.
   - A term in `GLOSSARY.md` never used anywhere in `.wiki/`, or a term used more than once across decisions with no glossary entry.
   - Prose that breaks the easy-English rule (`GLOSSARY.md`): long sentences, subordinate clauses, jargon where a common word would do. This one needs a real read, not a grep — judge it the way you would judge your own writing.
4. Propose open questions to explore.
