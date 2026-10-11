---
tags: [graph, tb, web-ui, notes]
sources: [conversation, tools/tb/src/graph/server.ts, tools/tb/src/graph/graph.js]
---

## Decision

Build a graphical workbench for `tb`: a direct-manipulation client of `tb`'s existing HTTP API, not a new backend. It replaces and expands `tb graph` (`tools/tb/src/graph/`, `tb graph` command) — today a read-only D3 force-directed viewer with no editing and no write path. The workbench takes over that browser surface and adds the parts the viewer never had: editing, linking, and a way into curation. Scope is narrow on purpose beyond that: fix the trust gap of CLI-only use, not build a search product.

- The AI drafts a note. The user edits it in place, right on the page.
- Candidate related notes (from `tb search`) orbit the open note as bubbles, each carrying the proposed `ref.reason` as editable text.
- The user drags a candidate in to link it, or tears it off to discard it. Both actions cost the same one gesture — no default path toward "accept".
- This runs at note-creation time, per note. It is the interactive counterpart to `aristotele`'s batch curation, not a replacement for it: `aristotele` still finds bridges between older, already-isolated notes on its own schedule. See [graph_curation_via_th_agent](graph_curation_via_th_agent).

Out of scope, decided against: a NotebookLM-style search UI, and ingesting external sources through `th`. Both were the original pitch; neither addresses the actual problem, which is that CLI use means links land in the store with no visible review step.

## Why

`tb`/`ti` are already stateless HTTP clients to Qdrant/Ollama ([core_tb_stateless_single_source](core_tb_stateless_single_source)), with a Hono API alongside the CLI for this exact purpose ([style_dual_entrypoint](style_dual_entrypoint)). The workbench is one more client on that surface — no rearchitecture needed. `tb graph` already exists and already renders the same node-link layout, but it only ever displays: no edit, no drag, no write call. It goes unused because looking at the graph was never the gap — reviewing what gets written to it was.

A stored `tb` decision says: when in doubt, leave a note isolated, because an unreviewed link injects noise into every future retrieval that touches it. That reasoning assumes no one is looking. Here the user reviews every candidate before it is written, so the caution does not transfer — but it does transfer to anything that writes unattended, which is why curation stays a separate decision with its own answer.

Symmetric drag-in / tear-off was deliberate. An interface where "accept" is one gesture and "reject" is buried would reproduce the unreviewed-noise failure in a new shape, just moved from the AI to the UI's own friction.

This is a different project from the cockpit (see [cockpit_pivot_pi_extension_rpc](cockpit_pivot_pi_extension_rpc)): the cockpit is a chat interface to `pi` itself, built as a `pi` extension. This workbench is a plain web client of `tb`/`ti`/`th`'s own APIs, is not a `pi` extension, and does not depend on the cockpit shipping.

## Cross-references

- [core_tb_stateless_single_source](core_tb_stateless_single_source) — the API surface this reuses
- [style_dual_entrypoint](style_dual_entrypoint) — the CLI/HTTP pattern already built for `tb`/`ti`
- [graph_curation_via_th_agent](graph_curation_via_th_agent) — the batch-curation companion decision
- [cockpit_pivot_pi_extension_rpc](cockpit_pivot_pi_extension_rpc) — a different, unrelated web UI project
