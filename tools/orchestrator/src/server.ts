import { getBaseDir, listTasks, registerTask, validateName } from "./catalog.js";
import { locate, ensureQueueDirs } from "./queue.js";
import { clearWakeState } from "./wake.js";
import { dispatchWake } from "./executor.js";
import type { ExecutorDeps } from "./types.js";

// ─── Constants ────────────────────────────────────────────────────────────────

export const DEFAULT_PORT = 7717;

// ─── Default Deps ─────────────────────────────────────────────────────────────

const defaultDeps: ExecutorDeps = {
  sendWol: async () => {},
  pingHost: async () => false,
  runCommand: async () => ({ exitCode: 0 }),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function errorResponse(status: number, message: string): Response {
  return jsonResponse(status, { error: message });
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function handleWakeCallback(base: string, deps: ExecutorDeps): Promise<Response> {
  try {
    clearWakeState(base);
    await dispatchWake(deps, base);
    return jsonResponse(200, { status: "ok" });
  } catch (e) {
    return errorResponse(500, (e as Error).message);
  }
}

function handleAddTask(body: unknown, base: string): Response {
  if (typeof body !== "object" || body === null) {
    return errorResponse(400, "Body deve essere un oggetto JSON.");
  }
  const { name, source } = body as Record<string, unknown>;
  if (typeof name !== "string" || typeof source !== "string") {
    return errorResponse(400, "Campi obbligatori: name (string), source (string).");
  }
  try {
    const entry = registerTask(name, source, base);
    return jsonResponse(200, entry);
  } catch (e) {
    return errorResponse(400, (e as Error).message);
  }
}

function handleListTasks(base: string): Response {
  return jsonResponse(200, listTasks(base));
}

function handleGetTaskStatus(id: string, base: string): Response {
  try {
    validateName(id);
  } catch (e) {
    return errorResponse(400, (e as Error).message);
  }
  const located = locate(id, base);
  if (!located) {
    return errorResponse(404, `Istanza "${id}" non trovata.`);
  }
  return jsonResponse(200, { ...located.instance, status: located.state });
}

// ─── Router ───────────────────────────────────────────────────────────────────

export interface Server {
  stop(): void;
  setDeps(deps: ExecutorDeps): void;
}

export function startServer(
  port = process.env.ORCH_PORT ? parseInt(process.env.ORCH_PORT, 10) : DEFAULT_PORT, 
  base = getBaseDir(), 
  deps = defaultDeps
): Server {
  ensureQueueDirs(base);

  let currentDeps = deps;

  const server = Bun.serve({
    port,
    async fetch(req) {
      const url = new URL(req.url);
      const path = url.pathname;
      const method = req.method;

      if (method === "POST" && path === "/i_wake") {
        return handleWakeCallback(base, currentDeps);
      }

      if (method === "POST" && path === "/add_task") {
        let body: unknown;
        try {
          body = await req.json();
        } catch {
          return errorResponse(400, "invalid JSON body");
        }
        return handleAddTask(body, base);
      }

      if (method === "GET" && path === "/list_tasks") {
        return handleListTasks(base);
      }

      if (method === "GET" && path.startsWith("/get_task_status/")) {
        const id = decodeURIComponent(path.slice("/get_task_status/".length));
        return handleGetTaskStatus(id, base);
      }

      return errorResponse(404, `Rotta non trovata: ${method} ${path}`);
    },
  });

  return {
    stop() {
      server.stop(true);
    },
    setDeps(newDeps) {
      currentDeps = newDeps;
    },
  };
}
