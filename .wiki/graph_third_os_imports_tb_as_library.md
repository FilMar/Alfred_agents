---
tags: [graph, tb, third-os, architecture, qdrant]
sources: [ROADMAP.md, tools/tb/src/qdrant.ts, tools/tb/src/notes.ts, conversation]
---

## Decision

`third_os` runs on the Rasp, next to `tb`, `ti` and `th`. It uses them **as libraries, not as HTTP APIs**. It imports their modules. It does not call their ports.

It is a backend, and it keeps the graph in memory:

- At boot it calls `scrollAllWithVectors()` once and holds notes, vectors and PCA coordinates in RAM.
- **Vector-near notes are a dot product in RAM.** No Qdrant call, no Ollama call, no network. For a few thousand notes this is a few milliseconds.
- Linked notes come from `scrollLinkedTo(id)`, which already exists.
- Writes go through `notes.ts`: `createNote`, `addRefs`, `setPayload`, `deleteNote`.
- The only slow call left in the app is **free-text search**, which needs Ollama to embed the query. The user triggers it by hand, so the wait is theirs to expect.

Two consequences, written down so they are chosen and not discovered:

- **Stale cache.** A note changed from the `tb` CLI while the server runs leaves the RAM copy old. Reload on demand or on a TTL. Single user, last write wins, no locks.
- **`third_os` cannot leave this repo.** Importing internal modules binds it to `tb`'s internals, not to a public contract. Moving it out means going back to HTTP. `tools/third_os/` is the only possible home, by architecture and not by taste.

## Why

Both processes sit on the same machine. HTTP between them buys a hop, a serialization and a CORS problem, and pays for none of it. The API exists so that clients outside the box can reach `tb` ([style_dual_entrypoint](style_dual_entrypoint)); `third_os` is not outside the box.

The replaced decision said "a client of `tb`'s existing HTTP API, not a new backend". That was right while the app was imagined as a browser talking to a remote `tb`. Once the service ships to the Rasp itself, the same reasoning points the other way.

Holding the vectors in RAM is not an optimisation added on top. It falls out of work the app already does: the PCA layout needs every vector anyway, so the k-nearest query is free once they are loaded. The alternative — asking Qdrant on every opened note — would have cost a round trip per click for a result already sitting in memory.

## Cross-references

- [core_tb_stateless_single_source](core_tb_stateless_single_source) — the modules this imports
- [style_dual_entrypoint](style_dual_entrypoint) — the CLI/HTTP pattern, and why this skips the HTTP half
- [memory_tb_ti_on_rasp](memory_tb_ti_on_rasp) — why `tb` is already on the same machine
- [graph_third_os_webapp_wider_than_workbench](graph_third_os_webapp_wider_than_workbench) — the app this serves
</content>
