#!/usr/bin/env bun
// desc: Draw a bar chart as a standalone interactive D3 HTML file.
// usage: bun schema-bar.js --data <json> --labels <json> [--output <file>] [--title <t>]
/**
 * Bar chart generator
 * Creates vertical bar charts with D3.js.
 */

import { parseArgs, baseHtml, output } from './schema-utils.js';
import { THEME, CONFIG } from './config.js';

const args = parseArgs();

const data = JSON.parse(args.data || '[]');
const labels = JSON.parse(args.labels || '[]');
const title = args.title || 'Bar Chart';
const outputFile = args.output || 'schema.html';
const { width, height, showValues } = CONFIG.bar;
const colors = CONFIG.palette;

const content = `<svg id="chart"></svg>
<script>
const w = ${width}, h = ${height};
const margin = {top: 30, right: 30, bottom: 60, left: 60};
const innerW = w - margin.left - margin.right;
const innerH = h - margin.top - margin.bottom;

const svg = d3.select("#chart")
  .attr("viewBox", \`0 0 \${w} \${h}\`)
  .attr("width", "100%")
  .attr("height", "100vh");

// Data
const rawData = ${JSON.stringify(data)};
const rawLabels = ${JSON.stringify(labels)};
const chartData = rawData.map((v, i) => ({ value: v, label: rawLabels[i] || (i + 1) }));

// Scales
const x = d3.scaleBand().domain(chartData.map(d => d.label)).range([0, innerW]).padding(0.3);
const y = d3.scaleLinear().domain([0, d3.max(chartData, d => d.value)]).nice().range([innerH, 0]);
const color = d3.scaleOrdinal().domain(chartData.map(d => d.label)).range(${JSON.stringify(colors)});

// Main group
const g = svg.append("g")
  .attr("transform", \`translate(\${margin.left},\${margin.top})\`);

// Bars
g.selectAll(".bar")
  .data(chartData)
  .join("rect")
  .attr("class", "bar")
  .attr("x", d => x(d.label))
  .attr("y", d => y(d.value))
  .attr("width", x.bandwidth())
  .attr("height", d => innerH - y(d.value))
  .attr("fill", d => color(d.label))
  .attr("rx", 4)
  .style("cursor", "pointer")
  .on("mouseover", function() {
    d3.select(this).attr("opacity", 0.8);
  })
  .on("mouseout", function() {
    d3.select(this).attr("opacity", 1);
  });

// Values
${showValues ? `
g.selectAll(".value")
  .data(chartData)
  .join("text")
  .attr("class", "value")
  .attr("x", d => x(d.label) + x.bandwidth() / 2)
  .attr("y", d => y(d.value) - 5)
  .attr("text-anchor", "middle")
  .attr("fill", "${THEME.TEXT}")
  .attr("font-size", "12px")
  .attr("pointer-events", "none")
  .text(d => d.value);
` : ''}

// X Axis
g.append("g")
  .attr("transform", \`translate(0,\${innerH})\`)
  .call(d3.axisBottom(x))
  .attr("color", "${THEME.TEXT}")
  .selectAll("text")
  .attr("fill", "${THEME.TEXT}")
  .attr("transform", "rotate(-45)")
  .style("text-anchor", "end");

// Y Axis
g.append("g")
  .call(d3.axisLeft(y))
  .attr("color", "${THEME.TEXT}")
  .selectAll("text")
  .attr("fill", "${THEME.TEXT}");
</script>`;

output(outputFile, baseHtml({ title, content }));
