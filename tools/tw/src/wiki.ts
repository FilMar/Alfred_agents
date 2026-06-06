import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import type { Page, SearchResult } from "./types.js";

// ─── Costanti ─────────────────────────────────────────────────────────────────

const WIKI_DIRNAME = ".wiki";
const TASKS_SECTION = "Tasks";

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

// ─── Init ─────────────────────────────────────────────────────────────────────

export function initWiki(projectDir: string, name: string): string {
  const wikiDir = resolve(projectDir, WIKI_DIRNAME);
  mkdirSync(wikiDir, { recursive: true });
  const indexPath = resolve(wikiDir, "index.md");
  if (!existsSync(indexPath)) {
    writeFileSync(indexPath, `# Wiki — ${name}\n\n## Pagine\n\n## Tasks\n`);
  }
  return wikiDir;
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

function parseTasks(sectionContent: string): Task[] {
  const tasks: Task[] = [];
  for (const line of sectionContent.split("\n")) {
    const m = line.match(/^- \[([ x])\] (.+)/);
    if (m) tasks.push({ done: m[1] === "x", text: m[2].trim() });
  }
  return tasks;
}

function renderTasks(tasks: Task[]): string {
  return tasks.map((t) => `- [${t.done ? "x" : " "}] ${t.text}`).join("\n");
}

function readTasksSection(wikiDir: string, pageName: string): { tasks: Task[]; page: Page } {
  const page = getPage(wikiDir, pageName);
  const lines = page.content.split("\n");
  const header = `## ${TASKS_SECTION}`;
  const start = lines.findIndex((l) => l.trimEnd() === header);
  if (start === -1) return { tasks: [], page };

  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith("## ")) { end = i; break; }
  }

  return { tasks: parseTasks(lines.slice(start + 1, end).join("\n")), page };
}

export function listTasks(wikiDir: string, pageName: string): Task[] {
  return readTasksSection(wikiDir, pageName).tasks;
}

export function addTask(wikiDir: string, pageName: string, text: string): void {
  const { tasks } = readTasksSection(wikiDir, pageName);
  tasks.push({ text, done: false });
  updateSection(wikiDir, pageName, TASKS_SECTION, renderTasks(tasks));
}

export function doneTask(wikiDir: string, pageName: string, text: string): void {
  const { tasks } = readTasksSection(wikiDir, pageName);
  const idx = tasks.findIndex((t) => t.text.toLowerCase().includes(text.toLowerCase()));
  if (idx === -1) throw new Error(`Task non trovato: "${text}"`);
  tasks[idx] = { ...tasks[idx], done: true };
  updateSection(wikiDir, pageName, TASKS_SECTION, renderTasks(tasks));
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
