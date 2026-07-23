import { Hono } from "hono";

import * as identity from "./identity.js";
import { normalizeTags, errorMessage } from "./types.js";

export const API_PORT = Number(process.env.TI_API_PORT ?? 8789);

// ─── OpenAPI spec ─────────────────────────────────────────────────────────────
// Statico: descrive la stessa superficie esposta sotto, in un formato
// registrabile come Tool Server OpenAPI (es. in OpenWebUI).

const OPENAPI_SPEC = {
  openapi: "3.1.0",
  info: { title: "Third Identity API", version: "0.1.0", description: "Context-Action Rules — Third Identity" },
  servers: [{ url: `http://localhost:${API_PORT}` }],
  paths: {
    "/add": {
      post: {
        operationId: "addEntry",
        summary: "Embed a context (if) and associate it with an action (do)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["if", "do"],
                properties: {
                  if: { type: "string" },
                  do: { type: "string" },
                  tags: { type: "array", items: { type: "string" } },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Created entry" } },
      },
    },
    "/search": {
      post: {
        operationId: "searchEntries",
        summary: "Semantic search for context rules",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["query"],
                properties: {
                  query: { type: "string" },
                  limit: { type: "integer", default: 10 },
                  tags: { type: "array", items: { type: "string" } },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Ranked candidate rules" } },
      },
    },
    "/list": {
      get: {
        operationId: "listEntries",
        summary: "List all identity rules",
        parameters: [{ name: "tags", in: "query", schema: { type: "string" }, description: "Comma-separated tags" }],
        responses: { "200": { description: "Entries" } },
      },
    },
    "/entries/{id}": {
      delete: {
        operationId: "deleteEntry",
        summary: "Remove a rule by ID",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Deleted" } },
      },
      patch: {
        operationId: "appendDo",
        summary: "Append an action to an existing rule",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", required: ["do"], properties: { do: { type: "string" } } },
            },
          },
        },
        responses: { "200": { description: "Updated entry" } },
      },
    },
  },
} as const;

// ─── App ──────────────────────────────────────────────────────────────────────

export const app = new Hono();

app.get("/openapi.json", (c) => c.json(OPENAPI_SPEC));

app.post("/add", async (c) => {
  const body = await c.req.json();
  if (typeof body.if !== "string" || typeof body.do !== "string") return c.json({ error: "if and do are required" }, 400);

  const entry = await identity.addEntry(body.if, body.do, normalizeTags(body.tags ?? []));
  return c.json(entry);
});

app.post("/search", async (c) => {
  const body = await c.req.json();
  if (typeof body.query !== "string") return c.json({ error: "query is required" }, 400);

  const results = await identity.searchEntries(body.query, {
    limit: body.limit,
    tags: body.tags?.length ? normalizeTags(body.tags) : undefined,
  });
  return c.json(results);
});

app.get("/list", async (c) => {
  const tags = c.req.query("tags");
  const entries = await identity.listEntries(tags ? normalizeTags(tags.split(",")) : undefined);
  return c.json(entries);
});

app.delete("/entries/:id", async (c) => {
  const id = c.req.param("id");
  await identity.deleteEntry(id);
  return c.json({ id, deleted: true });
});

app.patch("/entries/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  if (typeof body.do !== "string") return c.json({ error: "do is required" }, 400);

  try {
    const entry = await identity.appendDo(id, body.do);
    return c.json(entry);
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 404);
  }
});

// ─── Server ───────────────────────────────────────────────────────────────────

export function serveApi(): void {
  Bun.serve({ port: API_PORT, fetch: app.fetch });
}
