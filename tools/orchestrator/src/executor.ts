import { join } from "node:path";
import { getBaseDir, listTasks } from "./catalog.js";
import { transition, listByState } from "./queue.js";
import { buildDispatchPlan } from "./dispatch.js";
import type { RunInstance, RaspberryTask, DispatchPlanEntry, ExecutorDeps } from "./types.js";
import { spawnSandboxed } from "../../th/src/runner.js";

// ─── Local Execution ────────────────────────────────────────────────────────────

/**
 * Executes a task on the local Raspberry Pi.
 */
export async function executeLocal(
  instance: RunInstance,
  task: RaspberryTask,
  deps: ExecutorDeps,
  base = getBaseDir(),
): Promise<void> {
  try {
    transition(instance.id, "pending", "processing", base);
  } catch {
    return; // Another actor claimed the instance
  }

  const absPath = join(base, "scripts", `${task.name}.ts`);

  let exitCode: number;
  if (deps.runLocal) {
    const res = await deps.runLocal(["bun", "run", absPath]);
    exitCode = res.exitCode;
  } else {
    exitCode = await new Promise((resolve, reject) => {
      const child = spawnSandboxed("bun", ["run", absPath], { stdio: "inherit" });
      child.on("exit", (code) => resolve(code ?? 1));
      child.on("error", reject);
    });
  }

  transition(instance.id, "processing", exitCode === 0 ? "completed" : "failed", base);
}

// ─── Remote Execution ──────────────────────────────────────────────────────────

/**
 * Executes a plan entry on the remote Desktop.
 */
export async function executeRemote(
  planEntry: DispatchPlanEntry,
  deps: ExecutorDeps,
  base = getBaseDir(),
): Promise<void> {
  try {
    transition(planEntry.instanceId, "pending", "processing", base);
  } catch {
    return; // Another actor claimed the instance
  }

  try {
    const scpRes = await deps.runCommand(planEntry.scpArgv);
    if (scpRes.exitCode !== 0) {
      transition(planEntry.instanceId, "processing", "failed", base);
      return;
    }

    const sshRes = await deps.runCommand(planEntry.sshArgv);
    transition(planEntry.instanceId, "processing", sshRes.exitCode === 0 ? "completed" : "failed", base);
  } catch (e) {
    transition(planEntry.instanceId, "processing", "failed", base);
  }
}

// ─── Batch Dispatch ───────────────────────────────────────────────────────────

/**
 * Triggered by /i_wake callback: builds a dispatch plan for all due desktop tasks and executes them.
 */
export async function dispatchWake(
  deps: ExecutorDeps,
  base = getBaseDir(),
): Promise<void> {
  const instances = listByState("pending", base);
  const tasks = listTasks(base);
  const host = process.env.DESKTOP_HOST || "desktop.local";

  const desktopInstances = instances.filter((inst) => {
    const task = tasks.find((t) => t.name === inst.taskName);
    return task && task.requiresDesktop && task.verdict === "PASS";
  });

  const plan = buildDispatchPlan(desktopInstances, tasks, host, base);
  await Promise.all(plan.map((entry) => executeRemote(entry, deps, base)));
}
