import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { homedir } from "node:os";
import type { WikiEntry } from "./types.js";

// ─── Costanti ─────────────────────────────────────────────────────────────────

const REGISTRY_PATH = process.env.TW_REGISTRY_PATH ?? resolve(homedir(), ".pi", "tw_registry.json");

// ─── I/O ─────────────────────────────────────────────────────────────────────

function load(): WikiEntry[] {
  if (!existsSync(REGISTRY_PATH)) return [];
  try {
    return JSON.parse(readFileSync(REGISTRY_PATH, "utf8")) as WikiEntry[];
  } catch {
    return [];
  }
}

function save(entries: WikiEntry[]): void {
  mkdirSync(dirname(REGISTRY_PATH), { recursive: true });
  writeFileSync(REGISTRY_PATH, JSON.stringify(entries, null, 2) + "\n");
}

// ─── API ─────────────────────────────────────────────────────────────────────

export function listWikis(): WikiEntry[] {
  return load();
}

export function registerWiki(name: string, path: string): WikiEntry {
  const entries = load();
  const idx = entries.findIndex((e) => e.path === path);
  const entry: WikiEntry = { name, path };
  if (idx >= 0) {
    entries[idx] = entry;
  } else {
    entries.push(entry);
  }
  save(entries);
  return entry;
}

export function findWikiByName(name: string): WikiEntry | null {
  return load().find((e) => e.name === name) ?? null;
}
