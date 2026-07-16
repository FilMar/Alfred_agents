// ─── Verdict ──────────────────────────────────────────────────────────────────

export type Verdict = "PASS" | "FAIL" | "WARNING" | "UNAUDITED";

// ─── Task ─────────────────────────────────────────────────────────────────────

export interface RaspberryTask {
  name: string;
  schedule: string;
  requiresDesktop: boolean;
  timeoutSec?: number;
  verdict: Verdict;
}

// ─── Run Instance ─────────────────────────────────────────────────────────────

export type QueueState = "pending" | "processing" | "completed" | "failed";

export const QUEUE_STATES: readonly QueueState[] = [
  "pending",
  "processing",
  "completed",
  "failed",
] as const;

export interface RunInstance {
  id: string;
  taskName: string;
  createdAt: string;
  /** ISO timestamp of the scheduled slot that triggered this run. */
  scheduledFor: string;
}