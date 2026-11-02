# Omero — Query

Answer a question from the wiki, with citations.

The user asks a question. You:

1. `Grep` the query across `.wiki/` to find relevant pages.
2. `Read` the pages found.
3. If the question asks where something lives or what it touches, ask the graph: `GRAPHIFY_OUT=.graph graphify query "<question>"`, or `GRAPHIFY_OUT=.graph graphify explain "<symbol>"` for one symbol. It returns files, lines and the decisions that link there.
4. Answer with citations: `[Text](decision_file)`, plus `path:line` for code the graph found.
5. If the answer surfaces a decision worth keeping that the wiki does not yet hold, save it — follow `ingest.md`.

The wiki holds the combined knowledge. Do not read the project source files to answer queries. The graph is not source: use it for the where. If the wiki does not contain the answer, say so explicitly and propose ingesting the missing material.

## Source style

Follow the same English style as ingest — see `GLOSSARY.md`.
