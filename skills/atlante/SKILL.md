---
name: atlante
description: Atlante turns data into a standalone interactive HTML chart, drawn with D3.js. Use it for any request to see data as a picture - bar chart, pie or donut, scatter or line plot, hierarchy tree, or a node-and-link graph. Trigger phrases include "make me a chart", "plot this", "graph these numbers", "show me a diagram", "visualize this", "grafico", "diagramma", "mostrami". Also use it when another skill has produced numbers and the next step is to show them.
---

# Atlante

Atlante writes one self-contained HTML file per chart. Open it in a browser
and it works: drag, zoom, hover tooltips. There is no server. It needs
`bun`, and internet the first time a chart opens, since it loads D3 from a
CDN.

Commands below use paths relative to this skill's folder. Resolve them
against the base directory shown when the skill loads. `OUTPUT` is
written relative to the caller's current directory, not to this skill's
folder.

## Steps

1. **Pick the recipe from the shape of the data.** Use the table below. If
   two fit, pick the one that answers the user's actual question.
2. **Shape the data into the JSON the recipe wants.** Numbers stay numbers,
   labels stay strings.
3. **Run the recipe.** Give `--output` a name of its own when an earlier
   chart would be overwritten. Give `--title` whenever you know what the
   chart is about, which is almost always.
4. **Tell the user the file path**, and offer to open it.

## Picking a recipe

| Data shape | Recipe |
|---|---|
| One number per category | bar |
| Parts of a whole | pie, or donut |
| Pairs of numbers, unordered | scatter |
| A series over time or order | line |
| Parent-child hierarchy | tree |
| Things connected to other things | force |

## Recipes

Every generator is a `bun` script that takes `--flag value` arguments.
`--output` defaults to `schema.html`, `--title` defaults to a name for the
chart type. Quote each JSON argument as one shell string.

Bar chart - `--data` and `--labels` are JSON arrays of the same length:

```bash
bun schema-bar.js --data '[100,200,150]' --labels '["Q1","Q2","Q3"]' --output revenue.html --title "Revenue by quarter"
```

Pie and donut - same arguments, `schema-pie.js` draws both. Add
`--donut true` for the donut:

```bash
bun schema-pie.js --data '[40,30,20]' --labels '["A","B","C"]'
bun schema-pie.js --data '[40,30,20]' --labels '["A","B","C"]' --donut true --output split.html --title "Split by area"
```

Scatter and line - `--data` is a JSON array of `[x, y]` pairs.
`schema-xy.js` draws both. Add `--line true` to join the points in order:

```bash
bun schema-xy.js --data '[[0,0],[1,2],[2,4]]'
bun schema-xy.js --data '[[0,10],[1,14],[2,9]]' --line true --output trend.html --title "Monthly trend" --xlabel Month --ylabel Euro
```

Tree - `--data` is one nested JSON object, each node has `label` and
optional `children`:

```bash
bun schema-tree.js --data '{"label":"Root","children":[{"label":"A"},{"label":"B"}]}'
```

Force graph - `--nodes` and `--links` are JSON arrays. A node `type` of
`start`, `end` or `decision` changes its shape. A link `label` shows text
on the arrow:

```bash
bun schema-force.js --nodes '[{"id":"A","label":"Start","type":"start"},{"id":"B"}]' --links '[{"source":"A","target":"B"}]'
```

Open the result:

```bash
xdg-open revenue.html
```

## Look

Everything about how a chart looks lives in `config.js`: the color theme
(Catppuccin Mocha, dark), the series palette, chart size, node radius,
whether pies show a legend and bars show their values.

None of it is an argument, because none of it changes from one chart to
the next. When the user wants a different look, edit `config.js` once. All
charts made after that follow it.
