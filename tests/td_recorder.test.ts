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

const keptNote = () => Outcome.ofNote(Checked.kept(note));
const keptRule = () => Outcome.ofRule(Checked.kept(rule));
const droppedNote = () => Outcome.ofNote(Checked.dropped(blankQuoteNote, "quote"));
const judgedNote = () => keptNote().judged({ is_textbook: 0.1, is_project_detail: 0.2 }, null);
const decidedNote = () => judgedNote().decided("extends", "tb-42");

const head = { extractor_id: 1, run: NOW.toISOString(), exchange_id: EXCHANGE, created: NOW.toISOString() };

describe("Outcome.ofNote and ofRule", () => {
  test("a kept note", () => {
    keptNote();
  });

  test("a note dropped by a check, with a blank quote", () => {
    droppedNote();
  });

  test("a kept rule", () => {
    keptRule();
  });

  test("a rule dropped by a check", () => {
    Outcome.ofRule(Checked.dropped(rule, "italian"));
  });
});

describe("Outcome.judged", () => {
  test("no drop", () => {
    judgedNote();
  });

  test("a drop that names a judged check", () => {
    keptNote().judged({ is_textbook: 0.9 }, "is_textbook");
  });

  test("edges: 0 and 1 are probabilities", () => {
    keptNote().judged({ a: 0, b: 1 }, null);
  });

  test("precondition - only an open candidate is judged", () => {
    expect(() => droppedNote().judged({ a: 0.5 }, null)).toThrow("Outcome.judged: only an open candidate is judged");
  });

  test("precondition - a candidate is judged once", () => {
    expect(() => judgedNote().judged({ a: 0.5 }, null)).toThrow("Outcome.judged: a candidate is judged once");
  });

  test("precondition - no probability at all", () => {
    expect(() => keptNote().judged({}, null)).toThrow("Outcome.judged: probabilities name at least one check");
  });

  test("precondition - a probability above 1", () => {
    expect(() => keptNote().judged({ a: 1.01 }, null)).toThrow("Outcome.judged: probabilities name at least one check");
  });

  test("precondition - a probability below 0", () => {
    expect(() => keptNote().judged({ a: -0.01 }, null)).toThrow("Outcome.judged: probabilities name at least one check");
  });

  test("precondition - a NaN probability", () => {
    expect(() => keptNote().judged({ a: Number.NaN }, null)).toThrow("Outcome.judged: probabilities name at least one check");
  });

  test("precondition - a blank check name", () => {
    expect(() => keptNote().judged({ " ": 0.5 }, null)).toThrow("Outcome.judged: probabilities name at least one check");
  });

  test("precondition - the drop names a check that was not judged", () => {
    expect(() => keptNote().judged({ a: 0.5 }, "b")).toThrow("Outcome.judged: the drop names a judged check");
  });
});

describe("Outcome.nearIdentical", () => {
  test("a judged candidate", () => {
    judgedNote().nearIdentical();
  });

  test("precondition - only an open candidate is dropped", () => {
    expect(() => droppedNote().nearIdentical()).toThrow("Outcome.nearIdentical: only an open candidate is dropped");
  });
});

describe("Outcome.decided", () => {
  test("a verdict with a pointer", () => {
    decidedNote();
  });

  test("a verdict without a pointer", () => {
    judgedNote().decided("new", null);
  });

  test("precondition - only an open candidate gets a verdict", () => {
    expect(() => judgedNote().nearIdentical().decided("new", null)).toThrow("Outcome.decided: only an open candidate gets a verdict");
  });

  test("precondition - a candidate gets one verdict", () => {
    expect(() => decidedNote().decided("new", null)).toThrow("Outcome.decided: a candidate gets one verdict");
  });

  test("precondition - a blank verdict", () => {
    expect(() => judgedNote().decided(" ", null)).toThrow("Outcome.decided: the verdict is not blank");
  });

  test("precondition - a blank pointer", () => {
    expect(() => judgedNote().decided("extends", "")).toThrow("Outcome.decided: of is null or not blank");
  });
});

describe("Outcome.saved", () => {
  test("a decided candidate", () => {
    decidedNote().saved("tb-43");
  });

  test("precondition - only a candidate with a verdict is saved", () => {
    expect(() => judgedNote().saved("tb-43")).toThrow("Outcome.saved: only a candidate with a verdict is saved");
  });

  test("precondition - a candidate is saved once", () => {
    expect(() => decidedNote().saved("tb-43").saved("tb-44")).toThrow("Outcome.saved: a candidate is saved once");
  });

  test("precondition - a blank id", () => {
    expect(() => decidedNote().saved("")).toThrow("Outcome.saved: the id is not blank");
  });
});

describe("Outcome.toRow, every stage", () => {
  test("kept by the checks, not judged yet", () => {
    keptNote().toRow(head);
  });

  test("dropped by a check, blank quote", () => {
    droppedNote().toRow(head);
  });

  test("a rule dropped by a check", () => {
    Outcome.ofRule(Checked.dropped(rule, "rule_quote")).toRow(head);
  });

  test("judged and kept", () => {
    judgedNote().toRow(head);
  });

  test("dropped by the critic", () => {
    keptRule().judged({ is_textbook: 0.9 }, "is_textbook").toRow(head);
  });

  test("near identical", () => {
    judgedNote().nearIdentical().toRow(head);
  });

  test("decided", () => {
    decidedNote().toRow(head);
  });

  test("saved", () => {
    decidedNote().saved("tb-43").toRow(head);
  });
});

describe("Recorder.start", () => {
  test("a row id and a date", () => {
    Recorder.start(1, NOW);
  });

  test("precondition - extractorId 0", () => {
    expect(() => Recorder.start(0, NOW)).toThrow("Recorder.start: extractorId is a row id");
  });

  test("precondition - extractorId not an integer", () => {
    expect(() => Recorder.start(1.5, NOW)).toThrow("Recorder.start: extractorId is a row id");
  });

  test("precondition - an invalid date", () => {
    expect(() => Recorder.start(1, new Date("nope"))).toThrow("Recorder.start: now is a valid date");
  });
});

describe("Recorder.rows", () => {
  const recorder = Recorder.start(1, NOW);

  test("no outcome", () => {
    recorder.rows(EXCHANGE, [], NOW);
  });

  test("one outcome per stage", () => {
    recorder.rows(EXCHANGE, [keptNote(), droppedNote(), judgedNote().nearIdentical(), decidedNote().saved("tb-43")], new Date("2026-10-08T11:00:00.000Z"));
  });

  test("precondition - not an exchange id", () => {
    expect(() => recorder.rows("message-1", [keptNote()], NOW)).toThrow("Recorder.rows: exchangeId is an exchange id");
  });

  test("precondition - an invalid date", () => {
    expect(() => recorder.rows(EXCHANGE, [keptNote()], new Date("nope"))).toThrow("Recorder.rows: now is a valid date");
  });
});

describe("Recorder.write", () => {
  const recorder = Recorder.start(1, NOW);

  test("no outcome", async () => {
    await recorder.write(EXCHANGE, []);
  });

  test("one outcome per stage", async () => {
    await recorder.write(EXCHANGE, [keptRule(), droppedNote(), judgedNote().nearIdentical(), decidedNote().saved("tb-43")]);
  });
});
