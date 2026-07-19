import { getBaseDir, ensureDirs } from "./catalog.js";
import { ensureQueueDirs, recover } from "./queue.js";
import { createScheduler } from "./scheduler.js";
import { startServer, DEFAULT_PORT } from "./server.js";
import type { ExecutorDeps } from "./types.js";
import { spawnSync } from "node:child_process";
import { sendWol } from "./wol.js";

// ─── Production Deps ──────────────────────────────────────────────────────────

const prodDeps: ExecutorDeps = {
  sendWol: async (mac) => {
    await sendWol(mac);
  },
  pingHost: async (host) => {
    const res = spawnSync("ping", ["-c", "1", "-W", "2", host], { stdio: "ignore" });
    return res.status === 0;
  },
  runCommand: async (argv) => {
    const res = spawnSync(argv[0], argv.slice(1), { stdio: "inherit" });
    return { exitCode: res.status ?? 1 };
  },
};

// ─── Entrypoint ───────────────────────────────────────────────────────────────

const base = getBaseDir();

ensureDirs(base);
ensureQueueDirs(base);

const recovered = recover(base);
if (recovered > 0) {
  console.error(`[orchestrator] Recovered ${recovered} orphaned instance(s) from processing/.`);
}

const scheduler = createScheduler(base, 10_000, prodDeps);
scheduler.start();

const port = process.env.ORCH_PORT ? parseInt(process.env.ORCH_PORT, 10) : DEFAULT_PORT;
const server = startServer(port, base, prodDeps);

console.error(`[orchestrator] Listening on :${port}, base dir: ${base}`);

function shutdown() {
  scheduler.stop();
  server.stop();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
