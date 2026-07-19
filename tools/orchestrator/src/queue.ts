import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { QueueState, RunInstance } from "./types.js";
import { QUEUE_STATES } from "./types.js";

// ─── Paths ────────────────────────────────────────────────────────────────────

function resolveBaseDir(): string {
  return process.env.ORCH_DIR ?? join(homedir(), ".pi", "orchestrator");
}

const QUEUE_DIR = "queue";

function queueDir(base: string, state: QueueState): string {
  return join(base, QUEUE_DIR, state);
}

function instancePath(base: string, state: QueueState, id: string): string {
  return join(queueDir(base, state), `${id}.json`);
}

// ─── Ensure Structure ─────────────────────────────────────────────────────────

export function ensureQueueDirs(base: string): void {
  for (const state of QUEUE_STATES) {
    mkdirSync(queueDir(base, state), { recursive: true });
  }
}

// ─── Create Instance ──────────────────────────────────────────────────────────

export function createPending(instance: RunInstance, base = resolveBaseDir()): void {
  ensureQueueDirs(base);
  writeFileSync(instancePath(base, "pending", instance.id), JSON.stringify(instance, null, 2) + "\n", "utf-8");
}

// ─── Transitions ──────────────────────────────────────────────────────────────

export function transition(id: string, from: QueueState, to: QueueState, base = resolveBaseDir()): void {
  const src = instancePath(base, from, id);
  if (!existsSync(src)) {
    throw new Error(`Istanza "${id}" non trovata in stato "${from}".`);
  }
  renameSync(src, instancePath(base, to, id));
}

// ─── Locate ───────────────────────────────────────────────────────────────────

export interface LocatedInstance {
  instance: RunInstance;
  state: QueueState;
}

export function locate(id: string, base = resolveBaseDir()): LocatedInstance | null {
  for (const state of QUEUE_STATES) {
    const p = instancePath(base, state, id);
    if (existsSync(p)) {
      try {
        const instance = JSON.parse(readFileSync(p, "utf-8")) as RunInstance;
        return { instance, state };
      } catch (e) {
        console.error(`[orchestrator] Skipping corrupt file ${p}: ${(e as Error).message}`);
        continue;
      }
    }
  }
  return null;
}

// ─── List by State ────────────────────────────────────────────────────────────

export function listByState(state: QueueState, base = resolveBaseDir()): RunInstance[] {
  const dir = queueDir(base, state);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .flatMap((f) => {
      const p = join(dir, f);
      try {
        return [JSON.parse(readFileSync(p, "utf-8")) as RunInstance];
      } catch (e) {
        console.error(`[orchestrator] Skipping corrupt file ${p}: ${(e as Error).message}`);
        return [];
      }
    });
}

// ─── Recovery ─────────────────────────────────────────────────────────────────

/**
 * On startup, move any orphaned instances from processing/ back to pending/.
 * A file in processing/ means a previous run died mid-execution.
 */
export function recover(base = resolveBaseDir()): number {
  const processingDir = queueDir(base, "processing");
  if (!existsSync(processingDir)) return 0;

  const orphans = readdirSync(processingDir).filter((f) => f.endsWith(".json"));
  let recoveredCount = 0;

  for (const f of orphans) {
    const id = f.replace(/\.json$/, "");
    const pendingPath = instancePath(base, "pending", id);
    
    if (existsSync(pendingPath)) {
      console.error(`[orchestrator] Recovery collision: ${id}.json already exists in pending/. Leaving orphan in processing/.`);
      continue;
    }

    renameSync(join(processingDir, f), pendingPath);
    recoveredCount++;
  }
  return recoveredCount;
}