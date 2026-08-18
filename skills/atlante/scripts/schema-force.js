#!/usr/bin/env bun
// desc: Draw a node-and-link force graph as a standalone interactive D3 HTML file.
// usage: bun schema-force.js --nodes <json> --links <json> [--output <file>] [--title <t>]
/**
 * Force-directed graph generator
 * Creates interactive HTML graphs with D3.js force simulation.
 */

import { parseArgs, baseHtml, output } from './schema-utils.js';
import { THEME, CONFIG } from './config.js';

const args = parseArgs();

const nodes = JSON.parse(args.nodes || '[]');
const links = JSON.parse(args.links || '[]');
const title = args.title || 'Force Graph';
const outputFile = args.output || 'schema.html';
const { width, height, nodeRadius } = CONFIG.force;

const content = `<svg id="chart"></svg>
<script>
const w = ${width}, h = ${height};
const svg = d3.select("#chart")
  .attr("viewBox", \`0 0 \${w} \${h}\`)
  .attr("width", "100%")
  .attr("height", "100vh");

// Zoom
svg.append("g").attr("class", "zoom");
svg.call(d3.zoom()
  .scaleExtent([0.2, 4])
  .on("zoom", e => svg.select(".zoom").attr("transform", e.transform)));

// Arrow marker
svg.append("defs").append("marker")
  .attr("id", "arrow")
  .attr("viewBox", "0 -5 10 10")
  .attr("refX", ${nodeRadius + 10})
  .attr("refY", 0)
  .attr("markerWidth", 6)
  .attr("markerHeight", 6)
  .attr("orient", "auto")
  .append("path")
  .attr("d", "M0,-5L10,0L0,5")
  .attr("fill", "${THEME.OVERLAY0}");

// Data
const data = {
  nodes: ${JSON.stringify(nodes)},
  links: ${JSON.stringify(links)}
};

// Force simulation
const sim = d3.forceSimulation(data.nodes)
  .force("link", d3.forceLink(data.links).id(d => d.id).distance(150))
  .force("charge", d3.forceManyBody().strength(-400))
  .force("center", d3.forceCenter(w / 2, h / 2))
  .force("collision", d3.forceCollide(${nodeRadius + 10}));

// Links
const link = svg.select(".zoom").append("g").attr("class", "links")
  .selectAll("line")
  .data(data.links)
  .join("line")
  .attr("stroke", "${THEME.SURFACE1}")
  .attr("stroke-width", 2)
  .attr("marker-end", "url(#arrow)");

// Link labels
const linkLabel = svg.select(".zoom").append("g").attr("class", "link-labels")
  .selectAll("text")
  .data(data.links.filter(l => l.label))
  .join("text")
  .attr("fill", "${THEME.OVERLAY0}")
  .attr("font-size", "11px")
  .attr("text-anchor", "middle")
  .text(d => d.label);

// Nodes
const node = svg.select(".zoom").append("g").attr("class", "nodes")
  .selectAll("g")
  .data(data.nodes)
  .join("g")
  .call(d3.drag()
    .on("start", (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
    .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
    .on("end", (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }));

// Node shapes based on type
node.each(function(d) {
  const el = d3.select(this);
  if (d.type === "decision") {
    // Diamond
    el.append("polygon")
      .attr("points", \`0,-\${${nodeRadius}} \${${nodeRadius}},0 0,\${${nodeRadius}} -\${${nodeRadius}},0\`)
      .attr("fill", "${THEME.SURFACE0}")
      .attr("stroke", "${THEME.YELLOW}")
      .attr("stroke-width", 2);
  } else if (d.type === "start" || d.type === "end") {
    // Circle for start/end
    el.append("circle")
      .attr("r", ${nodeRadius * 0.8})
      .attr("fill", "${THEME.SURFACE0}")
      .attr("stroke", "${THEME.GREEN}")
      .attr("stroke-width", 2);
  } else {
    // Default: circle
    el.append("circle")
      .attr("r", ${nodeRadius})
      .attr("fill", "${THEME.SURFACE0}")
      .attr("stroke", "${THEME.BLUE}")
      .attr("stroke-width", 2);
  }
});

// Node labels
node.append("text")
  .attr("text-anchor", "middle")
  .attr("dy", "0.35em")
  .attr("fill", "${THEME.TEXT}")
  .attr("font-size", "12px")
  .attr("pointer-events", "none")
  .text(d => d.label || d.id);

// Hover effects
node.on("mouseover", function() { d3.select(this).select("circle,polygon").attr("stroke", "${THEME.LAVENDER}"); })
     .on("mouseout", function() { 
       const d = d3.select(this).datum();
       const stroke = d.type === "decision" ? "${THEME.YELLOW}" : (d.type === "start" || d.type === "end" ? "${THEME.GREEN}" : "${THEME.BLUE}");
       d3.select(this).select("circle,polygon").attr("stroke", stroke);
     });

// Tick
sim.on("tick", () => {
  link
    .attr("x1", d => d.source.x).attr("y1", d => d.source.y)
    .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
  linkLabel
    .attr("x", d => (d.source.x + d.target.x) / 2)
    .attr("y", d => (d.source.y + d.target.y) / 2);
  node.attr("transform", d => \`translate(\${d.x},\${d.y})\`);
});
</script>`;

output(outputFile, baseHtml({ title, content }));
