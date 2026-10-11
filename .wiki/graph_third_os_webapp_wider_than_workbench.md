---
tags: [graph, tb, web-ui, third-os, notes]
sources: [ROADMAP.md, conversation]
replaces: [.graph_note_workbench_direct_manipulation]
---

## Decision

The note workbench becomes `third_os`: a webapp in `tools/third_os/` that is how the user reads the Third Brain, not only how they review links. The graph of `tb` is the whole page, not a panel in it.

Scope grows in three phases, each shippable on its own:

1. **Read only.** Navigate the graph. Open a note at the centre of the screen, with its linked and vector-near notes around it.
2. **Write.** Edit any open note. Create new ones.
3. **AI.** Debates where the agent answers by searching `tb`. Notes drafted by the agent from a web or YouTube link. Link proposals as floating bubbles.

`ti` is **out of scope for now**. Its rules are `if→do` pairs with no `refs`, so in the graph they would be isolated nodes. They would add noise to the layout and break the one effect the whole design rests on: linked notes bright, far notes small and faded. `ti` comes back after `tb` is done, as a separate view.

Two things the old decision ruled out are back in, on purpose:

- **A search and browse UI.** It was "out of scope, decided against". It is now phases 1 and 2.
- **Ingesting external sources through `th`.** Also ruled out. It is now phase 3b.

One thing stays exactly as it was: **the bubbles and the symmetry of the gesture**. Candidate links orbit the open note. Drag one in to link it, tear it off to discard it. Both cost the same single gesture. `ref.reason` is always editable.

## Why

The old decision was built around one narrow problem: CLI use writes links into the store with no visible review step. That problem is real and the bubbles still solve it. But it was never the only one. The user also wants to *read* the brain as a graph, and that need does not go away by calling it out of scope.

So the scope did not drift. It grew, and the growth is deliberate. Saying so in a new decision is better than pretending the old page still describes the plan.

The bubble design survives untouched because its reasoning never depended on scope. An interface where "accept" is one gesture and "reject" is buried reproduces the unreviewed-noise failure in a new shape, moved from the AI to the UI's own friction. That argument holds at any scope.

Dropping `ti` for now is a layout decision, not a judgement on `ti`. Nodes with no edges have nothing to place them, so a force layout scatters them. They would sit in the same view as the notes and dilute the only visual signal the user asked for.

## Cross-references

- [graph_third_os_imports_tb_as_library](graph_third_os_imports_tb_as_library) — how it gets its data
- [graph_third_os_canvas_physics_dom_text](graph_third_os_canvas_physics_dom_text) — how it draws
- [graph_third_os_agent_turns_stay_async](graph_third_os_agent_turns_stay_async) — how phase 3 runs
- [graph_curation_via_th_agent](graph_curation_via_th_agent) — the whole-graph companion to this per-note review
- [graph_note_workbench_direct_manipulation](.graph_note_workbench_direct_manipulation) — the narrower decision this replaces
</content>
