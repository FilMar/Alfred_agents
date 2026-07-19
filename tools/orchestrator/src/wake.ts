import { existsSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { WakeState } from "./types.js";

export type WakeAction = "send-wol" | "retry-wol" | "alert" | "none";

/**
 * Decides the next WoL action for a desktop that a one-shot ping reported down.
 * Callers invoke this only when the desktop is relevant (pending desktop work,
 * or an upcoming run within the lead window). The deadline is sentAt +
 * bootTimeoutMin — the time granted to boot after a WoL — not the task's due
 * time, which is already in the past by the time an instance materializes.
 */
export function computeWakeAction(
  state: WakeState | null,
  now: Date,
  bootTimeoutMin: number,
): { action: WakeAction } {
  if (!state) {
    return { action: "send-wol" };
  }

  if (state.alerted) {
    return { action: "none" };
  }

  const deadline = new Date(state.sentAt).getTime() + bootTimeoutMin * 60_000;
  if (now.getTime() > deadline) {
    return state.attempts < 2 ? { action: "retry-wol" } : { action: "alert" };
  }

  return { action: "none" };
}

export function readWakeState(base: string): WakeState | null {
  const p = join(base, "wake.json");
  if (!existsSync(p)) return null;

  try {
    return JSON.parse(readFileSync(p, "utf-8")) as WakeState;
  } catch (e) {
    console.error(`[orchestrator] Corrupt wake.json at ${p}: ${(e as Error).message}`);
    return null;
  }
}

export function writeWakeState(state: WakeState, base: string): void {
  writeFileSync(join(base, "wake.json"), JSON.stringify(state, null, 2) + "\n", "utf-8");
}

export function clearWakeState(base: string): void {
  rmSync(join(base, "wake.json"), { force: true });
}
