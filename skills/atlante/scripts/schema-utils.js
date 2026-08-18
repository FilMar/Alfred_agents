// desc: Shared helpers for all chart generators: arg parsing, base HTML, output (library, not an entry point).
/**
 * D3-Schema Shared Utilities
 * Theme and common helpers for all chart generators.
 */

import { writeFileSync } from 'fs';
import { THEME } from './config.js';

// Base HTML shell
export function baseHtml({ title = 'Schema', width = 800, height = 600, content = '' }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<script src="https://d3js.org/d3.v7.min.js"></script>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { 
  background: ${THEME.CRUST}; 
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}
svg { display: block; }
</style>
</head>
<body>
${content}
</body>
</html>`;
}

// Simple arg parser
export function parseArgs(args = process.argv.slice(2)) {
  const result = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        result[key] = next;
        i++;
      } else {
        result[key] = true;
      }
    }
  }
  return result;
}

// Output to file or stdout
export function output(filename, content) {
  writeFileSync(filename, content);
  console.log(`Generated: ${filename}`);
}

// Parse JSON from arg or stdin
export function parseJson(str) {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}
