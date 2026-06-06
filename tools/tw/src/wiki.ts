import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import type { Page, SearchResult } from "./types.js";

// ─── Costanti ─────────────────────────────────────────────────────────────────

const WIKI_DIRNAME = ".wiki";
const STYLE_PREFIX = "style_";

// ─── Discovery ────────────────────────────────────────────────────────────────

export function findWiki(): string | null {
  let dir = process.cwd();
  while (true) {
    const candidate = resolve(dir, WIKI_DIRNAME);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export function requireWiki(): string {
  const wiki = findWiki();
  if (!wiki) throw new Error("Nessuna wiki trovata. Usa: tw init");
  return wiki;
}

// ─── Atomic write ─────────────────────────────────────────────────────────────

function atomicWrite(path: string, content: string): void {
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, content);
  renameSync(tmp, path);
}

// ─── Pages ────────────────────────────────────────────────────────────────────

export function listPages(wikiDir: string): string[] {
  return readdirSync(wikiDir)
    .filter((f) => f.endsWith(".md") && !f.startsWith("."))
    .map((f) => basename(f, ".md"))
    .sort();
}

export function getPage(wikiDir: string, name: string): Page {
  const path = resolve(wikiDir, `${name}.md`);
  if (!existsSync(path)) throw new Error(`Pagina non trovata: "${name}"`);
  return { name, path, content: readFileSync(path, "utf8") };
}

export function updateSection(wikiDir: string, pageName: string, section: string, content: string): void {
  const page = getPage(wikiDir, pageName);
  const lines = page.content.split("\n");
  const header = `## ${section}`;
  const start = lines.findIndex((l) => l.trimEnd() === header);

  if (start === -1) {
    const newContent = page.content.trimEnd() + `\n\n${header}\n\n${content}\n`;
    atomicWrite(page.path, newContent);
    return;
  }

  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith("## ")) { end = i; break; }
  }

  const before = lines.slice(0, start + 1).join("\n");
  const after = lines.slice(end).join("\n");
  const sep = after.trim() ? "\n\n" : "\n";
  atomicWrite(page.path, `${before}\n\n${content}${sep}${after}`);
}

export function createPage(wikiDir: string, name: string, content = ""): void {
  const path = resolve(wikiDir, `${name}.md`);
  if (existsSync(path)) throw new Error(`Pagina già esistente: "${name}"`);
  const trimmed = content.trim();
  const template = trimmed
    ? `# ${name}\n\n## Panoramica\n\n${trimmed}\n`
    : `# ${name}\n\n## Panoramica\n`;
  atomicWrite(path, template);
}

// ─── Init ─────────────────────────────────────────────────────────────────────

export function initWiki(projectDir: string, name: string): string {
  const wikiDir = resolve(projectDir, WIKI_DIRNAME);
  mkdirSync(wikiDir, { recursive: true });
  const indexPath = resolve(wikiDir, "index.md");
  if (!existsSync(indexPath)) {
    writeFileSync(indexPath, `# Wiki — ${name}\n\n## Pagine\n`);
  }
  return wikiDir;
}

// ─── Style ────────────────────────────────────────────────────────────────────

export function addStylePage(wikiDir: string, name: string, desc: string): void {
  const pageName = `${STYLE_PREFIX}${name}`;
  const path = resolve(wikiDir, `${pageName}.md`);
  if (existsSync(path)) throw new Error(`Style già esistente: "${name}"`);
  const content = `# Style: ${name}\n\n## Descrizione\n\n${desc}\n\n## Come è scritto\n\n## Come estendere\n\n## Esempio\n\n## Riferimenti incrociati\n`;
  atomicWrite(path, content);
}

export function listStylePages(wikiDir: string): string[] {
  return listPages(wikiDir)
    .filter((p) => p.startsWith(STYLE_PREFIX))
    .map((p) => p.slice(STYLE_PREFIX.length));
}

export function getStylePage(wikiDir: string, name: string): Page {
  return getPage(wikiDir, `${STYLE_PREFIX}${name}`);
}

export function updateStyleSection(wikiDir: string, name: string, section: string, content: string): void {
  updateSection(wikiDir, `${STYLE_PREFIX}${name}`, section, content);
}

// ─── Search ──────────────────────────────────────────────────────────────────

export function searchWiki(wikiDir: string, query: string, wikiName = "."): SearchResult[] {
  const re = new RegExp(query, "i");
  const results: SearchResult[] = [];
  for (const pageName of listPages(wikiDir)) {
    const page = getPage(wikiDir, pageName);
    page.content.split("\n").forEach((line, i) => {
      if (re.test(line)) results.push({ wiki: wikiName, page: pageName, line: i + 1, text: line });
    });
  }
  return results;
}
