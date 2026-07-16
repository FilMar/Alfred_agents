import { getBaseDir, ensureDirs } from "./catalog.js";
import { ensureQueueDirs, recover } from "./queue.js";
import { createScheduler } from "./scheduler.js";
import { startServer, DEFAULT_PORT } from "./server.js";

// ─── Entrypoint ───────────────────────────────────────────────────────────────

const base = getBaseDir();

ensureDirs(base);
ensureQueueDirs(base);

const recovered = recover(base);
if (recovered > 0) {
  console.error(`[orchestrator] Recovered ${recovered} orphaned instance(s) from processing/.`);
}

const scheduler = createScheduler(base);
scheduler.start();

const port = process.env.ORCH_PORT ? parseInt(process.env.ORCH_PORT, 10) : DEFAULT_PORT;
const server = startServer(port, base);

console.error(`[orchestrator] Listening on :${port}, base dir: ${base}`);

function shutdown() {
  scheduler.stop();
  server.stop();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);