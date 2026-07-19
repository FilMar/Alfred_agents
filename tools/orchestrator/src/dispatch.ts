import { join } from "node:path";
import type { DispatchPlanEntry, RaspberryTask, RunInstance } from "./types.js";

/**
 * Builds a dispatch plan for instances that require a desktop environment.
 * Only tasks present in the catalog and requiring desktop are included.
 */
export function buildDispatchPlan(
  instances: RunInstance[],
  tasks: RaspberryTask[],
  host: string,
  base: string,
): DispatchPlanEntry[] {
  return instances
    .filter((inst) => {
      const task = tasks.find((t) => t.name === inst.taskName);
      return task && task.requiresDesktop;
    })
    .map((inst) => {
      const task = tasks.find((t) => t.name === inst.taskName)!;
      const remotePath = `~/tmp/${inst.id}.ts`;

      return {
        instanceId: inst.id,
        scpArgv: ["scp", join("scripts", `${task.name}.ts`), `${host}:${remotePath}`],
        sshArgv: ["ssh", host, "th sandbox-exec -- bun run", remotePath],
      };
    });
}
