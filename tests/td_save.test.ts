import { afterAll, expect, test } from "bun:test";
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

function noteOf(what: string): NonNullable<ReturnType<typeof NoteCandidate.fromModel>> {
  return NoteCandidate.fromModel({ what, why: "Il contratto lo chiede", kind: "attrito", tags: ["architettura"], contexts: ["a", "b"], quote: "Come detto a voce" })!;
}

function ruleOf(ifText: string): NonNullable<ReturnType<typeof RuleCandidate.fromModel>> {
  return RuleCandidate.fromModel({ if: ifText, do: "Non fare il deploy", tags: ["testing"], quote: "Il test era rosso" })!;
}

function verdictOf(verdict: string, of: string | null = null): Verdict {
  const json: { verdict: string; of: string | null; reason: string | null; do: string | null; adds: string | null } =
    { verdict, of, reason: "Una ragione", do: "Un'azione in più", adds: "Un'aggiunta" };
  return json as Verdict;
}

const preconditions: [() => unknown, string][] = [
  [() => Budget.of(0), "Budget.of: max is null or a positive integer, got=0"],
  [() => Budget.of(-1), "Budget.of: max is null or a positive integer, got=-1"],
  [() => Budget.of(1.5), "Budget.of: max is null or a positive integer, got=1.5"],
  [() => actionOf("note", "append"), "actionOf: the verdict is settled for the kind, kind=note, verdict=append"],
  [() => actionOf("rule", "extends"), "actionOf: the verdict is settled for the kind, kind=rule, verdict=extends"],
  [() => actionOf("rule", "ref_only"), "actionOf: the verdict is settled for the kind, kind=rule, verdict=ref_only"],
  [() => saveNote(noteOf("Un attrito appena visto"), verdictOf("new"), "not an id"), "saveNote: exchangeId is an exchange id, got=not an id"],
  [() => saveNote(noteOf("Un attrito appena visto"), verdictOf("duplicate", storedNote.id), EXCHANGE), "saveNote: the verdict writes a note, verdict=duplicate"],
  [() => saveNote(noteOf("Un attrito appena visto"), verdictOf("ref_only", storedNote.id), EXCHANGE), "saveNote: the verdict writes a note, verdict=ref_only"],
  [() => saveRule(ruleOf("Se il test è rosso"), verdictOf("new"), "not an id"), "saveRule: exchangeId is an exchange id, got=not an id"],
  [() => saveRule(ruleOf("Se il test è rosso"), verdictOf("duplicate", storedEntry.id), EXCHANGE), "saveRule: the verdict writes a rule, verdict=duplicate"],
  [() => saveItem(noteOf("Un attrito da decidere"), verdictOf("new"), "not an id", "active"), "saveItem: exchangeId is an exchange id, got=not an id"],
  [() => saveItem(noteOf("Un attrito da decidere"), verdictOf("append", storedEntry.id), EXCHANGE, "active"), "saveItem: the verdict is settled for the kind, verdict=append"],
  [() => saveItem(noteOf("Un attrito che estende"), verdictOf("extends", null), EXCHANGE, "active"), "saveItem: a verdict other than new names an of, verdict=extends"],
  [() => closeExchanges([], RUN), "closeExchanges: at least one exchange"],
  [() => closeExchanges([EXCHANGE, EXCHANGE], RUN), "closeExchanges: no exchange twice"],
  [() => closeExchanges([EXCHANGE], "2026-10-11T10:30:00.000"), "closeExchanges: the run is an ISO-8601 UTC time, got=2026-10-11T10:30:00.000"],
];

for (const [call, message] of preconditions) {
  test(`precondition: ${message}`, async () => {
    await expect((async () => call())()).rejects.toThrow(message);
  });
}

const bareCalls: [string, () => unknown][] = [
  ["Budget.of builds a budget without a cap", () => Budget.of(null)],
  ["Budget.of builds a cap of one", () => Budget.of(1)],
  ["Budget.take takes with room left", () => Budget.of(2).take()],
  ["saveNote saves a new note", () => saveNote(noteOf("L'attrito fra il piano e la prova"), verdictOf("new"), EXCHANGE)],
  ["saveNote saves a note with a ref to a stored one", () => saveNote(noteOf("Una nota che estende una nota tenuta"), verdictOf("extends", storedNote.id), EXCHANGE)],
  ["saveNote saves a note that points at the session list", () => saveNote(noteOf("Una nota che estende un item di sessione"), verdictOf("extends", "session:0"), EXCHANGE)],
  ["saveRule saves a new rule", () => saveRule(ruleOf("Se la build è verde"), verdictOf("new"), EXCHANGE)],
  ["saveRule appends a do to a stored rule", () => saveRule(ruleOf("Se piove a Cremona"), verdictOf("append", storedEntry.id), EXCHANGE)],
  ["saveRule skips a session item", () => saveRule(ruleOf("Se la sessione ha l'item"), verdictOf("append", "session:0"), EXCHANGE)],
  ["saveItem writes nothing in shadow", () => saveItem(noteOf("Un attrito in ombra"), verdictOf("new"), EXCHANGE, "shadow")],
  ["saveItem writes nothing for a duplicate", () => saveItem(noteOf("Un attrito già visto"), verdictOf("duplicate", storedNote.id), EXCHANGE, "active")],
  ["saveItem saves a note in active", () => saveItem(noteOf("Un attrito da salvare"), verdictOf("new"), EXCHANGE, "active")],
  ["saveItem saves a rule in active", () => saveItem(ruleOf("Se la regola è nuova"), verdictOf("new"), EXCHANGE, "active")],
  ["closeExchanges closes every exchange", () => closeExchanges([EXCHANGE, SECOND], RUN)],
  ["closeExchanges reports a missing exchange", () => closeExchanges([MISSING], RUN)],
];

for (const [name, call] of bareCalls) {
  test(name, async () => {
    await call();
  });
}

const brokenStore: [string, () => Promise<unknown>][] = [
  ["saveNote", () => saveNote(noteOf("Una nota che nessuno vedrà"), verdictOf("new"), EXCHANGE)],
  ["saveRule", () => saveRule(ruleOf("Se lo store è rotto"), verdictOf("new"), EXCHANGE)],
  ["saveItem", () => saveItem(noteOf("Un attrito che non passa"), verdictOf("new"), EXCHANGE, "active")],
];

for (const [name, call] of brokenStore) {
  test(`${name} turns a broken store into a failure`, async () => {
    memory.failPath("/points");
    try {
      await call();
    } finally {
      memory.failPath(null);
    }
  });
}

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
