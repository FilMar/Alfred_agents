// CRUD over the three tables, and nothing else. It validates every row it writes:
// a store is a boundary, and tl holds the only copy once a transcript rotates.

import { Hono } from "hono";
import type { Context } from "hono";
import type { Database } from "bun:sqlite";

import * as db from "./db.js";
import type { Contents, Exchange, ExchangeKind, Harness, Session } from "./types.js";
import { EXCHANGE_KINDS, HARNESSES, TIMESTAMP_SHAPE, validateContents, validateExchange, validateSession } from "./types.js";

export const API_PORT = Number(process.env.TL_API_PORT ?? 8790);

const OPENAPI_SPEC = {
  openapi: "3.0.0",
  info: { title: "Third Log (tl)", version: "1.0.0", description: "Archive of work done. CRUD only." },
  paths: {
    "/sessions": { post: { summary: "Upsert one session or an array of them" }, get: { summary: "List sessions, newest first, filtered by harness" } },
    "/exchanges": { post: { summary: "Upsert one exchange or an array of them" }, get: { summary: "List exchanges by session, kind, time or distilled" } },
    "/exchanges/{id}": { get: { summary: "One exchange" }, patch: { summary: "Set or clear distilled" } },
    "/contents": { post: { summary: "Upsert one body or an array of them" } },
    "/contents/{id}": { get: { summary: "The body of one exchange" } },
    "/health": { get: { summary: "Row counts, to prove the archive answers" } },
  },
};

type Validator<T> = (row: T) => string | null;

export function createApp(handle: Database): Hono {
  const app = new Hono();

  app.get("/openapi.json", (c) => c.json(OPENAPI_SPEC));

  app.get("/health", (c) => c.json({
    ok: true,
    sessions: count(handle, "sessions"),
    exchanges: count(handle, "exchanges"),
    contents: count(handle, "contents"),
  }));

  app.post("/sessions", async (c) => write<Session>(c, validateSession, (row) => db.upsertSession(handle, row)));
  app.post("/exchanges", async (c) => write<Exchange>(c, validateExchange, (row) => db.upsertExchange(handle, row)));
  app.post("/contents", async (c) => write<Contents>(c, validateContents, (row) => db.upsertContents(handle, row)));

  app.get("/sessions", (c) => {
    const harness = c.req.query("harness");
    if (harness !== undefined && !(HARNESSES as readonly string[]).includes(harness)) {
      return c.json({ error: `harness must be ${HARNESSES.join(" or ")}` }, 400);
    }
    return c.json(db.listSessions(handle, {
      harness: harness as Harness | undefined,
      limit: intParam(c.req.query("limit")),
    }));
  });

  app.get("/exchanges", (c) => {
    const kind = c.req.query("kind");
    if (kind !== undefined && !(EXCHANGE_KINDS as readonly string[]).includes(kind)) {
      return c.json({ error: `kind must be ${EXCHANGE_KINDS.join(" or ")}` }, 400);
    }
    return c.json(db.listExchanges(handle, {
      session: c.req.query("session"),
      kind: kind as ExchangeKind | undefined,
      since: c.req.query("since"),
      until: c.req.query("until"),
      distilled: boolParam(c.req.query("distilled")),
      limit: intParam(c.req.query("limit")),
    }));
  });

  app.get("/exchanges/:id", (c) => {
    const found = db.getExchange(handle, c.req.param("id"));
    return found ? c.json(found) : c.json({ error: "exchange not found" }, 404);
  });

  app.get("/contents/:id", (c) => {
    const found = db.getContents(handle, c.req.param("id"));
    return found ? c.json(found) : c.json({ error: "contents not found" }, 404);
  });

  app.patch("/exchanges/:id", async (c) => {
    const body = await c.req.json().catch(() => null) as { distilled?: string | null } | null;
    if (body === null || !("distilled" in body)) return c.json({ error: "distilled is required" }, 400);
    const value = body.distilled ?? null;
    if (value !== null && !TIMESTAMP_SHAPE.test(value)) return c.json({ error: "distilled is not ISO-8601 UTC" }, 400);
    const done = db.setDistilled(handle, c.req.param("id"), value);
    return done ? c.json({ id: c.req.param("id"), distilled: value }) : c.json({ error: "exchange not found" }, 404);
  });

  return app;
}

/** One row or an array of them, every row validated before the first write. */
async function write<T>(c: Context, validate: Validator<T>, store: (row: T) => void) {
  const body = await c.req.json().catch(() => null);
  if (body === null) return c.json({ error: "body is not JSON" }, 400);

  const rows = (Array.isArray(body) ? body : [body]) as T[];
  const invalid = rows.map(validate).find((message) => message !== null);
  if (invalid) return c.json({ error: invalid }, 400);

  for (const row of rows) store(row);
  return c.json({ written: rows.length });
}

function count(handle: Database, table: string): number {
  const row = handle.query(`SELECT count(*) AS n FROM ${table}`).get() as { n: number };
  return row.n;
}

function intParam(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const value = parseInt(raw, 10);
  return Number.isInteger(value) ? value : undefined;
}

function boolParam(raw: string | undefined): boolean | undefined {
  if (raw === "true") return true;
  if (raw === "false") return false;
  return undefined;
}

export function serveApi(port: number = API_PORT, path?: string): void {
  const handle = db.open(path);
  Bun.serve({ port, fetch: createApp(handle).fetch });
}
