---
tags: [graph, third-os, web-ui, frontend, style]
sources: [ROADMAP.md, tools/tb/src/graph/graph.js, conversation]
---

## Decision

The interface has one rule that settles every later question:

> **canvas = physics, DOM = text.**

Nodes, bubbles, floating, drag and throw live on a 2D canvas. The open note and the editable `ref.reason` are a DOM overlay on top of it. A bubble is canvas while it floats. It becomes DOM the moment it opens.

The rest follows:

- **Fake depth, not 3D.** Each node carries a `z`. From it come scale, opacity and a little blur. That is the whole effect: linked notes bright, far notes small and faded. No three.js.
- **No framework, no bundler, no build step.** ES modules served as they are. `d3-force` vendored locally, so the version is pinned and the app works offline. Plain CSS in one file.
- **Budget: about 150 live nodes** under the force simulation. Everything else is drawn faded, with no physics. Without a number, "show all the notes" is not a finish line.
- **Desktop only for the MVP.** Grab-and-throw with a mouse is not the same gesture on a phone. Mobile is read-only or it is out.
- `tools/tb/src/graph/graph.js` is the starting point, not a reference: it already has canvas, `d3-force`, zoom, pan, hover and collide. When `third_os` covers reading, **`tb graph` is retired**.

A framework earns its place the day the note editor becomes a real editor — markdown WYSIWYG, tables, several panes. The signal is exact: **when you catch yourself writing DOM diffing by hand**, stop and take Svelte. Not before.

## Why

Text editing inside a canvas means rebuilding the caret, selection, IME and accessibility by hand. The browser already has all four, in the DOM. Splitting by canvas-for-motion and DOM-for-text keeps each one doing what it is good at.

Real 3D turns text into a texture or a projected element. The content of this app **is** text, so 3D would charge for a runtime and then fight it. Fake depth gives the look the user asked for in a few lines over code that already exists. If the scene ever has to rotate for real, this gets revisited.

HTMX was considered and dropped. HTMX swaps HTML fragments; here the state lives in a simulation loop running at 60fps in a canvas. The two models would pull against each other. But that does not argue for React either: a framework pays for reactive DOM, and the main surface is not DOM at all.

## Cross-references

- [graph_third_os_webapp_wider_than_workbench](graph_third_os_webapp_wider_than_workbench) — the app this draws
- [graph_third_os_imports_tb_as_library](graph_third_os_imports_tb_as_library) — where the drawn data comes from
</content>
