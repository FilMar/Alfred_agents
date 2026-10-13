import { afterAll, expect, test } from "vitest";
import { startMemoryStubs, startTlStub } from "./helpers/td_stubs.ts";
import type { Verdict } from "../tools/td/src/novelty.ts";

const memory = startMemoryStubs();
const tl = startTlStub();

const { exchangeId } = await import("../tools/tl/src/types.ts");
const { Budget, actionOf, closeExchanges, saveItem, saveNote, saveRule } = await import("../tools/td/src/save.ts");
const { NoteCandidate, RuleCandidate } = await import("../tools/td/src/candidate.ts");
const { createNote } = await import("../tools/tb/src/notes.ts");
const { addEntry } = await import("../tools/ti/src/identity.ts");
const { upsertExchange, upsertSession } = await import("../tools/tl/src/db.ts");

const SESSION = "2026-10-11-standup";
const NOW = "2026-10-11T10:30:00.000Z";
const RUN = "2026-10-11T11:00:00.000Z";
const EXCHANGE = exchangeId(SESSION, "message-1");
const SECOND = exchangeId(SESSION, "message-2");
const MISSING = exchangeId(SESSION, "message-9");

await upsertSession(tl.handle, { id: SESSION, started: NOW });
await upsertExchange(tl.handle, { id: EXCHANGE, session: SESSION, timestamp: NOW, kind: "chat", actor: "alfredo" });
await upsertExchange(tl.handle, { id: SECOND, session: SESSION, timestamp: NOW, kind: "chat", actor: "alfredo" });
const storedNote = await createNote({ what: "Una nota già nel cervello", why: "Fa da bersaglio per i ref", kind: "attrito", tags: ["architettura"], exchange: EXCHANGE });
const storedEntry = await addEntry("Se piove a Cremona", "Porta l'ombrello", ["meteo"], EXCHANGE);

afterAll(() => {
  memory.stop();
  tl.stop();
});

function noteOf(what: string): NoteCandidate {
  return NoteCandidate.fromModel({ what, why: "Il contratto lo chiede", kind: "attrito", tags: ["architettura"], contexts: ["a", "b"], quote: "Come detto a voce" });
}

function ruleOf(ifText: string): RuleCandidate {
  return RuleCandidate.fromModel({ if: ifText, do: "Non fare il deploy", tags: ["testing"], quote: "Il test era rosso" });
}

function verdictOf(verdict: string, of: string | null = null): Verdict {
  const json: { verdict: string; of: string | null; reason: string | null; do: string | null; adds: string | null } =
    { verdict, of, reason: "Una ragione", do: "Un'azione in più", adds: "Un'aggiunta" };
  return json as Verdict;
}

test("Budget.of rejects a zero cap", () => {
  expect(() => Budget.of(0)).toThrow("Budget.of: max is null or a positive integer, got=0");
});

test("Budget.of rejects a negative cap", () => {
  expect(() => Budget.of(-1)).toThrow("Budget.of: max is null or a positive integer, got=-1");
});

test("Budget.of rejects a non-integer cap", () => {
  expect(() => Budget.of(1.5)).toThrow("Budget.of: max is null or a positive integer, got=1.5");
});

test("Budget.of builds a budget without a cap", () => {
  Budget.of(null);
});

test("Budget.of builds a cap of one", () => {
  Budget.of(1);
});

test("Budget.take takes with room left", () => {
  Budget.of(2).take();
});

test("Budget.take keeps taking without a cap", () => {
  const budget = Budget.of(null);
  budget.take();
  budget.take();
});

test("Budget.take never goes past the cap", () => {
  const budget = Budget.of(1);
  budget.take();
  budget.take();
  budget.take();
});

test("Budget.isSpent: outcome table", () => {
  const withoutCap = Budget.of(null);
  expect(withoutCap.isSpent()).toBe(false);
  withoutCap.take();
  expect(withoutCap.isSpent()).toBe(false);
  const withCap = Budget.of(2);
  expect(withCap.isSpent()).toBe(false);
  withCap.take();
  expect(withCap.isSpent()).toBe(false);
  withCap.take();
  expect(withCap.isSpent()).toBe(true);
});

test("actionOf: outcome table", () => {
  expect(actionOf("note", "new")).toBe("create");
  expect(actionOf("note", "extends")).toBe("create_ref");
  expect(actionOf("note", "contradicts")).toBe("create_ref");
  expect(actionOf("note", "ref_only")).toBe("nothing");
  expect(actionOf("note", "duplicate")).toBe("nothing");
  expect(actionOf("rule", "new")).toBe("add_rule");
  expect(actionOf("rule", "append")).toBe("append_do");
  expect(actionOf("rule", "duplicate")).toBe("nothing");
});

test("actionOf rejects a rule verdict on a note", () => {
  expect(() => actionOf("note", "append")).toThrow("actionOf: the verdict is settled for the kind, kind=note, verdict=append");
});

test("actionOf rejects a note verdict on a rule", () => {
  expect(() => actionOf("rule", "extends")).toThrow("actionOf: the verdict is settled for the kind, kind=rule, verdict=extends");
});

test("actionOf rejects a ref_only verdict on a rule", () => {
  expect(() => actionOf("rule", "ref_only")).toThrow("actionOf: the verdict is settled for the kind, kind=rule, verdict=ref_only");
});

test("saveNote rejects an exchange id that is not one", async () => {
  await expect(saveNote(noteOf("Un attrito appena visto"), verdictOf("new"), "not an id")).rejects.toThrow("saveNote: exchangeId is an exchange id, got=not an id");
});

test("saveNote rejects a duplicate verdict", async () => {
  await expect(saveNote(noteOf("Un attrito appena visto"), verdictOf("duplicate", storedNote.id), EXCHANGE)).rejects.toThrow("saveNote: the verdict writes a note, verdict=duplicate");
});

test("saveNote rejects a ref_only verdict", async () => {
  await expect(saveNote(noteOf("Un attrito appena visto"), verdictOf("ref_only", storedNote.id), EXCHANGE)).rejects.toThrow("saveNote: the verdict writes a note, verdict=ref_only");
});

test("saveNote saves a new note", async () => {
  await saveNote(noteOf("L'attrito fra il piano e la prova"), verdictOf("new"), EXCHANGE);
});

test("saveNote saves a note with a ref to a stored one", async () => {
  await saveNote(noteOf("Una nota che estende una nota tenuta"), verdictOf("extends", storedNote.id), EXCHANGE);
});

test("saveNote saves a note that points at the session list", async () => {
  await saveNote(noteOf("Una nota che estende un item di sessione"), verdictOf("extends", "session:0"), EXCHANGE);
});

test("saveNote turns a broken store into a failure", async () => {
  memory.failPath("/points");
  try {
    await saveNote(noteOf("Una nota che nessuno vedrà"), verdictOf("new"), EXCHANGE);
  } finally {
    memory.failPath(null);
  }
});

test("saveRule rejects an exchange id that is not one", async () => {
  await expect(saveRule(ruleOf("Se il test è rosso"), verdictOf("new"), "not an id")).rejects.toThrow("saveRule: exchangeId is an exchange id, got=not an id");
});

test("saveRule rejects a duplicate verdict", async () => {
  await expect(saveRule(ruleOf("Se il test è rosso"), verdictOf("duplicate", storedEntry.id), EXCHANGE)).rejects.toThrow("saveRule: the verdict writes a rule, verdict=duplicate");
});

test("saveRule saves a new rule", async () => {
  await saveRule(ruleOf("Se la build è verde"), verdictOf("new"), EXCHANGE);
});

test("saveRule appends a do to a stored rule", async () => {
  await saveRule(ruleOf("Se piove a Cremona"), verdictOf("append", storedEntry.id), EXCHANGE);
});

test("saveRule skips a session item", async () => {
  await saveRule(ruleOf("Se la sessione ha l'item"), verdictOf("append", "session:0"), EXCHANGE);
});

test("saveRule turns a broken store into a failure", async () => {
  memory.failPath("/points");
  try {
    await saveRule(ruleOf("Se lo store è rotto"), verdictOf("new"), EXCHANGE);
  } finally {
    memory.failPath(null);
  }
});

test("saveItem rejects an exchange id that is not one", async () => {
  await expect(saveItem(noteOf("Un attrito da decidere"), verdictOf("new"), "not an id", "active")).rejects.toThrow("saveItem: exchangeId is an exchange id, got=not an id");
});

test("saveItem rejects a verdict that is not settled for the kind", async () => {
  await expect(saveItem(noteOf("Un attrito da decidere"), verdictOf("append", storedEntry.id), EXCHANGE, "active")).rejects.toThrow("saveItem: the verdict is settled for the kind, verdict=append");
});

test("saveItem rejects a verdict that does not name its of", async () => {
  await expect(saveItem(noteOf("Un attrito che estende"), verdictOf("extends", null), EXCHANGE, "active")).rejects.toThrow("saveItem: a verdict other than new names an of, verdict=extends");
});

test("saveItem writes nothing in shadow", async () => {
  await saveItem(noteOf("Un attrito in ombra"), verdictOf("new"), EXCHANGE, "shadow");
});

test("saveItem writes nothing for a duplicate", async () => {
  await saveItem(noteOf("Un attrito già visto"), verdictOf("duplicate", storedNote.id), EXCHANGE, "active");
});

test("saveItem saves a note in active", async () => {
  await saveItem(noteOf("Un attrito da salvare"), verdictOf("new"), EXCHANGE, "active");
});

test("saveItem saves a rule in active", async () => {
  await saveItem(ruleOf("Se la regola è nuova"), verdictOf("new"), EXCHANGE, "active");
});

test("saveItem turns a broken store into a failure", async () => {
  memory.failPath("/points");
  try {
    await saveItem(noteOf("Un attrito che non passa"), verdictOf("new"), EXCHANGE, "active");
  } finally {
    memory.failPath(null);
  }
});

test("closeExchanges rejects no exchange", async () => {
  await expect(closeExchanges([], RUN)).rejects.toThrow("closeExchanges: at least one exchange");
});

test("closeExchanges rejects an exchange twice", async () => {
  await expect(closeExchanges([EXCHANGE, EXCHANGE], RUN)).rejects.toThrow("closeExchanges: no exchange twice");
});

test("closeExchanges rejects a run that is not UTC", async () => {
  await expect(closeExchanges([EXCHANGE], "2026-10-11T10:30:00.000")).rejects.toThrow("closeExchanges: the run is an ISO-8601 UTC time, got=2026-10-11T10:30:00.000");
});

test("closeExchanges closes every exchange", async () => {
  await closeExchanges([EXCHANGE, SECOND], RUN);
});

test("closeExchanges reports a missing exchange", async () => {
  await closeExchanges([MISSING], RUN);
});