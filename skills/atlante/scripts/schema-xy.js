#!/usr/bin/env bun
// desc: Draw a scatter or line plot as a standalone interactive D3 HTML file.
// usage: bun schema-xy.js --data <json> [--line true] [--output <file>] [--title <t>] [--xlabel <x>] [--ylabel <y>]
/**
 * XY / Scatter / Line chart generator
 * Creates scatter plots and line charts with D3.js.
 */

import { parseArgs, baseHtml, output } from './schema-utils.js';
import { THEME, CONFIG } from './config.js';

const args = parseArgs();

const data = JSON.parse(args.data || '[]');
const title = args.title || 'XY Chart';
const outputFile = args.output || 'schema.html';
const { width, height, showDots } = CONFIG.xy;
const showLine = args.line === 'true';
const xLabel = args.xlabel || 'X';
const yLabel = args.ylabel || 'Y';
const colors = CONFIG.palette;

const content = `<svg id="chart"></svg>
<script>
const w = ${width}, h = ${height};
const margin = { top: 30, right: 30, bottom: 60, left: 60 };
const innerW = w - margin.left - margin.right;
const innerH = h - margin.top - margin.bottom;

const svg = d3.select("#chart")
  .attr("viewBox", \`0 0 \${w} \${h}\`)
  .attr("width", "100%")
  .attr("height", "100vh");

// Data - support multiple formats: [[x,y], [x,y], ...] or [{x, y}, ...]
const rawData = ${JSON.stringify(data)};
const chartData = rawData.map(d => Array.isArray(d) ? { x: d[0], y: d[1] } : d);

// Scales
const xExtent = d3.extent(chartData, d => d.x);
const yExtent = d3.extent(chartData, d => d.y);
const x = d3.scaleLinear().domain([xExtent[0], xExtent[1]]).nice().range([0, innerW]);
const y = d3.scaleLinear().domain([yExtent[0], yExtent[1]]).nice().range([innerH, 0]);
const color = d3.scaleOrdinal().domain(chartData.map((_, i) => i)).range(${JSON.stringify(colors)});

// Main group
const g = svg.append("g")
  .attr("transform", \`translate(\${margin.left},\${margin.top})\`);

// Grid lines
g.append("g").attr("class", "grid")
  .call(d3.axisLeft(y).tickSize(-innerW).tickFormat(""))
  .attr("color", "${THEME.SURFACE0}")
  .selectAll("line").attr("stroke-dasharray", "2,2");
g.append("g").attr("class", "grid")
  .attr("transform", \`translate(0,\${innerH})\`)
  .call(d3.axisBottom(x).tickSize(-innerH).tickFormat(""))
  .attr("color", "${THEME.SURFACE0}")
  .selectAll("line").attr("stroke-dasharray", "2,2");

// Line
${showLine ? `
const line = d3.line().x(d => x(d.x)).y(d => y(d.y)).curve(d3.curveMonotoneX);
g.append("path")
  .datum(chartData)
  .attr("fill", "none")
  .attr("stroke", "${THEME.BLUE}")
  .attr("stroke-width", 2)
  .attr("d", line);
` : ''}

// Dots
${showDots ? `
const dots = g.selectAll("circle")
  .data(chartData)
  .join("circle")
  .attr("cx", d => x(d.x))
  .attr("cy", d => y(d.y))
  .attr("r", 5)
  .attr("fill", d => color(chartData.indexOf(d)))
  .attr("stroke", "${THEME.MANTLE}")
  .attr("stroke-width", 1.5)
  .style("cursor", "pointer")
  .on("mouseover", function(event, d) {
    d3.select(this).transition().duration(100).attr("r", 8);
    tooltip.style("opacity", 1)
      .html(\`(\${d.x}, \${d.y})\`);
  })
  .on("mousemove", function(event) {
    tooltip
      .style("left", (event.offsetX + 10) + "px")
      .style("top", (event.offsetY - 10) + "px");
  })
  .on("mouseout", function() {
    d3.select(this).transition().duration(100).attr("r", 5);
    tooltip.style("opacity", 0);
  });
` : ''}

// Axes
g.append("g").attr("transform", \`translate(0,\${innerH})\`).call(d3.axisBottom(x)).attr("color", "${THEME.TEXT}").selectAll("text").attr("fill", "${THEME.TEXT}");
g.append("g").call(d3.axisLeft(y)).attr("color", "${THEME.TEXT}").selectAll("text").attr("fill", "${THEME.TEXT}");

// Axis labels
g.append("text").attr("x", innerW / 2).attr("y", innerH + 45)
  .attr("text-anchor", "middle").attr("fill", "${THEME.OVERLAY0}").attr("font-size", "13px").text("${xLabel}");
g.append("text").attr("transform", "rotate(-90)").attr("x", -innerH / 2).attr("y", -45)
  .attr("text-anchor", "middle").attr("fill", "${THEME.OVERLAY0}").attr("font-size", "13px").text("${yLabel}");

// Tooltip
const tooltip = d3.select("body").append("div")
  .style("position", "absolute")
  .style("background", "${THEME.SURFACE0}")
  .style("color", "${THEME.TEXT}")
  .style("padding", "6px 10px")
  .style("border-radius", "4px")
  .style("font-size", "12px")
  .style("pointer-events", "none")
  .style("opacity", 0)
  .style("z-index", 1000);
</script>`;

output(outputFile, baseHtml({ title, content }));
