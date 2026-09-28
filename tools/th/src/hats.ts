// Hats, and nothing else. A hat is a file: a way of thinking, stable and reusable.
//
// There used to be members here too — a file per delegate, holding a role, a hat
// and a tool list. They are gone: those three things are arguments now, so nobody
// creates a file to run one task, and the unit that accumulates experience is the
// hat, of which there are few and they do not change.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// ─── Paths ────────────────────────────────────────────────────────────────────

function resolveHatsDir(): string {
  const fromEnv = process.env.TH_HATS_DIR;
  if (fromEnv) {
    if (!existsSync(fromEnv)) throw new Error(`TH_HATS_DIR not found: "${fromEnv}"`);
    return fromEnv;
  }
  const fromMeta = new URL("../hats", import.meta.url).pathname;
  if (existsSync(fromMeta)) return fromMeta;
  // fallback: look relative to the executable (useful for compiled binaries)
  const fromBin = join(process.argv[1] ?? "", "../hats");
  if (existsSync(fromBin)) return fromBin;
  throw new Error(`Hats directory not found. Set TH_HATS_DIR or run from tools/th/.`);
}

// ─── Validation ───────────────────────────────────────────────────────────────

const SAFE_NAME_RE = /^[a-zA-Z0-9_-]+$/;

export function validateName(name: string): void {
  if (!SAFE_NAME_RE.test(name)) {
    throw new Error(`Invalid name: "${name}". Use only letters, digits, "-" and "_".`);
  }
  // redundant but explicit: blocks path traversal
  if (name.includes("/") || name.includes("\\")) {
    throw new Error(`Invalid name: "${name}". Path separators are not allowed.`);
  }
}

// ─── Hats ─────────────────────────────────────────────────────────────────────

export function listHats(): string[] {
  const hatsDir = resolveHatsDir();
  return readdirSync(hatsDir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(".md", ""))
    .sort();
}

export function getHat(hat: string): string {
  validateName(hat);
  const hatsDir = resolveHatsDir();
  const hatPath = join(hatsDir, `${hat}.md`);
  if (!existsSync(hatPath)) {
    throw new Error(`Hat "${hat}" not found. Available: ${listHats().join(", ")}`);
  }
  return readFileSync(hatPath, "utf-8");
}

// ─── The system prompt of a run ───────────────────────────────────────────────

/**
 * What the agent is told before the task: the caller's own instructions first,
 * then the hat. Same order and same separator a member file produced, so a run
 * behaves exactly as it did when this came from a file.
 */
export function composeSystemPrompt(system: string | undefined, hatContent: string): string {
  const role = (system ?? "").trim();
  const hat = hatContent.trim();
  if (role.length === 0) return hat;
  if (hat.length === 0) return role;
  return `${role}\n\n---\n\n${hat}`;
}

/** Tools from the command line: `read,bash` or `[read, bash]`, empty means all. */
export function parseTools(raw: string | undefined): string[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  const inner = trimmed.startsWith("[") && trimmed.endsWith("]") ? trimmed.slice(1, -1) : trimmed;
  return inner.split(",").map((t) => t.trim()).filter(Boolean);
}
