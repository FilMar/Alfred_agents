import { Cron } from "croner";
import { getBaseDir, listTasks } from "./catalog.js";
import { createPending, listByState } from "./queue.js";
import type { RunInstance } from "./types.js";
import { QUEUE_STATES } from "./types.js";

// ─── Scheduler ────────────────────────────────────────────────────────────────

const TICK_MS = 10_000;

export interface Scheduler {
  start(): void;
  stop(): void;
}

/**
 * Checks whether an instance already exists in any queue state for the given
 * task at the given scheduled slot. Prevents double-enqueuing the same due slot
 * across scheduler ticks — chosen over lastEnqueuedAt because the filesystem is
 * already the source of truth, and checking it is O(files) which is trivially
 * small at this scale.
 */
function alreadyEnqueued(taskName: string, scheduledFor: string, base: string): boolean {
  return QUEUE_STATES.some((state) =>
    listByState(state, base).some(
      (inst) => inst.taskName === taskName && inst.scheduledFor === scheduledFor,
    ),
  );
}

function makeId(): string {
  return crypto.randomUUID();
}

/**
 * Returns the most recent cron match at or before `now`.
 * Croner's previousRun() returns null for a freshly-constructed Cron,
 * so we use previousRuns(1, now) which works reliably.
 */
function dueSlot(cron: Cron, now: Date): Date | null {
  const runs = cron.previousRuns(1, now);
  return runs.length > 0 ? runs[0] : null;
}

function tick(base: string): void {
  const tasks = listTasks(base);
  const now = new Date();

  for (const task of tasks) {
    if (task.verdict !== "PASS") continue;

    const cron = new Cron(task.schedule);
    const slot = dueSlot(cron, now);
    if (!slot) continue;

    const scheduledFor = slot.toISOString();
    if (alreadyEnqueued(task.name, scheduledFor, base)) continue;

    const instance: RunInstance = {
      id: makeId(),
      taskName: task.name,
      createdAt: now.toISOString(),
      scheduledFor,
    };
    createPending(instance, base);
  }
}

export function createScheduler(base = getBaseDir(), intervalMs = TICK_MS): Scheduler {
  let timer: ReturnType<typeof setInterval> | null = null;

  return {
    start() {
      if (timer) return;
      tick(base);
      timer = setInterval(() => tick(base), intervalMs);
    },
    stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    },
  };
}