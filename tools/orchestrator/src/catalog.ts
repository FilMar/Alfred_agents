import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { Cron } from "croner";
import type { RaspberryTask, Verdict } from "./types.js";
import { extractMetadata } from "./metadata.js";

// ─── Paths ────────────────────────────────────────────────────────────────────

function resolveBaseDir(): string {
  return process.env.ORCH_DIR ?? join(homedir(), ".pi", "orchestrator");
}

export function getBaseDir(): string {
  return resolveBaseDir();
}

const SCRIPTS_DIR = "scripts";
const REGISTERED_DIR = "registered";

// ─── Name Validation ──────────────────────────────────────────────────────────

const SAFE_NAME_RE = /^[a-zA-Z0-9_-]+$/;

export function validateName(name: string): void {
  if (!SAFE_NAME_RE.test(name)) {
    throw new Error(`Nome non valido: "${name}". Usa solo lettere, cifre, "-" e "_".`);
  }
  if (name.includes("/") || name.includes("\\")) {
    throw new Error(`Nome non valido: "${name}". Non sono ammessi path separator.`);
  }
}

// ─── Path Helpers ─────────────────────────────────────────────────────────────

function scriptPath(base: string, name: string): string {
  return join(base, SCRIPTS_DIR, `${name}.ts`);
}

function entryPath(base: string, name: string): string {
  return join(base, REGISTERED_DIR, `${name}.json`);
}

// ─── API ──────────────────────────────────────────────────────────────────────

export function ensureDirs(base: string): void {
  mkdirSync(join(base, SCRIPTS_DIR), { recursive: true });
  mkdirSync(join(base, REGISTERED_DIR), { recursive: true });
}

/**
 * Registers a task: stores the script source and writes a catalog entry.
 * The entry starts as UNAUDITED — audit integration is Phase 3.
 */
export function registerTask(name: string, source: string, base = resolveBaseDir()): RaspberryTask {
  validateName(name);
  ensureDirs(base);

  const meta = extractMetadata(source);

  try {
    new Cron(meta.schedule);
  } catch {
    throw new Error("invalid cron schedule");
  }

  const catalogFile = entryPath(base, name);
  if (existsSync(catalogFile)) {
    throw new Error("task already registered");
  }

  const entry: RaspberryTask = {
    name,
    schedule: meta.schedule,
    requiresDesktop: meta.requiresDesktop,
    ...(meta.timeoutSec !== undefined ? { timeoutSec: meta.timeoutSec } : {}),
    verdict: "UNAUDITED",
  };

  writeFileSync(scriptPath(base, name), source, "utf-8");
  writeFileSync(entryPath(base, name), JSON.stringify(entry, null, 2) + "\n", "utf-8");

  return entry;
}

/**
 * Directly writes a catalog entry with a specific verdict.
 * Used by tests to exercise the scheduler with PASS entries without the audit.
 */
export function writeEntry(entry: RaspberryTask, base = resolveBaseDir()): void {
  validateName(entry.name);
  ensureDirs(base);
  writeFileSync(entryPath(base, entry.name), JSON.stringify(entry, null, 2) + "\n", "utf-8");
}

export function getTask(name: string, base = resolveBaseDir()): RaspberryTask | null {
  validateName(name);
  const p = entryPath(base, name);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf-8")) as RaspberryTask;
}

export function listTasks(base = resolveBaseDir()): RaspberryTask[] {
  const dir = join(base, REGISTERED_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .flatMap((f) => {
      const p = join(dir, f);
      try {
        return [JSON.parse(readFileSync(p, "utf-8")) as RaspberryTask];
      } catch (e) {
        console.error(`[orchestrator] Skipping corrupt file ${p}: ${(e as Error).message}`);
        return [];
      }
    });
}

/**
 * Updates the verdict of an existing catalog entry.
 * Used when the audit (Phase 3) produces a result.
 */
export function updateVerdict(name: string, verdict: Verdict, base = resolveBaseDir()): RaspberryTask {
  const task = getTask(name, base);
  if (!task) throw new Error(`Task "${name}" non trovato nel catalogo.`);
  task.verdict = verdict;
  writeFileSync(entryPath(base, name), JSON.stringify(task, null, 2) + "\n", "utf-8");
  return task;
}

