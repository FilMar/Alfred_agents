---
tags: [graph, tb, web-ui, third-os, notes]
sources: [ROADMAP.md@cf2cccf, conversation]
replaces: [graph_note_workbench_direct_manipulation@cc7d21c]
---

## Decision

The note workbench becomes `third_os`: a webapp in `tools/third_os/` that is how the user reads the Third Brain, not only how they review links. The graph of `tb` is the whole page, not a panel in it.

Three phases, each shippable on its own:

1. **Read only.** Navigate the graph. Open a note at the centre of the screen, with its linked and vector-near notes around it.
2. **Write.** Edit any open note. Create new ones.
3. **AI.** Debates where the agent answers by searching `tb`. Notes drafted by the agent from a web or YouTube link. Link proposals as floating bubbles.

`ti` is out of scope for now. Its rules are `if` to `do` pairs with no `refs`, so in the graph they would be isolated nodes. They would add noise to the layout and break the one effect the design rests on: linked notes bright, far notes small and faded. `ti` comes back after `tb`, as a separate view.

Back in, on purpose: a search and browse UI (phases 1 and 2), and ingesting external sources through `th` (phase 3). Unchanged: the bubbles and the symmetry of the gesture. Candidate links orbit the open note. Drag one in to link it, tear it off to discard it. Both cost the same single gesture. `ref.reason` is always editable.

## Why

The old decision was built around one narrow problem: CLI use writes links into the store with no visible review step. The bubbles still solve it. But it was never the only need: the user also wants to read the brain as a graph. The scope did not drift. It grew, deliberately, and a new decision says so better than an old page that no longer describes the plan.

The bubble design survives untouched, because its reasoning never depended on scope. An interface where "accept" is one gesture and "reject" is buried reproduces the unreviewed-noise failure, moved from the AI to the friction of the UI.

Dropping `ti` is a layout decision, not a judgement on `ti`. Nodes with no edges have nothing to place them, so a force layout scatters them and they dilute the only visual signal the user asked for.

## Cross-references

- [graph_third_os_imports_tb_as_library](graph_third_os_imports_tb_as_library) — how it gets its data
- [graph_third_os_canvas_physics_dom_text](graph_third_os_canvas_physics_dom_text) — how it draws
- [graph_third_os_agent_turns_stay_async](graph_third_os_agent_turns_stay_async) — how phase 3 runs
- [graph_curation_via_th_agent](graph_curation_via_th_agent) — the whole-graph companion to this per-note review
- `graph_note_workbench_direct_manipulation@cc7d21c` — the narrower decision this replaces
</content>
