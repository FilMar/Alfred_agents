// Tests for the active-mode functions of tools/td/src/distiller.ts and pendingSessions use.
// Bare calls on valid input: the contract asserts inside the modules are the oracle.
// The only own expects are the outcome table of sessionFailures and the panic messages of preconditions.

import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { startMemoryStubs, startModelStub, startTlStub } from "./helpers/td_stubs.ts";

const memory = startMemoryStubs();
const model = startModelStub();
const tl = startTlStub();
afterAll(() => { memory.stop(); model.stop(); tl.stop(); });
beforeEach(() => { model.queue.length = 0; memory.failPath(null); });

const db = await import("../tools/tl/src/db.ts");
const { exchangeId } = await import("../tools/tl/src/types.ts");
const { createNote } = await import("../tools/tb/src/notes.ts");
const D = await import("../tools/td/src/distiller.ts");
const { Turn, SessionRead } = await import("../tools/td/src/session.ts");
const { SessionMap } = await import("../tools/td/src/episodes.ts");
const { Extractor } = await import("../tools/td/src/config.ts");
const { Version } = await import("../tools/td/src/registry.ts");
const { targetOf } = await import("../tools/td/src/extraction.ts");
const { SessionList } = await import("../tools/td/src/novelty.ts");

const NOW = new Date("2026-10-11T10:00:00.000Z");
const SESSION = "5e5a0001-0000-4000-8000-000000000001";
const OTHER = "5e5a0002-0000-4000-8000-000000000002";
db.upsertSession(tl.handle, { id: SESSION, started: NOW.toISOString() });
db.upsertSession(tl.handle, { id: OTHER, started: NOW.toISOString() });

await createNote({ what: "Una nota di partenza sul cervello", why: "Dà il vocabolario dei tag", kind: "dato", tags: ["architettura", "memoria", "qualità"] });

const connection = {
  provider: "ollama", id: "glm-5.3-flash", api: "openai-completions",
  baseUrl: `http://localhost:${model.port}/v1`, reasoning: true,
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
function turnIn(session: string, input: string, output: string) {
  seq += 1;
  const id = exchangeId(session, `message-${seq}`);
  const exchange = { id, session, timestamp: new Date(Date.UTC(2026, 0, 1) + seq * 1000).toISOString(), kind: "chat" as const, actor: "alfredo" };
  db.upsertExchange(tl.handle, exchange);
  const contents = { exchange_id: id, input, output };
  db.upsertContents(tl.handle, contents);
  return Turn.of(exchange, contents);
}

function subtaskIn(session: string, output: string) {
  seq += 1;
  const id = exchangeId(session, `message-${seq}`);
  const exchange = { id, session, timestamp: new Date(Date.UTC(2026, 0, 1) + seq * 1000).toISOString(), kind: "subtask" as const, actor: "black-core" };
  db.upsertExchange(tl.handle, exchange);
  const contents = { exchange_id: id, input: "Write the tests.", output };
  db.upsertContents(tl.handle, contents);
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

const SPLIT = `{"episodes":[{"from":0,"to":1,"summary":"saluto e regola sul log"}]}`;
const NOTHING = `{"notes":[],"rules":[]}`;
const BOTH = JSON.stringify({ notes: [note], rules: [rule] });
const NOTE_ONLY = JSON.stringify({ notes: [note], rules: [] });
const KEEPS_NOTE = `{"is_textbook_definition":0.1}`;
const KEEPS_RULE = `{"is_user_rejection":0.9}`;
const NOT_JSON = "not json";
const NEW_NEW = `{"verdicts":[{"cand":0,"verdict":"new"},{"cand":1,"verdict":"new"}]}`;
const NEW_ONLY = `{"verdicts":[{"cand":0,"verdict":"new"}]}`;
const DUPLICATES = `{"verdicts":[{"cand":0,"verdict":"duplicate","of":0},{"cand":1,"verdict":"duplicate","of":1}]}`;
const EXTENDS = `{"verdicts":[{"cand":0,"verdict":"extends","of":0,"adds":"aggiunge il coseno","adds_is_new_idea":true}]}`;
const CONTRADICTS = `{"verdicts":[{"cand":0,"verdict":"contradicts","of":0,"reason":"dice il contrario"}]}`;

function enqueue(...texts: string[]) {
  model.queue.push(...texts);
}

function readOfTwoTurns(session = SESSION) {
  return SessionRead.of(session, [turnIn(session, "ciao", "Ciao."), turnIn(session, USER, AGENT)]);
}

function secondTurnTarget() {
  const read = readOfTwoTurns();
  const map = SessionMap.fromJson({ episodes: [{ from: 0, to: 1, summary: "s" }] }, read);
  return { read, target: targetOf(map, map.episodes()[0], 1) };
}

async function reportOfBoth(distiller: Awaited<ReturnType<typeof D.distillerOf>>) {
  const { target } = secondTurnTarget();
  enqueue(BOTH, KEEPS_NOTE, KEEPS_RULE);
  return { target, report: await D.distillTarget(distiller, target) };
}

describe("judgeablesOf", () => {
  test("lists the open and judged outcomes in order", async () => {
    const distiller = await D.distillerOf(version, NOW);
    const { report } = await reportOfBoth(distiller);
    D.judgeablesOf(report);
  });

  test("a failed extraction has no judgeable", async () => {
    const distiller = await D.distillerOf(version, NOW);
    const { target } = secondTurnTarget();
    enqueue(NOT_JSON, NOT_JSON);
    D.judgeablesOf(await D.distillTarget(distiller, target));
  });

  test("a candidate whose critic failed is not a judgeable", async () => {
    const distiller = await D.distillerOf(version, NOW);
    const { target } = secondTurnTarget();
    enqueue(NOTE_ONLY, NOT_JSON, NOT_JSON);
    D.judgeablesOf(await D.distillTarget(distiller, target));
  });
});

describe("knownFor", () => {
  const neighbour = (id: string) => ({ id, kind: "note" as const, text: `testo ${id}` });
  const listed = { key: "session:0", kind: "note" as const, text: "già salvato" };

  test("drops a repeated neighbour and puts the session items last", () => {
    D.knownFor([neighbour("a"), neighbour("b"), neighbour("a")], [listed]);
  });

  test("works with no neighbour and no session item", () => {
    D.knownFor([], []);
  });
});

describe("sessionFailures", () => {
  test("outcome table", async () => {
    const distiller = await D.distillerOf(version, NOW);
    const { read, target } = secondTurnTarget();
    const goodSplit = { map: SessionMap.fromJson({ episodes: [{ from: 0, to: 1, summary: "s" }] }, read) } as never;
    const badSplit = { map: null } as never;
    enqueue(BOTH, KEEPS_NOTE, KEEPS_RULE);
    const clean = await D.distillTarget(distiller, target);
    enqueue(NOT_JSON, NOT_JSON);
    const failedExtraction = await D.distillTarget(distiller, target);
    const failedDecision = { ...clean, decision: { ...clean.decision, failures: ["novelty: bad"] } };
    expect(D.sessionFailures(goodSplit, [clean])).toEqual([]);
    expect(D.sessionFailures(badSplit, [])).toEqual(["split failed"]);
    expect(D.sessionFailures(goodSplit, [failedExtraction])).toEqual([`extraction failed: ${failedExtraction.turn.id()}`]);
    expect(D.sessionFailures(goodSplit, [failedDecision])).toEqual(["novelty: bad"]);
  });
});

describe("decideItems", () => {
  function itemsOf(distiller: Awaited<ReturnType<typeof D.distillerOf>>, report: Awaited<ReturnType<typeof D.distillTarget>>) {
    const judgeables = D.judgeablesOf(report);
    return { judgeables, outcomes: report.outcomes };
  }

  test("shadow records the verdicts and saves nothing", async () => {
    const distiller = await D.distillerOf(version, NOW, "shadow");
    const { report } = await reportOfBoth(distiller);
    const { judgeables, outcomes } = itemsOf(distiller, report);
    const verdicts = [{ cand: 0, verdict: "new", of: null, adds: null, reason: null, do: null }, { cand: 1, verdict: "new", of: null, adds: null, reason: null, do: null }];
    await D.decideItems(distiller, report.turn.id(), outcomes, judgeables, verdicts, SessionList.empty());
  });

  test("active saves a new note and a new rule", async () => {
    const distiller = await D.distillerOf(version, NOW, "active");
    const { report } = await reportOfBoth(distiller);
    const { judgeables, outcomes } = itemsOf(distiller, report);
    const verdicts = [{ cand: 0, verdict: "new", of: null, adds: null, reason: null, do: null }, { cand: 1, verdict: "new", of: null, adds: null, reason: null, do: null }];
    await D.decideItems(distiller, report.turn.id(), outcomes, judgeables, verdicts, SessionList.empty());
  });

  test("active writes nothing for a duplicate", async () => {
    const distiller = await D.distillerOf(version, NOW, "active");
    const { report } = await reportOfBoth(distiller);
    const { judgeables, outcomes } = itemsOf(distiller, report);
    const verdicts = [{ cand: 0, verdict: "duplicate", of: "x", adds: null, reason: null, do: null }, { cand: 1, verdict: "duplicate", of: "y", adds: null, reason: null, do: null }];
    await D.decideItems(distiller, report.turn.id(), outcomes, judgeables, verdicts, SessionList.empty());
  });

  test("a spent budget leaves a failure and writes nothing more", async () => {
    const distiller = await D.distillerOf(version, NOW, "active", 1);
    const { report } = await reportOfBoth(distiller);
    const { judgeables, outcomes } = itemsOf(distiller, report);
    const verdicts = [{ cand: 0, verdict: "new", of: null, adds: null, reason: null, do: null }, { cand: 1, verdict: "new", of: null, adds: null, reason: null, do: null }];
    await D.decideItems(distiller, report.turn.id(), outcomes, judgeables, verdicts, SessionList.empty());
  });

  test("a broken store is a failure, not a throw", async () => {
    const distiller = await D.distillerOf(version, NOW, "active");
    const { report } = await reportOfBoth(distiller);
    const { judgeables, outcomes } = itemsOf(distiller, report);
    const verdicts = [{ cand: 0, verdict: "new", of: null, adds: null, reason: null, do: null }, { cand: 1, verdict: "new", of: null, adds: null, reason: null, do: null }];
    memory.failPath("/points");
    await D.decideItems(distiller, report.turn.id(), outcomes, judgeables, verdicts, SessionList.empty());
  });

  test("wants one verdict per judgeable", async () => {
    const distiller = await D.distillerOf(version, NOW);
    const { report } = await reportOfBoth(distiller);
    const { judgeables, outcomes } = itemsOf(distiller, report);
    await expect(D.decideItems(distiller, report.turn.id(), outcomes, judgeables, [], SessionList.empty())).rejects.toThrow("decideItems: one verdict per judgeable");
  });
});

describe("decideTarget", () => {
  test("shadow decides a note and a rule", async () => {
    const distiller = await D.distillerOf(version, NOW, "shadow");
    const { target, report } = await reportOfBoth(distiller);
    enqueue(NEW_NEW);
    await D.decideTarget(distiller, target, report, SessionList.empty());
  });

  test("active decides and saves a note and a rule", async () => {
    const distiller = await D.distillerOf(version, NOW, "active");
    const { target, report } = await reportOfBoth(distiller);
    enqueue(NEW_NEW);
    await D.decideTarget(distiller, target, report, SessionList.empty());
  });

  test("active extends a stored note with a ref", async () => {
    const distiller = await D.distillerOf(version, NOW, "active");
    const { target } = secondTurnTarget();
    enqueue(NOTE_ONLY, KEEPS_NOTE);
    const report = await D.distillTarget(distiller, target);
    enqueue(EXTENDS);
    await D.decideTarget(distiller, target, report, SessionList.empty());
  });

  test("active records a contradiction", async () => {
    const distiller = await D.distillerOf(version, NOW, "active");
    const { target } = secondTurnTarget();
    enqueue(NOTE_ONLY, KEEPS_NOTE);
    const report = await D.distillTarget(distiller, target);
    enqueue(CONTRADICTS);
    await D.decideTarget(distiller, target, report, SessionList.empty());
  });

  test("duplicates decide nothing to write", async () => {
    const distiller = await D.distillerOf(version, NOW, "active");
    const { target, report } = await reportOfBoth(distiller);
    enqueue(DUPLICATES);
    await D.decideTarget(distiller, target, report, SessionList.empty());
  });

  test("a failed extraction has nothing to decide and calls no model", async () => {
    const distiller = await D.distillerOf(version, NOW, "active");
    const { target } = secondTurnTarget();
    enqueue(NOT_JSON, NOT_JSON);
    const report = await D.distillTarget(distiller, target);
    await D.decideTarget(distiller, target, report, SessionList.empty());
  });

  test("a failed critic is a failure and the candidate is not decided", async () => {
    const distiller = await D.distillerOf(version, NOW, "active");
    const { target } = secondTurnTarget();
    enqueue(NOTE_ONLY, NOT_JSON, NOT_JSON);
    const report = await D.distillTarget(distiller, target);
    await D.decideTarget(distiller, target, report, SessionList.empty());
  });

  test("a failed novelty answer is a failure", async () => {
    const distiller = await D.distillerOf(version, NOW, "active");
    const { target, report } = await reportOfBoth(distiller);
    enqueue(NOT_JSON, NOT_JSON);
    await D.decideTarget(distiller, target, report, SessionList.empty());
  });

  test("a broken neighbour search is a failure, not a throw", async () => {
    const distiller = await D.distillerOf(version, NOW, "active");
    const { target, report } = await reportOfBoth(distiller);
    memory.failPath("/points/query");
    await D.decideTarget(distiller, target, report, SessionList.empty());
  });

  test("a session item saved before is a neighbour for the next exchange", async () => {
    const distiller = await D.distillerOf(version, NOW, "shadow");
    const { target, report } = await reportOfBoth(distiller);
    const list = SessionList.empty();
    list.add("note", "Un'idea salvata prima nella sessione", null);
    enqueue(NEW_NEW);
    await D.decideTarget(distiller, target, report, list);
  });

  test("wants a report of the target turn", async () => {
    const distiller = await D.distillerOf(version, NOW);
    const { report } = await reportOfBoth(distiller);
    const { target: other } = secondTurnTarget();
    await expect(D.decideTarget(distiller, other, report, SessionList.empty())).rejects.toThrow("decideTarget: the report is of the target turn");
  });

  test("wants a report not decided yet", async () => {
    const distiller = await D.distillerOf(version, NOW);
    const { target, report } = await reportOfBoth(distiller);
    const decided = { ...report, decision: { answer: null, verdicts: [], saves: [], failures: [] } };
    await expect(D.decideTarget(distiller, target, decided, SessionList.empty())).rejects.toThrow("decideTarget: the report is not decided yet");
  });
});

describe("closeSession", () => {
  async function sessionParts(distiller: Awaited<ReturnType<typeof D.distillerOf>>, replies: string[]) {
    const read = readOfTwoTurns();
    enqueue(SPLIT, ...replies);
    const split = await SessionMap.split(read, distiller.extractor);
    return { read, split };
  }

  test("shadow closes nothing", async () => {
    const distiller = await D.distillerOf(version, NOW, "shadow");
    const { read, split } = await sessionParts(distiller, []);
    await D.closeSession(distiller, read, split, []);
  });

  test("active closes every exchange read when nothing failed", async () => {
    const distiller = await D.distillerOf(version, NOW, "active");
    const { read, split } = await sessionParts(distiller, [NOTHING, NOTHING]);
    const exchanges = [];
    for (const index of [0, 1]) {
      const target = targetOf(split.map!, split.map!.episodes()[0], index);
      exchanges.push(await D.decideTarget(distiller, target, await D.distillTarget(distiller, target), SessionList.empty()));
    }
    await D.closeSession(distiller, read, split, exchanges);
  });

  test("active closes the delegated exchanges with the turns", async () => {
    const distiller = await D.distillerOf(version, NOW, "active");
    const delegated = subtaskIn(SESSION, "The tests are written.");
    const read = SessionRead.of(SESSION, [turnIn(SESSION, "ciao", "Ciao."), turnIn(SESSION, USER, AGENT), delegated]);
    enqueue(SPLIT, NOTHING, NOTHING);
    const split = await SessionMap.split(read, distiller.extractor);
    const exchanges = [];
    for (const index of [0, 1]) {
      const target = targetOf(split.map!, split.map!.episodes()[0], index);
      exchanges.push(await D.decideTarget(distiller, target, await D.distillTarget(distiller, target), SessionList.empty()));
    }
    await D.closeSession(distiller, read, split, exchanges);
  });

  test("active does not close a session with a failed split", async () => {
    const distiller = await D.distillerOf(version, NOW, "active");
    const read = readOfTwoTurns();
    enqueue(NOT_JSON, NOT_JSON);
    const split = await SessionMap.split(read, distiller.extractor);
    await D.closeSession(distiller, read, split, []);
  });

  test("a broken tl is a close failure", async () => {
    const distiller = await D.distillerOf(version, NOW, "active");
    const read = readOfTwoTurns();
    enqueue(SPLIT, NOTHING, NOTHING);
    const split = await SessionMap.split(read, distiller.extractor);
    const exchanges = [];
    for (const index of [0, 1]) {
      const target = targetOf(split.map!, split.map!.episodes()[0], index);
      exchanges.push(await D.decideTarget(distiller, target, await D.distillTarget(distiller, target), SessionList.empty()));
    }
    const missing = SessionRead.of(SESSION, [Turn.of({ id: exchangeId(SESSION, "message-999"), session: SESSION, timestamp: "2026-01-01T00:00:00.000Z", kind: "chat", actor: "alfredo" }, { exchange_id: exchangeId(SESSION, "message-999"), input: "x", output: "y" })]);
    await D.closeSession(distiller, missing, split, exchanges);
  });
});

describe("distillSession in active mode", () => {
  test("saves, records and closes a whole session", async () => {
    const distiller = await D.distillerOf(version, NOW, "active");
    enqueue(SPLIT, NOTHING, BOTH, KEEPS_NOTE, KEEPS_RULE, NEW_NEW);
    await D.distillSession(distiller, readOfTwoTurns());
  });

  test("shadow runs the same session without writing", async () => {
    const distiller = await D.distillerOf(version, NOW, "shadow");
    enqueue(SPLIT, NOTHING, BOTH, KEEPS_NOTE, KEEPS_RULE, NEW_NEW);
    await D.distillSession(distiller, readOfTwoTurns());
  });

  test("a failed novelty call leaves the session open", async () => {
    const distiller = await D.distillerOf(version, NOW, "active");
    enqueue(SPLIT, NOTHING, BOTH, KEEPS_NOTE, KEEPS_RULE, NOT_JSON, NOT_JSON);
    await D.distillSession(distiller, readOfTwoTurns());
  });
});

describe("distillAll", () => {
  test("runs the sessions in order and skips one with nothing pending", async () => {
    const distiller = await D.distillerOf(version, NOW, "shadow");
    turnIn(OTHER, "ciao", "Ciao.");
    turnIn(OTHER, USER, AGENT);
    enqueue(SPLIT, NOTHING, BOTH, KEEPS_NOTE, KEEPS_RULE, NEW_NEW);
    await D.distillAll(distiller, ["s-empty", OTHER]);
  });

  test("stops when the budget is spent", async () => {
    const distiller = await D.distillerOf(version, NOW, "active", 1);
    distiller.budget.take();
    await D.distillAll(distiller, [SESSION, OTHER]);
  });

  test("wants no session twice", async () => {
    const distiller = await D.distillerOf(version, NOW);
    await expect(D.distillAll(distiller, [SESSION, SESSION])).rejects.toThrow("distillAll: no session twice");
  });
});

