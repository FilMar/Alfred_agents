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

// ─── Wake State ────────────────────────────────────────────────────────────────

export interface WakeState {
  sentAt: string;
  attempts: number;
  alerted: boolean;
}

// ─── Dispatch ──────────────────────────────────────────────────────────────────

export interface DispatchPlanEntry {
  instanceId: string;
  scpArgv: string[];
  sshArgv: string[];
}

// ─── Executor Dependencies ──────────────────────────────────────────────────────

export interface ExecutorDeps {
  /** Sends a WoL magic packet. */
  sendWol: (mac: string) => Promise<void>;
  /** One-shot reachability check for the desktop host. Level check, not a wait loop. */
  pingHost: (host: string) => Promise<boolean>;
  /** Executes a command on the local or remote shell. */
  runCommand: (argv: string[]) => Promise<{ exitCode: number }>;
  /** Optional local executor for tests. */
  runLocal?: (argv: string[]) => Promise<{ exitCode: number }>;
}
