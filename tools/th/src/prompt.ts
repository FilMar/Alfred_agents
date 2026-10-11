// What a run is told before its task: a role, a hat, and a skill. Three blocks,
// three arguments, one string.
//
// There used to be members here — a file per delegate holding a role, a hat and a
// tool list. They are gone: those are arguments now, so nobody creates a file to
// run one task, and the unit experience accumulates on is the hat, of which there
// are six and they do not change.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { getAgentDir, loadSkills } from "@earendil-works/pi-coding-agent";
import type { Skill } from "@earendil-works/pi-coding-agent";

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

// ─── Skills ───────────────────────────────────────────────────────────────────

/** Every skill this machine and this project offer, by the loader pi itself uses. */
function availableSkills(): Skill[] {
  return loadSkills({
    cwd: process.cwd(),
    agentDir: getAgentDir(),
    skillPaths: [],
    includeDefaults: true,
  }).skills;
}

export function findSkill(name: string): Skill {
  const skills = availableSkills();
  const found = skills.find((s) => s.name === name);
  if (!found) {
    const names = skills.map((s) => s.name).sort().join(", ");
    throw new Error(`Skill "${name}" not found. Available: ${names}`);
  }
  return found;
}

/**
 * A skill in the system prompt, content and all. Not the catalogue pi offers a
 * model to choose from — that one only says a skill exists and hopes it is read.
 * Forcing means the protocol is already there, and the base directory too, or a
 * skill's own relative references cannot be resolved.
 */
export function skillBlock(skill: Skill): string {
  const body = readFileSync(skill.filePath, "utf-8").trim();
  return [
    `<skill name="${skill.name}" location="${skill.filePath}">`,
    `References inside this skill are relative to ${skill.baseDir} — resolve them against it.`,
    "",
    body,
    "</skill>",
  ].join("\n");
}

// ─── The system prompt of a run ───────────────────────────────────────────────

/**
 * What the agent is told before the task: the caller's role first, then the hat,
 * then the skill it must follow. Role and hat keep the order and the separator a
 * member file produced, so a run without a skill behaves exactly as it did when
 * this came from a file. The skill goes last, closest to the task: it is the
 * procedure, and a procedure outranks a way of thinking.
 */
export function composeSystemPrompt(
  system: string | undefined,
  hatContent: string,
  skill?: string,
): string {
  const blocks = [(system ?? "").trim(), hatContent.trim(), (skill ?? "").trim()];
  return blocks.filter((b) => b.length > 0).join("\n\n---\n\n");
}

/** Tools from the command line: `read,bash` or `[read, bash]`, empty means all. */
export function parseTools(raw: string | undefined): string[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  const inner = trimmed.startsWith("[") && trimmed.endsWith("]") ? trimmed.slice(1, -1) : trimmed;
  return inner.split(",").map((t) => t.trim()).filter(Boolean);
}
