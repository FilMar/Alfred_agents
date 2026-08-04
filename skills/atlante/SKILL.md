---
name: atlante
description: Atlante turns data into a standalone interactive HTML chart, drawn with D3.js. Use it for any request to see data as a picture - bar chart, pie or donut, scatter or line plot, hierarchy tree, or a node-and-link graph. Trigger phrases include "make me a chart", "plot this", "graph these numbers", "show me a diagram", "visualize this", "grafico", "diagramma", "mostrami". Also use it when another skill has produced numbers and the next step is to show them.
compatibility: needs bun and just. The chart loads D3 from a CDN, so it needs internet to open.
---

# Atlante

Atlante writes one self-contained HTML file per chart. Open it in a browser
and it works: drag, zoom, hover tooltips. There is no server.

## Steps

1. **Pick the recipe from the shape of the data.** Use the table below. If
   two fit, pick the one that answers the user's actual question.
2. **Shape the data into the JSON the recipe wants.** Numbers stay numbers,
   labels stay strings.
3. **Run the recipe.** Pass `OUTPUT` a name of its own when an earlier
   chart would be overwritten. Pass `TITLE` whenever you know what the
   chart is about, which is almost always.
4. **Tell the user the file path**, and offer to open it.

## Picking a recipe

| Data shape | Recipe |
|---|---|
| One number per category | `bar` |
| Parts of a whole | `pie`, or `donut` |
| Pairs of numbers, unordered | `scatter` |
| A series over time or order | `line` |
| Parent-child hierarchy | `tree` |
| Things connected to other things | `force` |

## Recipes

Arguments are positional and in this order. `OUTPUT` and `TITLE` have
defaults, but they come before the axis labels, so pass them to reach
`XLABEL` and `YLABEL`.

Bar - values and labels, same length:

```bash
just -f ~/.pi/agent/skills/atlante/justfile bar '[100,200,150]' '["Q1","Q2","Q3"]' revenue.html "Revenue by quarter"
```

Pie and donut - same arguments, different look:

```bash
just -f ~/.pi/agent/skills/atlante/justfile pie '[40,30,20]' '["A","B","C"]'
just -f ~/.pi/agent/skills/atlante/justfile donut '[40,30,20]' '["A","B","C"]' split.html "Split by area"
```

Scatter and line - an array of `[x, y]` pairs. `line` joins them in order:

```bash
just -f ~/.pi/agent/skills/atlante/justfile scatter '[[0,0],[1,2],[2,4]]'
just -f ~/.pi/agent/skills/atlante/justfile line '[[0,10],[1,14],[2,9]]' trend.html "Monthly trend" "Month" "Euro"
```

Tree - one nested object, each node has `label` and optional `children`:

```bash
just -f ~/.pi/agent/skills/atlante/justfile tree '{"label":"Root","children":[{"label":"A"},{"label":"B"}]}'
```

Force graph - nodes and links. A node `type` of `start`, `end` or
`decision` changes its shape. A link `label` shows text on the arrow:

```bash
just -f ~/.pi/agent/skills/atlante/justfile force '[{"id":"A","label":"Start","type":"start"},{"id":"B"}]' '[{"source":"A","target":"B"}]'
```

Open the result:

```bash
just -f ~/.pi/agent/skills/atlante/justfile open revenue.html
```

## Look

Everything about how a chart looks lives in `config.js`: the color theme
(Catppuccin Mocha, dark), the series palette, chart size, node radius,
whether pies show a legend and bars show their values.

None of it is an argument, because none of it changes from one chart to
the next. When the user wants a different look, edit `config.js` once. All
charts made after that follow it.
