# Omero — Lint

Health-check the wiki.

The user requests a health-check. You do:

1. Run `scripts/lint_wiki.py`. It reports broken links, leftover dot files, decisions over 40 lines, missing frontmatter, a replaced page that still exists, index rows with no file, pages missing from the index, rows under the wrong `## <topic>`, and sentences over 30 words.
2. `Glob .wiki/*.md` and `Read` the pages for what a script cannot see.
3. Flag:
   - Contradictions between pages.
   - Orphan pages (no incoming links).
   - Concepts mentioned without a dedicated decision.
   - A decision that holds more than one decision.
   - A term in `GLOSSARY.md` never used anywhere in `.wiki/`, or a term used more than once across decisions with no glossary entry.
   - Prose that breaks the easy-English rule (`GLOSSARY.md`) in ways the script does not count: subordinate clauses, jargon where a common word would do. This needs a real read.
4. Propose open questions to explore.
