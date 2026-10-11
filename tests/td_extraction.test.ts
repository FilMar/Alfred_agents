import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import type { Turn } from "../tools/td/src/session.ts";
import type { Contents, Exchange } from "../tools/tl/src/types.ts";

type Reply = Readonly<{ text: string }> | Readonly<{ status: number }>;
type Message = Readonly<{ role: string; content: string }>;

const queue: Reply[] = [];
const seen: { messages: readonly Message[] }[] = [];

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
    seen.push((await req.json()) as { messages: readonly Message[] });
    const reply = queue.shift();
    if (reply === undefined) {
      return new Response(JSON.stringify({ error: "no reply queued" }), { status: 500, headers: { "content-type": "application/json" } });
    }
    if ("status" in reply) {
      return new Response(JSON.stringify({ error: "model error" }), { status: reply.status, headers: { "content-type": "application/json" } });
    }
    return new Response(sseText(reply.text), { headers: { "content-type": "text/event-stream" } });
  },
});

const qdrant = Bun.serve({
  port: 0,
  async fetch(req) {
    if (req.method !== "POST" || new URL(req.url).pathname !== "/collections/third-brain/points/scroll") {
      return new Response("not found", { status: 404 });
    }
    const page = {
      result: {
        points: [{ payload: { tags: ["a", "b"] } }, { payload: { tags: ["b", "c"] } }, { payload: { tags: ["b"] } }, { payload: {} }],
        next_page_offset: null,
      },
    };
    return new Response(JSON.stringify(page), { headers: { "content-type": "application/json" } });
  },
});

afterAll(() => {
  sse.stop();
  qdrant.stop();
});

beforeEach(() => {
  queue.length = 0;
  seen.length = 0;
});

process.env.QDRANT_URL = `http://localhost:${qdrant.port}`;
const X = await import("../tools/td/src/extraction.ts");
const { Turn: TurnOf, SessionRead } = await import("../tools/td/src/session.ts");
const { SessionMap } = await import("../tools/td/src/episodes.ts");
const { Extractor } = await import("../tools/td/src/config.ts");

let seq = 0;
function turn(input = "vai", output = "Fatto."): Turn {
  seq += 1;
  const id = `00000000-0000-4000-8000-${String(seq).padStart(12, "0")}`;
  const exchange: Exchange = { id, session: "s-1", timestamp: new Date(Date.UTC(2026, 0, 1) + seq * 1000).toISOString(), kind: "chat", actor: "alfredo" };
  const contents: Contents = { exchange_id: id, input, output };
  return TurnOf.of(exchange, contents);
}

const USER = "secondo me quando il test fallisce devi leggere il log prima di toccare il codice";
const AGENT = "Abbiamo visto che con soglia cosine 0.95 due note opposte sembrano duplicate, quindi la soglia va abbassata.";
const VOCABULARY = ["sviluppo-software", "architettura", "memoria", "qualità"];

const read = SessionRead.of("s-1", [turn("ciao", "Ciao."), turn(USER, AGENT), turn("grazie", "Prego.")]);
const map = SessionMap.fromJson({ episodes: [{ from: 0, to: 0, summary: "saluti" }, { from: 1, to: 2, summary: "la soglia va abbassata" }] }, read);
const episode = map.episodes()[1];
const target = { map, episode, index: 0 };

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

const note = {
  what: "La soglia cosine è troppo alta per vedere le note che si contraddicono",
  why: "Due note opposte con le stesse parole hanno un coseno alto e sembrano una duplicata",
  kind: "attrito",
  tags: ["architettura", "Memoria", "nuovo-tag"],
  contexts: ["deduplicare le note", "cercare contraddizioni nel grafo"],
  quote: "con soglia cosine 0.95 due note opposte",
};
const rule = { if: "il test fallisce", do: "leggi il log prima di toccare il codice", tags: ["qualità"], quote: "leggere il log prima di toccare il codice" };

const otherRead = SessionRead.of("s-1", [turn()]);
const otherMap = SessionMap.fromJson({ episodes: [{ from: 0, to: 0, summary: "altro" }] }, otherRead);

function drops(checked: readonly { drop(): string | null }[]): (string | null)[] {
  return checked.map((one) => one.drop());
}

describe("targetOf", () => {
  test("throws when the episode is not in the map", () => {
    expect(() => X.targetOf(map, otherMap.episodes()[0], 0)).toThrow("targetOf: the episode is in the map");
  });

  test("throws when the index is not a turn of the episode", () => {
    expect(() => X.targetOf(map, episode, -1)).toThrow("targetOf: the index is a turn of the episode, index=-1, turns=2");
    expect(() => X.targetOf(map, episode, 2)).toThrow("targetOf: the index is a turn of the episode, index=2, turns=2");
    expect(() => X.targetOf(map, episode, 1.5)).toThrow("targetOf: the index is a turn of the episode, index=1.5, turns=2");
  });

  test("the target is the turn at the index", () => {
    X.targetOf(map, episode, 0);
    X.targetOf(map, episode, 1);
  });

  test("holds map, episode and index", () => {
    const result = X.targetOf(map, episode, 0);
    expect(result.map).toBe(map);
    expect(result.episode).toBe(episode);
    expect(result.index).toBe(0);
  });
});

describe("targetTurn", () => {
  test("is the turn of the episode at the index", () => {
    expect(X.targetTurn(target)).toBe(episode.turns()[0]);
    expect(X.targetTurn({ map, episode, index: 1 })).toBe(episode.turns()[1]);
  });
});

describe("episodeText", () => {
  test("throws when episodeChars is not a positive integer", () => {
    expect(() => X.episodeText(target, 0)).toThrow("episodeText: episodeChars is a positive integer, got=0");
    expect(() => X.episodeText(target, -1)).toThrow("episodeText: episodeChars is a positive integer, got=-1");
    expect(() => X.episodeText(target, 2.5)).toThrow("episodeText: episodeChars is a positive integer, got=2.5");
  });

  test("one entry per turn, the target marked, each side cut", () => {
    expect(X.episodeText(target, 1)).toBe("[0] <<< TARGET USER: s\nAGENT: A\n\n[1] USER: g\nAGENT: P");
    expect(X.episodeText(target, 3)).toBe("[0] <<< TARGET USER: sec\nAGENT: Abb\n\n[1] USER: gra\nAGENT: Pre");
    expect(X.episodeText(target, 4000)).toBe(`[0] <<< TARGET USER: ${USER}\nAGENT: ${AGENT}\n\n[1] USER: grazie\nAGENT: Prego.`);
  });
});

describe("targetText", () => {
  test("throws when the chars are not positive integers", () => {
    expect(() => X.targetText(target, 0, 5)).toThrow("targetText: inputChars is a positive integer, got=0");
    expect(() => X.targetText(target, -1, 5)).toThrow("targetText: inputChars is a positive integer, got=-1");
    expect(() => X.targetText(target, 2.5, 5)).toThrow("targetText: inputChars is a positive integer, got=2.5");
    expect(() => X.targetText(target, 5, 0)).toThrow("targetText: outputChars is a positive integer, got=0");
    expect(() => X.targetText(target, 5, -1)).toThrow("targetText: outputChars is a positive integer, got=-1");
    expect(() => X.targetText(target, 5, 2.5)).toThrow("targetText: outputChars is a positive integer, got=2.5");
  });

  test("the user followed by the agent, each cut", () => {
    expect(X.targetText(target, 1, 1)).toBe("USER: s\n\nAGENT: A");
    expect(X.targetText(target, 3, 5)).toBe("USER: sec\n\nAGENT: Abbia");
    expect(X.targetText(target, 6000, 8000)).toBe(`USER: ${USER}\n\nAGENT: ${AGENT}`);
  });
});

describe("extractionPrompt", () => {
  test("throws when the vocabulary is empty", () => {
    expect(() => X.extractionPrompt(target, [], extractor)).toThrow("extractionPrompt: the vocabulary is not empty");
  });

  test("vocabulary, session map, how the episode ended, the episode, the target", () => {
    const prompt =
      "Tag vocabulary: sviluppo-software, architettura, memoria, qualità\n\n" +
      `${map.text()}\n\n` +
      `## How this episode ended\n${episode.summary()}\n\n` +
      `## The episode (context)\n[0] <<< TARGET USER: ${USER}\nAGENT: ${AGENT}\n\n[1] USER: grazie\nAGENT: Prego.\n\n` +
      `## >>> TARGET: extract only from this exchange <<<\nUSER: ${USER}\n\nAGENT: ${AGENT}`;
    expect(X.extractionPrompt(target, VOCABULARY, extractor)).toBe(prompt);
  });
});

describe("candidatesCheck", () => {
  const NEED_LISTS = "need lists `notes` and `rules`";
  const NOT_A_NOTE = (i: number) => `notes[${i}] is not a note: it needs what, why, kind and quote as strings, and tags and contexts as lists of strings`;
  const NOT_A_RULE = (i: number) => `rules[${i}] is not a rule: it needs if, do and quote as strings, and tags as a list of strings`;

  const table: readonly (readonly [unknown, string | null])[] = [
    [{ notes: [], rules: [] }, null],
    [{ notes: [note], rules: [rule] }, null],
    [{ notes: [note, note], rules: [] }, null],
    [{ notes: [{ ...note, quote: "x" }], rules: [] }, null],
    [{ notes: [], rules: [], extra: 1 }, null],
    [null, NEED_LISTS],
    [[], NEED_LISTS],
    [{}, NEED_LISTS],
    [{ notes: [] }, NEED_LISTS],
    [{ rules: [] }, NEED_LISTS],
    [{ notes: "x", rules: [] }, NEED_LISTS],
    [{ notes: [], rules: {} }, NEED_LISTS],
    [{ notes: [1], rules: [] }, NOT_A_NOTE(0)],
    [{ notes: [note, { ...note, what: 5 }], rules: [] }, NOT_A_NOTE(1)],
    [{ notes: [{ ...note, tags: "a" }], rules: [] }, NOT_A_NOTE(0)],
    [{ notes: [{ ...note, contexts: [1] }], rules: [] }, NOT_A_NOTE(0)],
    [{ notes: [], rules: [{ ...rule, do: undefined }] }, NOT_A_RULE(0)],
    [{ notes: [], rules: [rule, { ...rule, tags: [2] }] }, NOT_A_RULE(1)],
    [{ notes: [1], rules: [1] }, NOT_A_NOTE(0)],
  ];

  for (const [json, expected] of table) {
    test(`candidatesCheck of ${JSON.stringify(json)}`, () => {
      expect(X.candidatesCheck(json)).toBe(expected);
    });
  }
});

describe("checkCandidates", () => {
  test("throws when the json does not pass candidatesCheck", () => {
    expect(() => X.checkCandidates({}, target, VOCABULARY, extractor)).toThrow("checkCandidates: the json passes the check");
  });

  test("throws when the vocabulary is empty", () => {
    expect(() => X.checkCandidates({ notes: [], rules: [] }, target, [], extractor)).toThrow("checkCandidates: the vocabulary is not empty");
  });

  test("keeps a note and a rule that pass every check", () => {
    const result = X.checkCandidates({ notes: [note], rules: [rule] }, target, VOCABULARY, extractor);
    expect(drops(result.notes)).toEqual([null]);
    expect(drops(result.rules)).toEqual([null]);
  });

  test("drops a note whose quote is not in the target", () => {
    const result = X.checkCandidates({ notes: [note, { ...note, quote: "una frase che nel testo non c'è" }], rules: [] }, target, VOCABULARY, extractor);
    expect(drops(result.notes)).toEqual([null, "quote"]);
    expect(drops(result.rules)).toEqual([]);
  });

  test("drops the second copy of a rule", () => {
    const result = X.checkCandidates({ notes: [], rules: [rule, rule] }, target, VOCABULARY, extractor);
    expect(drops(result.notes)).toEqual([]);
    expect(drops(result.rules)).toEqual([null, "same_quote"]);
  });

  test("empty lists give empty results", () => {
    const result = X.checkCandidates({ notes: [], rules: [] }, target, VOCABULARY, extractor);
    expect(drops(result.notes)).toEqual([]);
    expect(drops(result.rules)).toEqual([]);
  });

  test("a kept note carries the known tags and the proposed tags apart", () => {
    const kept = X.checkCandidates({ notes: [note], rules: [rule] }, target, VOCABULARY, extractor).notes[0];
    expect(kept.candidate().toJson().tags).toEqual(["architettura", "memoria"]);
    expect(kept.candidate().toJson().proposedTags).toEqual(["nuovo-tag"]);
  });
});

describe("extractFrom", () => {
  test("throws when the vocabulary is empty", async () => {
    await expect(X.extractFrom(target, [], extractor)).rejects.toThrow("extractFrom: the vocabulary is not empty");
  });

  test("one good reply keeps the note and the rule", async () => {
    queue.push({ text: JSON.stringify({ notes: [note], rules: [rule] }) });
    const result = await X.extractFrom(target, VOCABULARY, extractor);
    expect(result.answer.isOk()).toBe(true);
    expect(seen.length).toBe(1);
    expect(result.notes.length).toBe(1);
    expect(result.rules.length).toBe(1);
    const messages = seen[0].messages;
    expect(messages.find((one) => one.role === "system")?.content).toBe("You extract notes.");
    expect(messages.find((one) => one.role === "user")?.content).toBe(X.extractionPrompt(target, VOCABULARY, extractor));
  });

  test("a bad reply is retried with the error", async () => {
    queue.push({ text: '{"notes": []}' });
    queue.push({ text: JSON.stringify({ notes: [note], rules: [] }) });
    const result = await X.extractFrom(target, VOCABULARY, extractor);
    expect(result.answer.isOk()).toBe(true);
    expect(seen.length).toBe(2);
    expect(result.notes.length).toBe(1);
    expect(result.rules.length).toBe(0);
    const users = seen[1].messages.filter((one) => one.role === "user");
    expect(users[users.length - 1].content).toContain("need lists `notes` and `rules`");
  });

  test("two bad replies fail the answer, with no candidate", async () => {
    queue.push({ text: '{"notes": []}' });
    queue.push({ text: '{"notes": []}' });
    const result = await X.extractFrom(target, VOCABULARY, extractor);
    expect(result.answer.isOk()).toBe(false);
    expect(seen.length).toBe(2);
    expect(result.notes.length).toBe(0);
    expect(result.rules.length).toBe(0);
  });

  test("an http error fails the answer without retry", async () => {
    queue.push({ status: 400 });
    const result = await X.extractFrom(target, VOCABULARY, extractor);
    expect(result.answer.isOk()).toBe(false);
    expect(seen.length).toBe(1);
    expect(result.notes.length).toBe(0);
    expect(result.rules.length).toBe(0);
  });
});

describe("loadVocabulary", () => {
  test("throws when size is not a positive integer", async () => {
    await expect(X.loadVocabulary(0)).rejects.toThrow("loadVocabulary: size is a positive integer, got=0");
    await expect(X.loadVocabulary(-1)).rejects.toThrow("loadVocabulary: size is a positive integer, got=-1");
    await expect(X.loadVocabulary(2.5)).rejects.toThrow("loadVocabulary: size is a positive integer, got=2.5");
  });

  test("the most frequent tags first, at most size", async () => {
    expect(await X.loadVocabulary(1)).toEqual(["b"]);
    expect(await X.loadVocabulary(2)).toEqual(["b", "a"]);
    expect(await X.loadVocabulary(80)).toEqual(["b", "a", "c"]);
  });
});