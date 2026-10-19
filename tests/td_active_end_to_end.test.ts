// Integration net for td active mode: one session through the whole pipeline on stubs,
// then a look at what the stores hold. The unit tests cannot tell a save from a failure; this one can.

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
const { Extractor } = await import("../tools/td/src/config.ts");
const { addEntry } = await import("../tools/ti/src/identity.ts");
const { neighboursOf } = await import("../tools/td/src/neighbours.ts");
const { NoteCandidate, RuleCandidate } = await import("../tools/td/src/candidate.ts");
const { closeExchanges } = await import("../tools/td/src/save.ts");
const { SessionList } = await import("../tools/td/src/novelty.ts");
const { SessionMap } = await import("../tools/td/src/episodes.ts");
const { targetOf } = await import("../tools/td/src/extraction.ts");
const { Version } = await import("../tools/td/src/registry.ts");

const NOW = new Date("2026-10-11T10:00:00.000Z");
const seed = await createNote({ what: "Una nota di partenza sul cervello", why: "Dà il vocabolario dei tag", kind: "dato", tags: ["architettura", "memoria", "qualità"] });

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
let sessionNo = 0;
function freshSession(count = 2, repeatUser = false) {
  sessionNo += 1;
  const session = `e2e00000-0000-4000-8000-${String(sessionNo).padStart(12, "0")}`;
  db.upsertSession(tl.handle, { id: session, started: NOW.toISOString() });
  const pairs = repeatUser
    ? Array.from({ length: count }, () => `${USER}|${AGENT}`)
    : ["ciao|Ciao.", `${USER}|${AGENT}`, ...Array.from({ length: Math.max(0, count - 2) }, (_, k) => `altro${k}|Altro${k}.`)];
  const turns = pairs.slice(0, Math.max(count, 2)).map((pair) => {
    const [input, output] = pair.split("|");
    seq += 1;
    const id = exchangeId(session, `message-${seq}`);
    const exchange = { id, session, timestamp: new Date(Date.UTC(2026, 0, 1) + seq * 1000).toISOString(), kind: "chat" as const, actor: "alfredo" };
    db.upsertExchange(tl.handle, exchange);
    const contents = { exchange_id: id, input, output };
    db.upsertContents(tl.handle, contents);
    return Turn.of(exchange, contents);
  });
  return { session, turns, read: SessionRead.of(session, turns) };
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
const KEEPS_NOTE = `{"is_textbook_definition":0.1}`;
const KEEPS_RULE = `{"is_user_rejection":0.9}`;
const NEW_NEW = `{"verdicts":[{"cand":0,"verdict":"new"},{"cand":1,"verdict":"new"}]}`;
const EXTENDS_NEW = `{"verdicts":[{"cand":0,"verdict":"extends","of":0,"adds":"aggiunge il coseno","adds_is_new_idea":true},{"cand":1,"verdict":"new"}]}`;
const NOT_JSON = "not json";

function enqueue(...texts: string[]) {
  model.queue.push(...texts);
}

function notesStored() {
  return [...(memory.collections.get("third-brain")?.values() ?? [])].map((p) => p.payload as { what: string; exchange?: string; refs: { id: string; reason: string }[] });
}

function entriesStored() {
  return [...(memory.collections.get("pi_identity")?.values() ?? [])].map((p) => p.payload as { if: string; exchange?: string });
}

function distilledOf(turns: readonly { id(): string }[]) {
  return turns.map((t) => db.getExchange(tl.handle, t.id())?.distilled ?? null);
}

describe("active mode on stubs", () => {
  test("saves a note and a rule, links them to the exchange and closes the session", async () => {
    const { read, turns } = freshSession();
    const notesBefore = notesStored().length;
    const entriesBefore = entriesStored().length;
    const distiller = await D.distillerOf(version, NOW, "active");
    enqueue(SPLIT, NOTHING, BOTH, KEEPS_NOTE, KEEPS_RULE, NEW_NEW);
    const report = await D.distillSession(distiller, read);
    const target = turns[1].id();
    expect(report.failures).toEqual([]);
    expect(notesStored().length).toBe(notesBefore + 1);
    expect(notesStored().find((n) => n.what === note.what)).toMatchObject({ exchange: target });
    expect(entriesStored().length).toBe(entriesBefore + 1);
    expect(entriesStored().find((e) => e.if === rule.if)).toMatchObject({ exchange: target });
    expect(distilledOf(turns)).toEqual([distiller.recorder.run(), distiller.recorder.run()]);
    const saved = db.listExtractions(tl.handle, { run: distiller.recorder.run() }).filter((r: { saved_id: string | null }) => r.saved_id !== null);
    expect(saved.length).toBe(2);
  });

  test("extends draws a ref from the new note to the one it extends", async () => {
    const { read } = freshSession();
    const distiller = await D.distillerOf(version, NOW, "active");
    enqueue(SPLIT, NOTHING, BOTH, KEEPS_NOTE, KEEPS_RULE, EXTENDS_NEW);
    await D.distillSession(distiller, read);
    const created = notesStored().filter((n) => n.what === note.what).at(-1)!;
    expect(created.refs.map((r) => r.reason)).toContain("aggiunge il coseno");
  });

  test("shadow writes nothing to the stores and closes nothing", async () => {
    const { read, turns } = freshSession();
    const notesBefore = notesStored().length;
    const entriesBefore = entriesStored().length;
    const distiller = await D.distillerOf(version, NOW, "shadow");
    enqueue(SPLIT, NOTHING, BOTH, KEEPS_NOTE, KEEPS_RULE, NEW_NEW);
    await D.distillSession(distiller, read);
    expect(notesStored().length).toBe(notesBefore);
    expect(entriesStored().length).toBe(entriesBefore);
    expect(distilledOf(turns)).toEqual([null, null]);
  });

  test("a failed novelty call writes nothing and leaves the session open", async () => {
    const { read, turns } = freshSession();
    const notesBefore = notesStored().length;
    const distiller = await D.distillerOf(version, NOW, "active");
    enqueue(SPLIT, NOTHING, BOTH, KEEPS_NOTE, KEEPS_RULE, NOT_JSON, NOT_JSON);
    const report = await D.distillSession(distiller, read);
    expect(report.failures.length).toBeGreaterThan(0);
    expect(notesStored().length).toBe(notesBefore);
    expect(distilledOf(turns)).toEqual([null, null]);
  });

  test("the cap stops the second write and leaves the session open", async () => {
    const { read, turns } = freshSession();
    const distiller = await D.distillerOf(version, NOW, "active", 1);
    enqueue(SPLIT, NOTHING, BOTH, KEEPS_NOTE, KEEPS_RULE, NEW_NEW);
    const report = await D.distillSession(distiller, read);
    expect(distiller.budget.spent()).toBe(1);
    expect(report.failures.some((f: string) => f.startsWith("cap:"))).toBe(true);
    expect(distilledOf(turns)).toEqual([null, null]);
  });

  test("active writes the episodes of the session with their dates and exchanges", async () => {
    const { read, turns } = freshSession();
    const distiller = await D.distillerOf(version, NOW, "active");
    enqueue(SPLIT, NOTHING, BOTH, KEEPS_NOTE, KEEPS_RULE, NEW_NEW);
    await D.distillSession(distiller, read);
    const stored = [...(memory.collection("tl_episodes")?.values() ?? [])].map((p) => p.payload as { session: string; exchanges: string[]; from: string; to: string; summary: string });
    const mine = stored.filter((e) => e.session === read.session());
    expect(mine.length).toBe(1);
    expect(mine[0]).toMatchObject({ exchanges: turns.map((t) => t.id()), from: turns[0].timestamp(), to: turns[1].timestamp(), summary: "saluto e regola sul log" });
  });

  test("shadow writes no episode", async () => {
    const { read } = freshSession();
    const before = memory.collection("tl_episodes")?.size ?? 0;
    const distiller = await D.distillerOf(version, NOW, "shadow");
    enqueue(SPLIT, NOTHING, BOTH, KEEPS_NOTE, KEEPS_RULE, NEW_NEW);
    await D.distillSession(distiller, read);
    expect(memory.collection("tl_episodes")?.size ?? 0).toBe(before);
  });

  test("an episode store that is down is a failure and the session stays open", async () => {
    const { read, turns } = freshSession();
    const distiller = await D.distillerOf(version, NOW, "active");
    enqueue(SPLIT, NOTHING, BOTH, KEEPS_NOTE, KEEPS_RULE, NEW_NEW);
    memory.failPath("/collections/tl_episodes");
    const report = await D.distillSession(distiller, read);
    expect(report.failures.some((f: string) => f.startsWith("episodes: "))).toBe(true);
    expect(distilledOf(turns)).toEqual([null, null]);
  });

  test("distilling the same session again leaves the same episodes", async () => {
    const { read } = freshSession();
    for (let round = 0; round < 2; round++) {
      const distiller = await D.distillerOf(version, NOW, "active");
      enqueue(SPLIT, NOTHING, BOTH, KEEPS_NOTE, KEEPS_RULE, NEW_NEW);
      await D.distillSession(distiller, read);
    }
    const stored = [...(memory.collection("tl_episodes")?.values() ?? [])].filter((p) => (p.payload as { session: string }).session === read.session());
    expect(stored.length).toBe(1);
  });

  test("a store that is down is a failure and the session stays open", async () => {
    const { read, turns } = freshSession();
    const distiller = await D.distillerOf(version, NOW, "active");
    enqueue(SPLIT, NOTHING, BOTH, KEEPS_NOTE, KEEPS_RULE, NEW_NEW);
    memory.failPath("/points");
    const report = await D.distillSession(distiller, read);
    expect(report.failures.length).toBeGreaterThan(0);
    expect(distilledOf(turns)).toEqual([null, null]);
  });
});


const NOTE_NEWTAG = { ...note, what: "Una soglia troppo alta nasconde le contraddizioni tra note", tags: ["architettura", "tag-nuovo"] };
const NEW_ONLY = `{"verdicts":[{"cand":0,"verdict":"new"}]}`;

function verdictOf(verdict: string) {
  return { cand: 0, verdict, of: verdict === "new" ? null : "x", adds: null, reason: null, do: verdict === "append" ? "x" : null };
}

const NOTE_ONLY_JSON = JSON.stringify({ notes: [note], rules: [] });
const SPLIT_ALL = (last: number) => `{"episodes":[{"from":0,"to":${last},"summary":"saluto e regola sul log"}]}`;

describe("the same-session cutoff", () => {
  test("a candidate that says again a saved item is a duplicate and the judge is not asked", async () => {
    const { read, turns } = freshSession(2, true);
    const notesBefore = notesStored().length;
    const distiller = await D.distillerOf(version, NOW, "active", null, null, 0.8);
    enqueue(SPLIT, NOTE_ONLY_JSON, KEEPS_NOTE, NEW_ONLY, NOTE_ONLY_JSON, KEEPS_NOTE);
    const report = await D.distillSession(distiller, read);
    expect(report.failures).toEqual([]);
    expect(model.queue.length).toBe(0);
    expect(notesStored().length).toBe(notesBefore + 1);
    const second = report.exchanges[1].decision.verdicts[0];
    expect(second.verdict).toBe("duplicate");
    expect(second.of).toBe(report.exchanges[0].decision.saves[0].savedId);
    expect(distilledOf(turns)).toEqual([distiller.recorder.run(), distiller.recorder.run()]);
  });

  test("without a cutoff the judge is asked and the note is saved again", async () => {
    const { read } = freshSession(2, true);
    const notesBefore = notesStored().length;
    const distiller = await D.distillerOf(version, NOW, "active", null, null, null);
    enqueue(SPLIT, NOTE_ONLY_JSON, KEEPS_NOTE, NEW_ONLY, NOTE_ONLY_JSON, KEEPS_NOTE, NEW_ONLY);
    await D.distillSession(distiller, read);
    expect(model.queue.length).toBe(0);
    expect(notesStored().length).toBe(notesBefore + 2);
  });

  test("a twin does not take a place of the cap per session", async () => {
    const { read } = freshSession(3, true);
    const distiller = await D.distillerOf(version, NOW, "active", null, 2, 0.8);
    enqueue(SPLIT_ALL(2), NOTE_ONLY_JSON, KEEPS_NOTE, NEW_ONLY, NOTE_ONLY_JSON, KEEPS_NOTE, NOTE_ONLY_JSON, KEEPS_NOTE);
    const report = await D.distillSession(distiller, read);
    expect(report.failures).toEqual([]);
    expect(model.queue.length).toBe(0);
  });
});

describe("the cap per session", () => {
  test("a full session sends no later exchange to the model and still closes", async () => {
    const { read, turns } = freshSession(3);
    const notesBefore = notesStored().length;
    const distiller = await D.distillerOf(version, NOW, "active", null, 1);
    enqueue(SPLIT_ALL(2), NOTHING, NOTE_ONLY_JSON, KEEPS_NOTE, NEW_ONLY);
    const report = await D.distillSession(distiller, read);
    expect(report.failures).toEqual([]);
    expect(notesStored().length).toBe(notesBefore + 1);
    expect(model.queue.length).toBe(0);
    expect(distilledOf(turns)).toEqual([distiller.recorder.run(), distiller.recorder.run(), distiller.recorder.run()]);
  });

  test("inside one exchange the candidates over the cap keep their verdict and are not saved", async () => {
    const { read, turns } = freshSession();
    const notesBefore = notesStored().length;
    const entriesBefore = entriesStored().length;
    const distiller = await D.distillerOf(version, NOW, "active", null, 1);
    enqueue(SPLIT, NOTHING, BOTH, KEEPS_NOTE, KEEPS_RULE, NEW_NEW);
    const report = await D.distillSession(distiller, read);
    expect(report.failures).toEqual([]);
    expect(notesStored().length).toBe(notesBefore + 1);
    expect(entriesStored().length).toBe(entriesBefore);
    expect(distilledOf(turns)).toEqual([distiller.recorder.run(), distiller.recorder.run()]);
  });

  test("shadow simulates the cap and writes nothing", async () => {
    const { read, turns } = freshSession(3);
    const notesBefore = notesStored().length;
    const distiller = await D.distillerOf(version, NOW, "shadow", null, 1);
    enqueue(SPLIT_ALL(2), NOTHING, NOTE_ONLY_JSON, KEEPS_NOTE, NEW_ONLY);
    await D.distillSession(distiller, read);
    expect(model.queue.length).toBe(0);
    expect(notesStored().length).toBe(notesBefore);
    expect(distilledOf(turns)).toEqual([null, null, null]);
  });

  test("no cap sends every exchange to the model", async () => {
    const { read } = freshSession(3);
    const distiller = await D.distillerOf(version, NOW, "shadow", null, null);
    enqueue(SPLIT_ALL(2), NOTHING, NOTE_ONLY_JSON, KEEPS_NOTE, NEW_ONLY, NOTHING);
    await D.distillSession(distiller, read);
    expect(model.queue.length).toBe(0);
  });
});

describe("the gaps the mutants found", () => {
  test("the neighbour search leaves no hit on the notes it reads", async () => {
    const candidate = NoteCandidate.fromModel(note)!;
    await neighboursOf(candidate, 5);
    expect((memory.collections.get("third-brain")!.get(seed.id)!.payload as { hits?: number }).hits).toBeUndefined();
  });

  test("a rule search returns at most topK entries", async () => {
    for (const k of [1, 2, 3]) await addEntry(`Se la prova numero ${k} fallisce`, "guarda il log", ["qualità"]);
    await neighboursOf(RuleCandidate.fromModel(rule)!, 2);
  });

  test("a tag the vocabulary does not know is saved with the note", async () => {
    const { read } = freshSession();
    const distiller = await D.distillerOf(version, NOW, "active");
    enqueue(SPLIT, NOTHING, JSON.stringify({ notes: [NOTE_NEWTAG], rules: [] }), KEEPS_NOTE, NEW_ONLY);
    await D.distillSession(distiller, read);
    const saved = (memory.collections.get("third-brain")!.values() as Iterable<{ payload: { what: string; tags: string[] } }>);
    expect([...saved].find((p) => p.payload.what === NOTE_NEWTAG.what)?.payload.tags).toContain("tag-nuovo");
  });

  test("closeExchanges marks every exchange and answers null", async () => {
    const { turns } = freshSession();
    expect(await closeExchanges(turns.map((t: { id(): string }) => t.id()), "2026-10-11T12:00:00.000Z")).toBeNull();
    expect(distilledOf(turns)).toEqual(["2026-10-11T12:00:00.000Z", "2026-10-11T12:00:00.000Z"]);
  });

  test("critic failure is a failure of the exchange", async () => {
    const { read } = freshSession();
    const distiller = await D.distillerOf(version, NOW, "shadow");
    enqueue(SPLIT, NOTHING, JSON.stringify({ notes: [note], rules: [] }), NOT_JSON, NOT_JSON);
    const report = await D.distillSession(distiller, read);
    expect(report.exchanges[1].decision.failures).toContain("critic failed");
  });

  test("session noise is closed with the turns", async () => {
    const { session, turns } = freshSession();
    seq += 1;
    const noiseId = exchangeId(session, `message-${seq}`);
    const noise = { id: noiseId, session, timestamp: new Date(Date.UTC(2026, 0, 1) + seq * 1000).toISOString(), kind: "chat" as const, actor: "alfredo", meta: { trigger: "task-notification" } };
    db.upsertExchange(tl.handle, noise);
    const contents = { exchange_id: noiseId, input: "notifica", output: "ok" };
    db.upsertContents(tl.handle, contents);
    const read = SessionRead.of(session, [...turns, Turn.of(noise, contents)]);
    const distiller = await D.distillerOf(version, NOW, "active");
    enqueue(SPLIT, NOTHING, NOTHING);
    const split = await SessionMap.split(read, distiller.extractor);
    const exchanges = [];
    for (const index of [0, 1]) {
      const target = targetOf(split.map!, split.map!.episodes()[0], index);
      exchanges.push(await D.decideTarget(distiller, target, await D.distillTarget(distiller, target), SessionList.empty()));
    }
    const closing = await D.closeSession(distiller, read, split, exchanges);
    expect(closing.closed.length).toBe(3);
    expect(db.getExchange(tl.handle, noiseId)?.distilled).toBe(distiller.recorder.run());
  });
});

describe("what joins the session list", () => {
  const table: [string, string, number][] = [
    ["new", "new", 2],
    ["extends", "new", 2],
    ["contradicts", "new", 2],
    ["duplicate", "duplicate", 0],
    ["ref_only", "append", 0],
  ];
  for (const [noteVerdict, ruleVerdict, size] of table) {
    test(`note ${noteVerdict} and rule ${ruleVerdict} leave ${size} in the list`, async () => {
      const { read } = freshSession();
      const distiller = await D.distillerOf(version, NOW, "shadow");
      enqueue(SPLIT, BOTH, KEEPS_NOTE, KEEPS_RULE);
      const split = await SessionMap.split(read, distiller.extractor);
      const target = targetOf(split.map!, split.map!.episodes()[0], 1);
      const report = await D.distillTarget(distiller, target);
      const judgeables = D.judgeablesOf(report);
      const verdicts = [{ ...verdictOf(noteVerdict), cand: 0 }, { ...verdictOf(ruleVerdict), cand: 1 }];
      const list = SessionList.empty();
      await D.decideItems(distiller, report.turn.id(), report.outcomes, judgeables, verdicts, list);
      expect(list.size()).toBe(size);
    });
  }
});


describe("a session that comes back with more exchanges", () => {
  function reopenedSession() {
    const { session, turns } = freshSession(4);
    return { session, turns, read: SessionRead.of(session, turns.slice(2), turns.slice(0, 2)) };
  }

  test("the episodes cover the whole session and only the pending exchanges are extracted", async () => {
    const { read, turns } = reopenedSession();
    const distiller = await D.distillerOf(version, NOW, "active");
    enqueue(SPLIT_ALL(3), NOTHING, NOTHING);
    const report = await D.distillSession(distiller, read);
    const stored = [...(memory.collection("tl_episodes")?.values() ?? [])].map((p) => p.payload as { session: string; exchanges: string[] });
    expect(report.failures).toEqual([]);
    expect(model.queue.length).toBe(0);
    expect(stored.filter((e) => e.session === read.session()).flatMap((e) => e.exchanges)).toEqual(turns.map((t) => t.id()));
    expect(report.exchanges.map((e: { turn: { id(): string } }) => e.turn.id())).toEqual(turns.slice(2).map((t) => t.id()));
  });

  test("a second run replaces the episodes of the first with the whole session", async () => {
    const { session, turns } = freshSession(4);
    const first = SessionRead.of(session, turns.slice(0, 2));
    await D.distillSession(await D.distillerOf(version, NOW, "active"), (enqueue(SPLIT_ALL(1), NOTHING, NOTHING), first));
    const second = SessionRead.of(session, turns.slice(2), turns.slice(0, 2));
    await D.distillSession(await D.distillerOf(version, NOW, "active"), (enqueue(SPLIT_ALL(3), NOTHING, NOTHING), second));
    const mine = [...(memory.collection("tl_episodes")?.values() ?? [])].map((p) => p.payload as { session: string; exchanges: string[] }).filter((e) => e.session === session);
    expect(mine.map((e) => e.exchanges)).toEqual([turns.map((t) => t.id())]);
  });

  test("a failed split leaves the episodes of the first run where they are", async () => {
    const { session, turns } = freshSession(4);
    const first = SessionRead.of(session, turns.slice(0, 2));
    await D.distillSession(await D.distillerOf(version, NOW, "active"), (enqueue(SPLIT_ALL(1), NOTHING, NOTHING), first));
    const second = SessionRead.of(session, turns.slice(2), turns.slice(0, 2));
    enqueue(NOT_JSON, NOT_JSON, NOT_JSON);
    await D.distillSession(await D.distillerOf(version, NOW, "active"), second);
    model.queue.length = 0;
    const mine = [...(memory.collection("tl_episodes")?.values() ?? [])].map((p) => p.payload as { session: string; exchanges: string[] }).filter((e) => e.session === session);
    expect(mine.map((e) => e.exchanges)).toEqual([turns.slice(0, 2).map((t) => t.id())]);
  });
});
