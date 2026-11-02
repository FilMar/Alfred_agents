# Omero — Lint

Health-check the wiki.

The user requests a health-check. You do:

1. Run `scripts/lint_wiki.py`. It reports broken links, leftover dot files, decisions over 40 lines, missing frontmatter, a replaced page that still exists, index rows with no file, pages missing from the index, rows under the wrong `## <topic>`, and sentences over 30 words.
2. If `graphify` is installed, refresh the graph and run `scripts/graph_links.py`. It lists decisions with no link to code, cited symbols the graph does not hold, and the most connected code symbols no decision names. Each row is a candidate, not a verdict: a cited symbol may live in a library, and a decision may be about process, not code. Read the rows and flag the ones that hold: a stale citation, a hub that needs a decision.
3. `Glob .wiki/*.md` and `Read` the pages for what a script cannot see.
4. Flag:
   - Contradictions between pages.
   - Orphan pages (no incoming links).
   - Concepts mentioned without a dedicated decision.
   - A decision that holds more than one decision.
   - A term in `GLOSSARY.md` never used anywhere in `.wiki/`, or a term used more than once across decisions with no glossary entry.
   - Prose that breaks the easy-English rule (`GLOSSARY.md`) in ways the script does not count: subordinate clauses, jargon where a common word would do. This needs a real read.
5. Propose open questions to explore.
