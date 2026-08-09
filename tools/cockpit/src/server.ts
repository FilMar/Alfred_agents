import { buildApp } from "./server/app.ts";
import { runAgent } from "./turn/agent.ts";
import { condense } from "./turn/condense.ts";
import type { TurnDeps } from "./turn/pipeline.ts";
import { retrieve } from "./turn/retrieve.ts";

const HOME = process.env.HOME ?? "/tmp";

const cfg = {
  banksDir: process.env.COCKPIT_BANKS_DIR ?? `${HOME}/.pi/cockpit/banks`,
  hatsDir: process.env.COCKPIT_HATS_DIR ?? new URL("../../th/hats", import.meta.url).pathname,
  port: Number(process.env.COCKPIT_PORT ?? 8790),
};

const deps: TurnDeps = { retrieve, runAgent, condense };

const app = buildApp(cfg, deps);
console.log(`cockpit listening on http://localhost:${cfg.port} (banks: ${cfg.banksDir})`);

export default { port: cfg.port, fetch: app.fetch };
