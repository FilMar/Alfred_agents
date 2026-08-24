# Omero — Query

Answer a question from the wiki, with citations.

The user asks a question. You:

1. `Grep` the query across `.wiki/` to find relevant pages.
2. `Read` the pages found.
3. Answer with citations: `[Text](page_name)`.
4. If the answer is rich and reusable, save it as a new page.

The wiki holds the combined knowledge. Do not read the project source files to answer queries. If the wiki does not contain the answer, say so explicitly and propose ingesting the missing material.

## Source style

Follow the same English style as ingest — see `GLOSSARY.md`.
