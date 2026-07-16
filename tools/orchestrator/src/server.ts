import { getBaseDir, listTasks, registerTask, validateName } from "./catalog.js";
import { locate } from "./queue.js";
import { ensureQueueDirs } from "./queue.js";

// ─── Constants ────────────────────────────────────────────────────────────────

export const DEFAULT_PORT = 7717;

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
}

export function startServer(port = process.env.ORCH_PORT ? parseInt(process.env.ORCH_PORT, 10) : DEFAULT_PORT, base = getBaseDir()): Server {
  ensureQueueDirs(base);

  const server = Bun.serve({
    port,
    async fetch(req) {
      const url = new URL(req.url);
      const path = url.pathname;
      const method = req.method;

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
  };
}