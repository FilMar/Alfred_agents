/** Everything a fresh agent call receives. Built from scratch each turn. */
export type AgentPrompt = {
  system: string; // base prompt + optional hat overlay
  user: string; // summary + ledger + tail + retrieval + @files + input, one block
};

/** What comes back from tb/ti before the call. */
export type Retrieval = {
  tb: string[]; // Third Brain hits
  ti: string[]; // matching context->action rules
};

/** A file the user mentioned with @path, already read by the backend. */
export type LoadedFile = { path: string; content: string };

/** Fixed widget schemas — the model emits JSON, never HTML. */
export type Widget =
  | { type: "table"; columns: string[]; rows: string[][] }
  | { type: "chart"; spec: unknown } // rendered via atlante
  | { type: "action"; label: string; command: string }; // whitelisted commands only

/** The agent's reply, parsed by the harness. */
export type AgentReply = {
  text: string;
  widgets: Widget[];
  ledgerProposals: string[]; // agent proposes; UI asks the user; router writes
};
