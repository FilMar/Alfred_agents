import { Hono } from "hono";

import { createNote, addRefs, changeKind, changeTags, searchNotes, browseNotes, randomNote, listNoteTags } from "./notes.js";
import { NOTE_TYPES, isValidKind, normalizeTags, errorMessage } from "./types.js";
import type { NoteType, SearchOptions } from "./types.js";
import type { ScrollOptions } from "./qdrant.js";

export const API_PORT = Number(process.env.TB_API_PORT ?? 8788);

// ─── OpenAPI spec ─────────────────────────────────────────────────────────────
// Statico: descrive la stessa superficie esposta sotto, in un formato
// registrabile come Tool Server OpenAPI (es. in OpenWebUI).

const OPENAPI_SPEC = {
  openapi: "3.1.0",
  info: { title: "Third Brain API", version: "0.1.0", description: "Semantic memory — Third Brain" },
  servers: [{ url: `http://localhost:${API_PORT}` }],
  paths: {
    "/search": {
      post: {
        operationId: "searchNotes",
        summary: "Semantic search in the Third Brain",
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
                  depth: { type: "integer", default: 1 },
                  hybrid: { type: "boolean", default: false },
                  tags: { type: "array", items: { type: "string" } },
                  kind: { type: "array", items: { type: "string", enum: NOTE_TYPES } },
                  evidence_only: { type: "boolean", default: false },
                  include_hubs: { type: "boolean", default: false },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Search results" } },
      },
    },
    "/save": {
      post: {
        operationId: "saveNote",
        summary: "Save an atomic idea to the Third Brain",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["what", "why"],
                properties: {
                  what: { type: "string" },
                  why: { type: "string" },
                  kind: { type: "string", enum: NOTE_TYPES, default: "dato" },
                  tags: { type: "array", items: { type: "string" } },
                  source: { type: "string" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Created note id" } },
      },
    },
    "/tags": {
      get: { operationId: "listTags", summary: "List tags in use, sorted by frequency", responses: { "200": { description: "Tag frequency list" } } },
    },
    "/random": {
      get: { operationId: "randomNote", summary: "Return a random note", responses: { "200": { description: "A note" } } },
    },
    "/browse": {
      get: {
        operationId: "browseNotes",
        summary: "Browse memory without a semantic query",
        parameters: [
          { name: "kind", in: "query", schema: { type: "string", enum: NOTE_TYPES } },
          { name: "since", in: "query", schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
        ],
        responses: { "200": { description: "Notes" } },
      },
    },
    "/notes/{id}": {
      patch: {
        operationId: "updateNote",
        summary: "Update mutable fields of a note",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  kind: { type: "string", enum: NOTE_TYPES },
                  tags: { type: "array", items: { type: "string" } },
                  add_refs: {
                    type: "array",
                    items: { type: "object", required: ["id", "reason"], properties: { id: { type: "string" }, reason: { type: "string" } } },
                  },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Updated" } },
      },
    },
  },
} as const;

// ─── App ──────────────────────────────────────────────────────────────────────

export const app = new Hono();

app.get("/openapi.json", (c) => c.json(OPENAPI_SPEC));

app.post("/search", async (c) => {
  const body = await c.req.json();
  if (typeof body.query !== "string") return c.json({ error: "query is required" }, 400);
  if (body.kind && !(body.kind as string[]).every(isValidKind)) return c.json({ error: `invalid kind. Allowed: ${NOTE_TYPES.join(", ")}` }, 400);

  const options: SearchOptions = {
    limit: body.limit,
    depth: body.depth,
    hybrid: body.hybrid ?? false,
    tags: body.tags?.length ? normalizeTags(body.tags) : undefined,
    kind: body.kind as NoteType[] | undefined,
    evidence_only: body.evidence_only ?? false,
    include_hubs: body.include_hubs ?? false,
  };

  const results = await searchNotes(body.query, options);
  return c.json(results);
});

app.post("/save", async (c) => {
  const body = await c.req.json();
  if (typeof body.what !== "string" || typeof body.why !== "string") return c.json({ error: "what and why are required" }, 400);
  const kind = body.kind ?? "dato";
  if (!isValidKind(kind)) return c.json({ error: `invalid kind: "${kind}". Allowed: ${NOTE_TYPES.join(", ")}` }, 400);

  const note = await createNote({ what: body.what, why: body.why, kind, tags: normalizeTags(body.tags ?? []), source: body.source });
  return c.json({ id: note.id });
});

app.get("/tags", async (c) => c.json(await listNoteTags()));

app.get("/random", async (c) => {
  const note = await randomNote();
  if (!note) return c.json({ error: "No notes in the Third Brain." }, 404);
  return c.json(note);
});

app.get("/browse", async (c) => {
  const kind = c.req.query("kind");
  if (kind && !isValidKind(kind)) return c.json({ error: `invalid kind: "${kind}". Allowed: ${NOTE_TYPES.join(", ")}` }, 400);

  const options: ScrollOptions = {
    kind: kind as NoteType | undefined,
    since: c.req.query("since"),
    limit: c.req.query("limit") ? Number(c.req.query("limit")) : undefined,
  };

  return c.json(await browseNotes(options));
});

app.patch("/notes/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  let updated = false;

  try {
    if (body.kind) {
      if (!isValidKind(body.kind)) return c.json({ error: `invalid kind: "${body.kind}". Allowed: ${NOTE_TYPES.join(", ")}` }, 400);
      await changeKind(id, body.kind);
      updated = true;
    }

    if (body.tags?.length > 0) {
      await changeTags(id, normalizeTags(body.tags));
      updated = true;
    }

    if (body.add_refs?.length > 0) {
      await addRefs(id, body.add_refs);
      updated = true;
    }
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 400);
  }

  if (!updated) return c.json({ error: "Nothing to update. Use kind, tags or add_refs." }, 400);
  return c.json({ id, updated: true });
});

// ─── Server ───────────────────────────────────────────────────────────────────

export function serveApi(): void {
  Bun.serve({ port: API_PORT, fetch: app.fetch });
}
