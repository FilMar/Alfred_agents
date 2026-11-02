import { describe, expect, test } from "bun:test";

import * as db from "../tools/tl/src/db.ts";
import { createApp } from "../tools/tl/src/api.ts";
import { exchangeId } from "../tools/tl/src/types.ts";
import { Checked, NoteCandidate, RuleCandidate } from "../tools/td/src/candidate.ts";

const NOW = new Date("2026-10-08T10:00:00.000Z");
const SESSION = "session-1";
const EXCHANGE = exchangeId(SESSION, "message-1");

function freshDb() {
  const handle = db.open(":memory:");
  db.upsertSession(handle, { id: SESSION, started: NOW.toISOString() });
  db.upsertExchange(handle, { id: EXCHANGE, session: SESSION, timestamp: NOW.toISOString(), kind: "chat", actor: "alfredo" });
  db.insertExtractor(handle, { parent: null, why: "first", config: "{}", created: NOW.toISOString() });
  return handle;
}

const server = Bun.serve({ port: 0, fetch: createApp(freshDb()).fetch });
process.env.TL_API_URL = `http://localhost:${server.port}`;
const { Outcome, Recorder } = await import("../tools/td/src/recorder.ts");

const noteJson = {
  what: "Il distillatore scrive una riga per candidato",
  why: "Gli scarti servono a muovere le soglie",
  kind: "dato",
  tags: ["memoria"],
  contexts: ["distillazione", "registro"],
  quote: "una riga per candidato",
};
const ruleJson = { if: "scrivi un recorder", do: "registra anche gli scarti", tags: ["memoria"], quote: "registra anche gli scarti" };

const note = NoteCandidate.fromModel(noteJson)!;
const blankQuoteNote = NoteCandidate.fromModel({ ...noteJson, quote: "" })!;
const rule = RuleCandidate.fromModel(ruleJson)!;

const keptNote = () => Outcome.of(Checked.kept(note));
const keptRule = () => Outcome.of(Checked.kept(rule));
const droppedNote = () => Outcome.of(Checked.dropped(blankQuoteNote, "quote"));
const judgedNote = () => keptNote().judged({ is_textbook: 0.1, is_project_detail: 0.2 }, null);
const decidedNote = () => judgedNote().decided("extends", "tb-42");

const head = { extractor_id: 1, run: NOW.toISOString(), exchange_id: EXCHANGE, created: NOW.toISOString() };

const recorder = Recorder.start(1, NOW);

const bareCalls: [string, () => unknown][] = [
  ["Outcome.of: a kept note", keptNote],
  ["Outcome.of: a note dropped by a check, with a blank quote", droppedNote],
  ["Outcome.of: a kept rule", keptRule],
  ["Outcome.of: a rule dropped by a check", () => Outcome.of(Checked.dropped(rule, "italian"))],
  ["Outcome.judged: no drop", judgedNote],
  ["Outcome.judged: a drop that names a judged check", () => keptNote().judged({ is_textbook: 0.9 }, "is_textbook")],
  ["Outcome.judged: edges 0 and 1 are probabilities", () => keptNote().judged({ a: 0, b: 1 }, null)],
  ["Outcome.decided: a verdict with a pointer", decidedNote],
  ["Outcome.decided: a verdict without a pointer", () => judgedNote().decided("new", null)],
  ["Outcome.saved: a decided candidate", () => decidedNote().saved("tb-43")],
  ["Outcome.toRow: kept by the checks, not judged yet", () => keptNote().toRow(head)],
  ["Outcome.toRow: dropped by a check, blank quote", () => droppedNote().toRow(head)],
  ["Outcome.toRow: a rule dropped by a check", () => Outcome.of(Checked.dropped(rule, "rule_quote")).toRow(head)],
  ["Outcome.toRow: judged and kept", () => judgedNote().toRow(head)],
  ["Outcome.toRow: dropped by the critic", () => keptRule().judged({ is_textbook: 0.9 }, "is_textbook").toRow(head)],
  ["Outcome.toRow: decided", () => decidedNote().toRow(head)],
  ["Outcome.toRow: saved", () => decidedNote().saved("tb-43").toRow(head)],
  ["Recorder.start: a row id and a date", () => Recorder.start(1, NOW)],
  ["Recorder.rows: no outcome", () => recorder.rows(EXCHANGE, [], NOW)],
  ["Recorder.rows: one outcome per stage", () => recorder.rows(EXCHANGE, [keptNote(), droppedNote(), judgedNote(), decidedNote().saved("tb-43")], new Date("2026-10-08T11:00:00.000Z"))],
];

for (const [name, call] of bareCalls) {
  test(name, () => {
    call();
  });
}

const PROBABILITIES = "Outcome.judged: probabilities name at least one check";
const preconditions: [() => unknown, string][] = [
  [() => droppedNote().judged({ a: 0.5 }, null), "Outcome.judged: only an open candidate is judged"],
  [() => judgedNote().judged({ a: 0.5 }, null), "Outcome.judged: a candidate is judged once"],
  [() => keptNote().judged({}, null), PROBABILITIES],
  [() => keptNote().judged({ a: 1.01 }, null), PROBABILITIES],
  [() => keptNote().judged({ a: -0.01 }, null), PROBABILITIES],
  [() => keptNote().judged({ a: Number.NaN }, null), PROBABILITIES],
  [() => keptNote().judged({ " ": 0.5 }, null), PROBABILITIES],
  [() => keptNote().judged({ a: 0.5 }, "b"), "Outcome.judged: the drop names a judged check"],
  [() => droppedNote().decided("new", null), "Outcome.decided: only an open candidate gets a verdict"],
  [() => decidedNote().decided("new", null), "Outcome.decided: a candidate gets one verdict"],
  [() => judgedNote().decided(" ", null), "Outcome.decided: the verdict is not blank"],
  [() => judgedNote().decided("extends", ""), "Outcome.decided: of is null or not blank"],
  [() => judgedNote().saved("tb-43"), "Outcome.saved: only a candidate with a verdict is saved"],
  [() => decidedNote().saved("tb-43").saved("tb-44"), "Outcome.saved: a candidate is saved once"],
  [() => decidedNote().saved(""), "Outcome.saved: the id is not blank"],
  [() => Recorder.start(0, NOW), "Recorder.start: extractorId is a row id"],
  [() => Recorder.start(1.5, NOW), "Recorder.start: extractorId is a row id"],
  [() => Recorder.start(1, new Date("nope")), "Recorder.start: now is a valid date"],
  [() => recorder.rows("message-1", [keptNote()], NOW), "Recorder.rows: exchangeId is an exchange id"],
  [() => recorder.rows(EXCHANGE, [keptNote()], new Date("nope")), "Recorder.rows: now is a valid date"],
];

for (const [at, [call, message]] of preconditions.entries()) {
  test(`precondition ${at}: ${message}`, () => {
    expect(call).toThrow(message);
  });
}

describe("Recorder.write", () => {
  test("no outcome", async () => {
    await recorder.write(EXCHANGE, []);
  });

  test("one outcome per stage", async () => {
    await recorder.write(EXCHANGE, [keptRule(), droppedNote(), judgedNote(), decidedNote().saved("tb-43")]);
  });
});
