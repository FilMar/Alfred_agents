/** Entrypoint. Milestone 1 ships with a FAKE agent: the episodic loop, banks,
 *  router and UI are real; the reply just echoes what the agent would receive.
 *  The real edges (retrieve/runAgent/condense) replace `fakeDeps` in the SDK phase. */
import { buildApp } from "./server/app.ts";
import type { TurnDeps } from "./turn/pipeline.ts";

const HOME = process.env.HOME ?? "/tmp";

const cfg = {
  banksDir: process.env.COCKPIT_BANKS_DIR ?? `${HOME}/.pi/cockpit/banks`,
  hatsDir: process.env.COCKPIT_HATS_DIR ?? new URL("../../th/hats", import.meta.url).pathname,
  port: Number(process.env.COCKPIT_PORT ?? 8790),
};

const fakeDeps: TurnDeps = {
  retrieve: async () => ({ tb: [], ti: [] }),
  runAgent: async (prompt) => ({
    text: `[fake agent] context received (${prompt.user.length} chars):\n\n${prompt.user}`,
    widgets: [],
    ledgerProposals: [],
  }),
  condense: async (summary, ex) =>
    [summary, `- ${ex.user.slice(0, 120)}`].filter(Boolean).join("\n"),
};

const app = buildApp(cfg, fakeDeps);
console.log(`cockpit listening on http://localhost:${cfg.port} (banks: ${cfg.banksDir})`);

export default { port: cfg.port, fetch: app.fetch };
