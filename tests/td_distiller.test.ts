// Tests for tools/td/src/distiller.ts. Every test is a bare call on valid input:
// the contract asserts inside the module are the only oracle, no expect of our own.

import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import * as db from "../tools/tl/src/db.ts";
import { createApp } from "../tools/tl/src/api.ts";
import { exchangeId } from "../tools/tl/src/types.ts";
import type { Contents, Exchange } from "../tools/tl/src/types.ts";

type Reply = Readonly<{ text: string }>;
const queue: Reply[] = [];       // model replies, consumed in order, one per request
function sseText(text: string): string {
  const chunks = [
    { id: "c1", object: "chat.completion.chunk", model: "m", choices: [{ index: 0, delta: { content: text }, finish_reason: null }] },
    { id: "c1", object: "chat.completion.chunk", model: "m", choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } },
  ];
  return chunks.map((c) => `data: ${JSON.stringify(c)}\n\n`).join("") + "data: [DONE]\n\n";
}
const sse = Bun.serve({
  port: 0,
  async fetch(req) {
    await req.json();
    const reply = queue.shift();
    if (reply === undefined) return new Response(JSON.stringify({ error: "no reply queued" }), { status: 500, headers: { "content-type": "application/json" } });
    return new Response(sseText(reply.text), { headers: { "content-type": "text/event-stream" } });
  },
});
// Qdrant stub for the tag vocabulary
const qdrant = Bun.serve({
  port: 0,
  async fetch(req) {
    if (req.method !== "POST" || new URL(req.url).pathname !== "/collections/third-brain/points/scroll") return new Response("not found", { status: 404 });
    const page = { result: { points: [{ payload: { tags: ["memoria", "qualità"] } }, { payload: { tags: ["architettura"] } }], next_page_offset: null }, };
    return new Response(JSON.stringify(page), { headers: { "content-type": "application/json" } });
  },
});
// tl: real app on an in-memory db
const SESSION = "s-1";
const NOW = new Date("2026-10-11T10:00:00.000Z");
const handle = db.open(":memory:");
db.upsertSession(handle, { id: SESSION, started: NOW.toISOString() });
const tl = Bun.serve({ port: 0, fetch: createApp(handle).fetch });
afterAll(() => { sse.stop(); qdrant.stop(); tl.stop(); });
beforeEach(() => { queue.length = 0; });
process.env.QDRANT_URL = `http://localhost:${qdrant.port}`;
process.env.TL_API_URL = `http://localhost:${tl.port}`;

const D = await import("../tools/td/src/distiller.ts");
const { Turn, SessionRead } = await import("../tools/td/src/session.ts");
const { SessionMap } = await import("../tools/td/src/episodes.ts");
const { Extractor } = await import("../tools/td/src/config.ts");
const { Version } = await import("../tools/td/src/registry.ts");
const { targetOf } = await import("../tools/td/src/extraction.ts");

const connection = {
  provider: "ollama", id: "glm-5.3-flash", api: "openai-completions",
  baseUrl: `http://localhost:${sse.port}/v1`, reasoning: true,
  compat: { supportsDeveloperRole: false }, contextWindow: 128000, maxTokens: 8192,
};
const role = { connection, thinking: "low", temperature: 0.1, system: "You extract notes." };
const extractor = Extractor.fromJson({
  episodes: role, extract: role, critic: role, novelty: role,
  checks: [
    { name: "is_textbook_definition", text: "A manual already says this.", kind: "note", dropWhen: "atLeast", threshold: 0.6 },
    { name: "is_user_rejection", text: "The user rejected something.", kind: "rule", dropWhen: "under", threshold: 0.4 },
  ],
  episodeChars: 4000, targetInputChars: 6000, targetOutputChars: 8000, listingChars: 300, vocabularySize: 80, topK: 5,
});
const version = await Version.add(extractor, null, "first", NOW);

let seq = 0;
function turn(input: string, output: string) {
  seq += 1;
  const id = exchangeId(SESSION, `message-${seq}`);
  const exchange: Exchange = { id, session: SESSION, timestamp: new Date(Date.UTC(2026, 0, 1) + seq * 1000).toISOString(), kind: "chat", actor: "alfredo" };
  db.upsertExchange(handle, exchange);
  const contents: Contents = { exchange_id: id, input, output };
  return Turn.of(exchange, contents);
}

const USER = "secondo me quando il test fallisce devi leggere il log prima di toccare il codice";
const AGENT = "Abbiamo visto che con soglia cosine 0.95 due note opposte sembrano duplicate, quindi la soglia va abbassata.";
const note = {
  what: "La soglia cosine è troppo alta per vedere le note che si contraddicono",
  why: "Due note opposte con le stesse parole hanno un coseno alto e sembrano una duplicata",
  kind: "attrito", tags: ["architettura", "memoria"],
  contexts: ["deduplicare le note", "cercare contraddizioni nel grafo"],
  quote: "con soglia cosine 0.95 due note opposte",
};
const rule = { if: "il test fallisce", do: "leggi il log prima di toccare il codice", tags: ["qualità"], quote: "leggere il log prima di toccare il codice" };

// model replies, in the order the distiller consumes them
const SPLIT = `{"episodes":[{"from":0,"to":1,"summary":"saluto e regola sul log"}]}`;
const NOTHING = `{"notes":[],"rules":[]}`;
const BOTH = JSON.stringify({ notes: [note], rules: [rule] });
const NOTE_ONLY = JSON.stringify({ notes: [note], rules: [] });
const PHASE_ONE_DROPPED = JSON.stringify({ notes: [{ ...note, quote: "frase che non c'è nel testo" }], rules: [] });
const CRITIC_KEEPS_NOTE = `{"is_textbook_definition":0.1}`;
const CRITIC_DROPS_NOTE = `{"is_textbook_definition":0.9}`;
const CRITIC_KEEPS_RULE = `{"is_user_rejection":0.9}`;
const NOT_JSON = "not json";

function enqueue(...texts: string[]) {
  for (const text of texts) queue.push({ text });
}

function readOfTwoTurns() {
  return SessionRead.of(SESSION, [turn("ciao", "Ciao."), turn(USER, AGENT)]);
}

function secondTurnTarget() {
  const read = readOfTwoTurns();
  const map = SessionMap.fromJson({ episodes: [{ from: 0, to: 1, summary: "s" }] }, read);
  return targetOf(map, map.episodes()[0], 1);
}

describe("distillerOf", () => {
  test("builds the distiller of a version at a given time", async () => {
    await D.distillerOf(version, NOW);
  });
});

describe("distillTarget", () => {
  test("judges and records a kept note and a kept rule", async () => {
    const target = secondTurnTarget();
    enqueue(BOTH, CRITIC_KEEPS_NOTE, CRITIC_KEEPS_RULE);
    const distiller = await D.distillerOf(version, NOW);
    await D.distillTarget(distiller, target);
  });

  test("a failed extraction judges and records nothing", async () => {
    const target = secondTurnTarget();
    enqueue(NOT_JSON, NOT_JSON);
    const distiller = await D.distillerOf(version, NOW);
    await D.distillTarget(distiller, target);
  });

  test("a note dropped by a phase 1 check gets an outcome but no critic", async () => {
    const target = secondTurnTarget();
    enqueue(PHASE_ONE_DROPPED);
    const distiller = await D.distillerOf(version, NOW);
    await D.distillTarget(distiller, target);
  });

  test("a note dropped by the critic keeps its judged outcome", async () => {
    const target = secondTurnTarget();
    enqueue(NOTE_ONLY, CRITIC_DROPS_NOTE);
    const distiller = await D.distillerOf(version, NOW);
    await D.distillTarget(distiller, target);
  });

  test("a failed critic on a kept note leaves the outcome open", async () => {
    const target = secondTurnTarget();
    enqueue(NOTE_ONLY, NOT_JSON, NOT_JSON);
    const distiller = await D.distillerOf(version, NOW);
    await D.distillTarget(distiller, target);
  });
});

describe("distillSession", () => {
  test("an ok split reports and records every turn, in order", async () => {
    enqueue(SPLIT, NOTHING, BOTH, CRITIC_KEEPS_NOTE, CRITIC_KEEPS_RULE);
    const distiller = await D.distillerOf(version, NOW);
    await D.distillSession(distiller, readOfTwoTurns());
  });

  test("a failed split reports no exchange", async () => {
    enqueue(NOT_JSON, NOT_JSON);
    const distiller = await D.distillerOf(version, NOW);
    await D.distillSession(distiller, readOfTwoTurns());
  });
});