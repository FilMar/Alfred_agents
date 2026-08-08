/** One user<->agent exchange, kept verbatim. */
export type Exchange = {
  at: string; // ISO timestamp
  user: string;
  agent: string;
};

/** Fixed sentence, append-only. Never re-paraphrased. */
export type LedgerEntry = {
  at: string; // ISO date
  text: string;
};

/** Sandbox dir allowlist. Starts empty — the user adds paths via /safe. */
export type SafeProfile = {
  read: string[];
  write: string[];
};

/** A memory bank. Serialized as one markdown file. */
export type Bank = {
  name: string;
  summary: string; // delta-merged narrative
  ledger: LedgerEntry[]; // append-only
  tail: Exchange[]; // last 3 exchanges, oldest first — mechanical
  safe: SafeProfile;
  cwd: string | null; // agent working dir, set via :cd — null: server default
};

/** How many exchanges the tail keeps. */
export const TAIL_SIZE = 3;
