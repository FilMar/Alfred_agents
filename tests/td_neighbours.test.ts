// Tests for tools/td/src/neighbours.ts.
// The contract asserts of neighbours.ts are the oracle; the facts come from spec.md.
// - one test per precondition: the breaking input must throw the assert message
// - one test per postcondition: a bare call, no expect of our own
// - the pure mappers get outcome tables (the only tests with their own expect)
// - neighboursOf gets bare calls on the memory stubs and one failure case
// Every test sets the env before importing the module under test, as spec.md
// prescribes: neighbours.ts pulls the tb and ti stores in with it.

import { test } from "node:test";
import assert from "node:assert/strict";
import { startMemoryStubs } from "./helpers/td_stubs.ts";
import type { Note } from "../tools/tb/src/types.ts";
import type { IdentityEntry } from "../tools/ti/src/types.ts";
import type { Candidate } from "../tools/td/src/critic.ts";
import type { Neighbour } from "../tools/td/src/neighbours.ts";

type Stubs = ReturnType<typeof startMemoryStubs>;

/** A broken contract must be recognizable: the error carries the assert line. */
const says =
  (fragment: string) =>
  (err: unknown): boolean =>
    err instanceof Error && err.message.includes(fragment);

/** The contract reads only id and what, so a two-field note reaches every line. */
const aNote = (id: string, what: string): Note => ({ id, what }) as Note;

/** The contract reads only id, if and do. */
const anEntry = (id: string, cond: string, actions: string[]): IdentityEntry =>
  ({ id, if: cond, do: actions }) as IdentityEntry;

/** The module under test: env first, then import. */
const neighbours = () => import("../tools/td/src/neighbours.ts");

const noteCandidate = async (what: string): Promise<Candidate> => {
  const { NoteCandidate } = await import("../tools/td/src/candidate.ts");
  return NoteCandidate.fromModel({
    what,
    why: "l'utente lo ha detto",
    kind: "attrito",
    tags: ["architettura"],
    contexts: ["a", "b"],
    quote: "lo ha detto l'utente",
  });
};

const ruleCandidate = async (cond: string): Promise<Candidate> => {
  const { RuleCandidate } = await import("../tools/td/src/candidate.ts");
  return RuleCandidate.fromModel({
    if: cond,
    do: "chiudila",
    tags: ["casa"],
    quote: "lo ha detto l'utente",
  });
};

const seedNote = async (what: string): Promise<void> => {
  const { createNote } = await import("../tools/tb/src/notes.ts");
  await createNote({
    what,
    why: "l'utente lo ha detto",
    kind: "attrito",
    tags: ["architettura"],
    exchange: "exchange-1",
  });
};

const seedEntry = async (cond: string, actions: string[]): Promise<void> => {
  const { addEntry } = await import("../tools/ti/src/identity.ts");
  await addEntry(cond, actions, ["casa"], "exchange-1");
};

const withStubs = async (run: (stubs: Stubs) => Promise<void>): Promise<void> => {
  const stubs = startMemoryStubs();
  try {
    await run(stubs);
  } finally {
    await stubs.stop();
  }
};

test("neighbourOfNote: the note has an id", async () => {
  await withStubs(async () => {
    const { neighbourOfNote } = await neighbours();
    for (const id of ["", "   "]) {
      assert.throws(() => neighbourOfNote(aNote(id, "il camino è acceso")), says("neighbourOfNote: the note has an id"));
    }
  });
});

test("neighbourOfNote: the note has a what", async () => {
  await withStubs(async () => {
    const { neighbourOfNote } = await neighbours();
    for (const what of ["", "   "]) {
      assert.throws(() => neighbourOfNote(aNote("n-1", what)), says("neighbourOfNote: the note has a what"));
    }
  });
});

test("neighbourOfNote: the neighbour carries the note id", async () => {
  await withStubs(async () => {
    const { neighbourOfNote } = await neighbours();
    neighbourOfNote(aNote("nota-7", "il camino è acceso"));
  });
});

test("neighbourOfNote: the kind is note", async () => {
  await withStubs(async () => {
    const { neighbourOfNote } = await neighbours();
    neighbourOfNote(aNote("n-1", "il camino è acceso"));
  });
});

test("neighbourOfNote: the text is the what of the note", async () => {
  await withStubs(async () => {
    const { neighbourOfNote } = await neighbours();
    neighbourOfNote(aNote("n-1", "  il camino è acceso  "));
  });
});

test("neighbourOfNote maps a note to its neighbour", async () => {
  await withStubs(async () => {
    const { neighbourOfNote } = await neighbours();
    const cases: [Note, Neighbour][] = [
      [aNote("n-1", "il camino è acceso"), { id: "n-1", kind: "note", text: "il camino è acceso" }],
      [aNote("n-2", "x"), { id: "n-2", kind: "note", text: "x" }],
      [aNote("n-3", "  il camino è acceso  "), { id: "n-3", kind: "note", text: "  il camino è acceso  " }],
    ];
    for (const [note, expected] of cases) {
      assert.deepEqual(neighbourOfNote(note), expected);
    }
  });
});

test("neighbourOfEntry: the entry has an if", async () => {
  await withStubs(async () => {
    const { neighbourOfEntry } = await neighbours();
    for (const cond of ["", "   "]) {
      assert.throws(() => neighbourOfEntry(anEntry("e-1", cond, ["chiudila"])), says("neighbourOfEntry: the entry has an if"));
    }
  });
});

test("neighbourOfEntry: the entry has at least one do", async () => {
  await withStubs(async () => {
    const { neighbourOfEntry } = await neighbours();
    assert.throws(() => neighbourOfEntry(anEntry("e-1", "la porta è aperta", [])), says("neighbourOfEntry: the entry has at least one do"));
  });
});

test("neighbourOfEntry: the neighbour carries the entry id", async () => {
  await withStubs(async () => {
    const { neighbourOfEntry } = await neighbours();
    neighbourOfEntry(anEntry("regola-7", "la porta è aperta", ["chiudila"]));
  });
});

test("neighbourOfEntry: the kind is rule", async () => {
  await withStubs(async () => {
    const { neighbourOfEntry } = await neighbours();
    neighbourOfEntry(anEntry("e-1", "la porta è aperta", ["chiudila"]));
  });
});

test("neighbourOfEntry: the text reads SE if ALLORA do", async () => {
  await withStubs(async () => {
    const { neighbourOfEntry } = await neighbours();
    neighbourOfEntry(anEntry("e-1", "la porta è aperta", ["chiudila"]));
  });
});

test("neighbourOfEntry maps an entry to its neighbour", async () => {
  await withStubs(async () => {
    const { neighbourOfEntry } = await neighbours();
    const cases: [IdentityEntry, Neighbour][] = [
      [anEntry("e-1", "la porta è aperta", ["chiudila"]), { id: "e-1", kind: "rule", text: "SE la porta è aperta ALLORA chiudila" }],
      [anEntry("e-2", "il test è rosso", ["una cosa", "un'altra cosa", "una terza cosa"]), { id: "e-2", kind: "rule", text: "SE il test è rosso ALLORA una cosa; un'altra cosa; una terza cosa" }],
      [anEntry("e-3", "x", ["y"]), { id: "e-3", kind: "rule", text: "SE x ALLORA y" }],
    ];
    for (const [entry, expected] of cases) {
      assert.deepEqual(neighbourOfEntry(entry), expected);
    }
  });
});

test("queryOf: the query is not blank", async () => {
  await withStubs(async () => {
    const { queryOf } = await neighbours();
    queryOf(await noteCandidate("il camino è acceso"));
  });
});

test("queryOf: a note is searched by its what", async () => {
  await withStubs(async () => {
    const { queryOf } = await neighbours();
    queryOf(await noteCandidate("il camino è acceso"));
  });
});

test("queryOf: a rule is searched by its if", async () => {
  await withStubs(async () => {
    const { queryOf } = await neighbours();
    queryOf(await ruleCandidate("la porta è aperta"));
  });
});

test("queryOf searches a note by its what and a rule by its if", async () => {
  await withStubs(async () => {
    const { queryOf } = await neighbours();
    const cases: [Candidate, string][] = [
      [await noteCandidate("il camino è acceso"), "il camino è acceso"],
      [await noteCandidate("x"), "x"],
      [await ruleCandidate("la porta è aperta"), "la porta è aperta"],
      [await ruleCandidate("y"), "y"],
    ];
    for (const [candidate, expected] of cases) {
      assert.equal(queryOf(candidate), expected);
    }
  });
});

test("neighboursOf: topK is a positive integer", async () => {
  await withStubs(async () => {
    const { neighboursOf } = await neighbours();
    const candidate = await noteCandidate("il camino è acceso");
    for (const topK of [0, 1.5, NaN]) {
      await assert.rejects(() => neighboursOf(candidate, topK), says(`neighboursOf: topK is a positive integer, got=${topK}`));
    }
  });
});

test("neighboursOf: at most topK neighbours", async () => {
  await withStubs(async () => {
    const { neighboursOf } = await neighbours();
    await seedNote("il camino è acceso");
    await seedNote("il camino è acceso di sera");
    await seedNote("il camino è acceso ogni giorno");
    await neighboursOf(await noteCandidate("il camino è acceso"), 1);
  });
});

test("neighboursOf: every neighbour has the kind of the candidate", async () => {
  await withStubs(async () => {
    const { neighboursOf } = await neighbours();
    await seedEntry("la porta è aperta", ["chiudila"]);
    await seedEntry("la porta è aperta di notte", ["chiudila piano"]);
    await neighboursOf(await ruleCandidate("la porta è aperta"), 5);
  });
});

test("neighboursOf: no neighbour twice", async () => {
  await withStubs(async () => {
    const { neighboursOf } = await neighbours();
    await seedNote("il camino è acceso");
    await seedNote("il camino è acceso di sera");
    await seedNote("il camino è acceso ogni giorno");
    await neighboursOf(await noteCandidate("il camino è acceso"), 5);
  });
});

test("neighboursOf: a store error is not caught", async () => {
  await withStubs(async (stubs) => {
    const { neighboursOf } = await neighbours();
    await seedNote("il camino è acceso");
    await seedEntry("la porta è aperta", ["chiudila"]);
    const note = await noteCandidate("il camino è acceso");
    const rule = await ruleCandidate("la porta è aperta");
    await neighboursOf(note, 3);
    stubs.failPath("/points");
    await assert.rejects(() => neighboursOf(note, 3));
    await assert.rejects(() => neighboursOf(rule, 3));
  });
});