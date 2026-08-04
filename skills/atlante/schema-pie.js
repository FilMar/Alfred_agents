/**
 * Pie / Donut chart generator
 * Creates interactive pie/donut charts with D3.js.
 */

import { parseArgs, baseHtml, output } from './schema-utils.js';
import { THEME, CONFIG } from './config.js';

const args = parseArgs();

const data = JSON.parse(args.data || '[]');
const labels = JSON.parse(args.labels || '[]');
const title = args.title || 'Pie Chart';
const outputFile = args.output || 'schema.html';
const { width, height, showLegend, donutRadius } = CONFIG.pie;
const innerRadius = args.donut ? donutRadius : 0;

const colors = CONFIG.palette;

const content = `<svg id="chart"></svg>
<script>
const w = ${width}, h = ${height};
const radius = Math.min(w, h) / 2 - 40;
const innerR = ${innerRadius};

const svg = d3.select("#chart")
  .attr("viewBox", \`0 0 \${w} \${h}\`)
  .attr("width", "100%")
  .attr("height", "100vh");

// Data
const rawData = ${JSON.stringify(data)};
const rawLabels = ${JSON.stringify(labels)};
const chartData = rawData.map((v, i) => ({ value: v, label: rawLabels[i] || \`\${i + 1}\` }));

// Color scale
const color = d3.scaleOrdinal()
  .domain(chartData.map(d => d.label))
  .range(${JSON.stringify(colors)});

// Pie generator
const pie = d3.pie().value(d => d.value).sort(null);
const arc = d3.arc().innerRadius(innerR).outerRadius(radius);
const arcHover = d3.arc().innerRadius(innerR).outerRadius(radius + 8);

// Main group
const g = svg.append("g")
  .attr("transform", \`translate(\${w / 2},\${h / 2})\`);

// Precompute total for tooltip percentage
const total = chartData.reduce((sum, d) => sum + d.value, 0);

// Slices
const slice = g.append("g").selectAll("path")
  .data(pie(chartData))
  .join("path")
  .attr("d", arc)
  .attr("fill", d => color(d.data.label))
  .attr("stroke", "${THEME.MANTLE}")
  .attr("stroke-width", 2)
  .style("cursor", "pointer")
  .on("mouseover", function(event, d) {
    d3.select(this)
      .transition().duration(150)
      .attr("d", arcHover);
    tooltip.style("opacity", 1)
      .html('<strong>' + d.data.label + '</strong><br>' + d.data.value + ' (' + d3.format(".1%")(d.data.value / total) + ')');
  })
  .on("mousemove", function(event) {
    tooltip
      .style("left", (event.offsetX + 10) + "px")
      .style("top", (event.offsetY - 10) + "px");
  })
  .on("mouseout", function() {
    d3.select(this).transition().duration(150).attr("d", arc);
    tooltip.style("opacity", 0);
  });

// Labels for large slices
slice.filter(d => d.endAngle - d.startAngle > 0.3)
  .append("text")
  .attr("transform", d => \`translate(\${arc.centroid(d)})\`)
  .attr("text-anchor", "middle")
  .attr("fill", "${THEME.TEXT}")
  .attr("font-size", "12px")
  .attr("pointer-events", "none")
  .text(d => d.data.label);

// Tooltip
const tooltip = d3.select("body").append("div")
  .style("position", "absolute")
  .style("background", "${THEME.SURFACE0}")
  .style("color", "${THEME.TEXT}")
  .style("padding", "8px 12px")
  .style("border-radius", "6px")
  .style("font-size", "13px")
  .style("pointer-events", "none")
  .style("opacity", 0)
  .style("z-index", 1000);

// Legend
${showLegend ? `
const legend = svg.append("g")
  .attr("transform", \`translate(\${w - 120}, 20)\`);

chartData.forEach((d, i) => {
  const row = legend.append("g").attr("transform", \`translate(0, \${i * 24})\`);
  row.append("rect")
    .attr("width", 14).attr("height", 14)
    .attr("rx", 3)
    .attr("fill", color(d.label));
  row.append("text")
    .attr("x", 20).attr("y", 11)
    .attr("fill", "${THEME.TEXT}")
    .attr("font-size", "12px")
    .text(d.label);
});
` : ''}
</script>`;

output(outputFile, baseHtml({ title, content }));
