// Stubs for the td tests that reach tb, ti, tl and the model. Nothing here is a test.

import { createApp } from "../../tools/tl/src/api.ts";
import * as db from "../../tools/tl/src/db.ts";

const DIMS = 768;

type Point = { vector: unknown; payload: Record<string, unknown> };
type Collections = Map<string, Map<string, Point>>;

export type MemoryStubs = Readonly<{
  collections: Collections;
  failPath(fragment: string | null): void;
  stop(): void;
}>;

export function embed(text: string): number[] {
  const v = new Array<number>(DIMS).fill(0);
  for (const w of text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []) {
    let h = 2166136261;
    for (const ch of w) h = Math.imul(h ^ ch.codePointAt(0)!, 16777619) >>> 0;
    v[h % DIMS] += 1;
  }
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / norm);
}

function denseOf(vector: unknown): number[] {
  return Array.isArray(vector) ? (vector as number[]) : ((vector as { dense: number[] }).dense);
}

function cosine(a: number[], b: number[]): number {
  return a.reduce((s, x, i) => s + x * b[i], 0);
}

function matches(payload: Record<string, unknown>, id: string, filter: any): boolean {
  if (!filter) return true;
  const must: any[] = filter.must ?? [];
  const mustNot: any[] = filter.must_not ?? [];
  const test = (c: any): boolean => {
    if (c.has_id) return c.has_id.includes(id);
    const raw = payload[c.key];
    const values = Array.isArray(raw) ? raw : [raw];
    if (c.match?.any) return values.some((v) => c.match.any.includes(v));
    if (c.match && "value" in c.match) return values.includes(c.match.value);
    return true;
  };
  return must.every(test) && !mustNot.some(test);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

export function startMemoryStubs(): MemoryStubs {
  const collections: Collections = new Map();
  let failing: string | null = null;

  const qdrant = Bun.serve({
    port: 0,
    async fetch(req) {
      const url = new URL(req.url);
      const path = url.pathname;
      if (failing !== null && path.includes(failing)) return json({ error: "stub failure" }, 500);
      if (path === "/") return json({ title: "memory stub" });
      const m = /^\/collections\/([^/]+)(\/.*)?$/.exec(path);
      if (m === null) return new Response("not found", { status: 404 });
      const [, name, rest = ""] = m;
      const body: any = req.method === "GET" ? {} : await req.json().catch(() => ({}));
      if (rest === "") {
        if (req.method === "GET") {
          if (!collections.has(name)) return new Response("missing", { status: 404 });
          const schema = Object.fromEntries(["tags", "kind", "what", "why"].map((f) => [f, {}]));
          return json({ result: { config: { params: { sparse_vectors: {} } }, payload_schema: schema } });
        }
        if (!collections.has(name)) collections.set(name, new Map());
        return json({ result: true });
      }
      const points = collections.get(name);
      if (points === undefined) return new Response("missing", { status: 404 });
      if (rest === "/index") return json({ result: true });
      if (rest === "/points" && req.method === "PUT") {
        for (const p of body.points) points.set(p.id, { vector: p.vector, payload: p.payload });
        return json({ result: true });
      }
      if (rest === "/points" && req.method === "POST") {
        const found = (body.ids as string[]).filter((id) => points.has(id)).map((id) => ({ id, payload: points.get(id)!.payload }));
        return json({ result: found });
      }
      if (rest.startsWith("/points/") && req.method === "GET") {
        const point = points.get(decodeURIComponent(rest.slice("/points/".length)));
        return point === undefined ? json({ error: "no point" }, 404) : json({ result: { id: rest.slice(8), payload: point.payload, vector: denseOf(point.vector) } });
      }
      if (rest === "/points/payload") {
        for (const id of body.points as string[]) {
          const point = points.get(id);
          if (point !== undefined) point.payload = { ...point.payload, ...body.payload };
        }
        return json({ result: true });
      }
      if (rest === "/points/delete") {
        for (const id of body.points as string[]) points.delete(id);
        return json({ result: true });
      }
      if (rest === "/points/query") {
        const query = body.query as number[];
        const scored = [...points.entries()]
          .filter(([id, p]) => matches(p.payload, id, body.filter))
          .map(([id, p]) => ({ id, payload: p.payload, score: cosine(query, denseOf(p.vector)) }))
          .filter((p) => body.score_threshold === undefined || p.score >= body.score_threshold)
          .sort((a, b) => b.score - a.score)
          .slice(0, body.limit ?? 10);
        return json({ result: { points: scored } });
      }
      if (rest === "/points/scroll") {
        const all = [...points.entries()].filter(([id, p]) => matches(p.payload, id, body.filter)).map(([id, p]) => ({ id, payload: p.payload }));
        return json({ result: { points: all, next_page_offset: null } });
      }
      return new Response("not found", { status: 404 });
    },
  });

  const ollama = Bun.serve({
    port: 0,
    async fetch(req) {
      if (req.method === "GET") return json({ models: [] });
      if (failing !== null && "/api/embed".includes(failing)) return json({ error: "stub failure" }, 500);
      const body: any = await req.json();
      return json({ embeddings: [embed(String(body.input))] });
    },
  });

  process.env.QDRANT_URL = `http://localhost:${qdrant.port}`;
  process.env.OLLAMA_URL = `http://localhost:${ollama.port}`;
  return {
    collections,
    failPath: (fragment) => { failing = fragment; },
    stop: () => { qdrant.stop(); ollama.stop(); },
  };
}

export type ModelStub = Readonly<{ port: number; queue: string[]; stop(): void }>;

export function startModelStub(): ModelStub {
  const queue: string[] = [];
  const server = Bun.serve({
    port: 0,
    async fetch(req) {
      await req.json();
      const text = queue.shift();
      if (text === undefined) return json({ error: "no reply queued" }, 500);
      const chunks = [
        { id: "c1", object: "chat.completion.chunk", model: "m", choices: [{ index: 0, delta: { content: text }, finish_reason: null }] },
        { id: "c1", object: "chat.completion.chunk", model: "m", choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } },
      ];
      const sse = chunks.map((c) => `data: ${JSON.stringify(c)}\n\n`).join("") + "data: [DONE]\n\n";
      return new Response(sse, { headers: { "content-type": "text/event-stream" } });
    },
  });
  return { port: server.port, queue, stop: () => server.stop() };
}

export type TlStub = Readonly<{ handle: ReturnType<typeof db.open>; stop(): void }>;

export function startTlStub(): TlStub {
  const handle = db.open(":memory:");
  const server = Bun.serve({ port: 0, fetch: createApp(handle).fetch });
  process.env.TL_API_URL = `http://localhost:${server.port}`;
  return { handle, stop: () => server.stop() };
}
