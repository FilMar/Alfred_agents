import { Cron } from "croner";
import { getBaseDir, listTasks } from "./catalog.js";
import { createPending, listByState } from "./queue.js";
import type { RunInstance, ExecutorDeps } from "./types.js";
import { QUEUE_STATES } from "./types.js";
import { executeLocal, dispatchWake } from "./executor.js";
import {
  computeWakeAction,
  readWakeState,
  writeWakeState,
  clearWakeState,
} from "./wake.js";

// ─── Scheduler ────────────────────────────────────────────────────────────────

const TICK_MS = 10_000;
const DEFAULT_BOOT_TIMEOUT_MIN = 5;

/**
 * Evaluates the desktop on every tick. A one-shot ping reads the level
 * ("is the machine reachable now?"): if up, pending desktop work is dispatched
 * directly and no WoL is needed; if down, the WoL/retry/alert state machine
 * runs. The boot-callback (/i_wake) remains the wake-up event — the ping is
 * reconciliation, not a wait loop.
 */
async function evaluateWakeWindow(base: string, deps: ExecutorDeps, alertHook = console.error): Promise<void> {
  const mac = process.env.DESKTOP_MAC;
  if (!mac) {
    return;
  }

  const now = new Date();
  const leadMin = process.env.ORCH_WAKE_LEAD_MIN ? parseInt(process.env.ORCH_WAKE_LEAD_MIN, 10) : 30;
  const bootTimeoutMin = process.env.ORCH_BOOT_TIMEOUT_MIN
    ? parseInt(process.env.ORCH_BOOT_TIMEOUT_MIN, 10)
    : DEFAULT_BOOT_TIMEOUT_MIN;
  const host = process.env.DESKTOP_HOST || "desktop.local";

  const instances = listByState("pending", base);
  const tasks = listTasks(base);

  const desktopPending = instances.filter(inst => {
    const task = tasks.find(t => t.name === inst.taskName);
    return task && task.requiresDesktop && task.verdict === "PASS";
  });

  const upcomingRuns: Date[] = [];
  for (const task of tasks) {
    if (task.verdict === "PASS" && task.requiresDesktop) {
      const next = new Cron(task.schedule).nextRun(now);
      if (next) {
        upcomingRuns.push(next);
      }
    }
  }
  upcomingRuns.sort((a, b) => a.getTime() - b.getTime());

  const earliestUpcoming = upcomingRuns[0];
  const upcomingWithinLead = earliestUpcoming && (earliestUpcoming.getTime() - now.getTime() <= leadMin * 60_000);

  if (desktopPending.length === 0 && !upcomingWithinLead) {
    clearWakeState(base);
    return;
  }

  if (await deps.pingHost(host)) {
    clearWakeState(base);
    if (desktopPending.length > 0) {
      await dispatchWake(deps, base);
    }
    return;
  }

  const state = readWakeState(base);
  const { action } = computeWakeAction(state, now, bootTimeoutMin);

  if (action === "send-wol" || action === "retry-wol") {
    await deps.sendWol(mac);
    writeWakeState({
      sentAt: now.toISOString(),
      attempts: (state?.attempts ?? 0) + 1,
      alerted: false,
    }, base);
  } else if (action === "alert") {
    alertHook(`[orchestrator] Desktop wake timeout: tasks are pending but machine not responding.`);
    writeWakeState({
      ...state!,
      alerted: true,
    }, base);
  }
}

/**
 * Processes any local tasks that are due.
 */
async function processLocalTasks(base: string, deps: ExecutorDeps): Promise<void> {
  const instances = listByState("pending", base);
  const tasks = listTasks(base);

  const localInstances = instances.filter(inst => {
    const task = tasks.find(t => t.name === inst.taskName);
    return task && !task.requiresDesktop && task.verdict === "PASS";
  });

  for (const inst of localInstances) {
    const task = tasks.find(t => t.name === inst.taskName)!;
    await executeLocal(inst, task, deps, base);
  }
}

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

async function tick(base: string, deps: ExecutorDeps): Promise<void> {
  const tasks = listTasks(base);
  const now = new Date();

  // 1. Enqueue due tasks
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

  // 2. Wake window evaluation
  await evaluateWakeWindow(base, deps);

  // 3. Process local tasks
  await processLocalTasks(base, deps);
}

export function createScheduler(base = getBaseDir(), intervalMs = TICK_MS, deps?: ExecutorDeps): Scheduler {
  let timer: ReturnType<typeof setInterval> | null = null;

  const finalDeps = deps ?? {
    sendWol: async () => {},
    pingHost: async () => false,
    runCommand: async () => ({ exitCode: 0 }),
  };

  let inFlight: Promise<void> | null = null;

  // Skips the tick if the previous one is still running (long executions must
  // not overlap), and swallows tick errors so a failed run never becomes an
  // unhandled rejection that kills the process.
  const safeTick = () => {
    if (inFlight) return;
    inFlight = tick(base, finalDeps)
      .catch((e) => console.error(`[orchestrator] Tick failed: ${(e as Error).message}`))
      .finally(() => { inFlight = null; });
  };

  return {
    start() {
      if (timer) return;
      safeTick();
      timer = setInterval(safeTick, intervalMs);
    },
    stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    },
  };
}
