/** What the user's input resolves to. Decided before any LLM call. */
export type Command =
  | { kind: "turn"; text: string; files: string[] } // no ":" prefix: goes to the agent; files from @mentions
  | { kind: "bash"; cmd: string } // :bash <cmd> — user terminal in the browser
  | { kind: "mem"; name?: string } // :mem <name> switch bank; no name: list banks
  | { kind: "new"; name: string } // :new <name> create + switch, old bank stays
  | { kind: "delete"; name?: string } // :delete [name] — default: active bank
  | { kind: "clear" } // :clear — wipe summary+tail, keep ledger+safe
  | { kind: "safe" } // :safe — open the allowlist menu
  | { kind: "cd"; path?: string } // :cd <path> set the bank's agent cwd; no path: show it
  | { kind: "hat"; name: string } // :black, :white, ... — arm a hat for the next turn
  | { kind: "detach"; task: string } // :detach <task> — background job
  | { kind: "edit-memory" } // :edit-memory — open the bank file panel
  | { kind: "unknown"; raw: string }; // unrecognized ":x": error, never the agent

/** Per-session mutable state, lives in the server. */
export type SessionState = {
  bank: string; // active bank name
  hat: string | null; // armed hat, consumed by the next turn
};
