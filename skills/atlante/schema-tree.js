/**
 * Tree / Hierarchical chart generator
 * Creates centered tree diagrams with D3.js.
 */

import { parseArgs, baseHtml, output } from './schema-utils.js';
import { THEME, CONFIG } from './config.js';

const args = parseArgs();

const data = JSON.parse(args.data || '{}');
const title = args.title || 'Tree';
const outputFile = args.output || 'schema.html';
const { width, height, nodeRadius } = CONFIG.tree;

const content = `<svg id="chart"></svg>
<script>
const w = ${width}, h = ${height};
const nodeR = ${nodeRadius};

const svg = d3.select("#chart")
  .attr("viewBox", \`0 0 \${w} \${h}\`)
  .attr("width", "100%")
  .attr("height", "100vh");

// Zoom group
const g = svg.append("g");

// Zoom behavior
const zoom = d3.zoom()
  .scaleExtent([0.2, 3])
  .on("zoom", e => g.attr("transform", e.transform));
svg.call(zoom);

// Data
const rawData = ${JSON.stringify(data)};
const root = d3.hierarchy(rawData);

// Tree layout (vertical top-down)
const treeLayout = d3.tree().nodeSize([120, 80]);
treeLayout(root);

// Center the tree
const extentX = d3.extent(root.descendants(), d => d.x);
const extentY = d3.extent(root.descendants(), d => d.y);
const treeWidth = extentX[1] - extentX[0];
const treeHeight = extentY[1] - extentY[0];
const offsetX = (w - treeWidth) / 2 - extentX[0];
const offsetY = 60;

const mainG = g.append("g")
  .attr("transform", \`translate(\${offsetX},\${offsetY})\`);

// Links
mainG.append("g")
  .selectAll("path")
  .data(root.links())
  .join("path")
  .attr("d", d3.linkVertical().x(d => d.x).y(d => d.y))
  .attr("fill", "none")
  .attr("stroke", "${THEME.SURFACE1}")
  .attr("stroke-width", 2);

// Nodes
const nodes = mainG.append("g")
  .selectAll("g")
  .data(root.descendants())
  .join("g")
  .attr("transform", d => \`translate(\${d.x},\${d.y})\`);

// Node circles
nodes.append("circle")
  .attr("r", nodeR)
  .attr("fill", d => d.children ? "${THEME.SURFACE0}" : "${THEME.BLUE}")
  .attr("stroke", d => d.children ? "${THEME.SURFACE1}" : "${THEME.BLUE}")
  .attr("stroke-width", 2)
  .style("cursor", "pointer")
  .on("mouseover", function() {
    d3.select(this).attr("fill", "${THEME.LAVENDER}");
  })
  .on("mouseout", function(event, d) {
    d3.select(this).attr("fill", d.children ? "${THEME.SURFACE0}" : "${THEME.BLUE}");
  });

// Node labels
nodes.append("text")
  .attr("y", nodeR + 16)
  .attr("text-anchor", "middle")
  .attr("fill", "${THEME.TEXT}")
  .attr("font-size", "12px")
  .text(d => d.data.label || d.data.name || d.data.id || '');
</script>`;

output(outputFile, baseHtml({ title, content }));
