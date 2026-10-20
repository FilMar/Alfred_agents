// Tests of the merge contract in tools/tb/src/merge.ts.
// The asserts inside the functions are the oracle: a test named after an assert
// either breaks it on the way in (precondition: expects the throw) or reaches it
// on the way out (postcondition: a bare call, no expect of its own). The other
// tests pin the exact rules from the spec.

import { describe, expect, test } from "bun:test";
import { mergePlan, mergedCounters, mergedInto, mergedLinks, relinkOf } from "../tools/tb/src/merge.ts";

// ─── Fixtures ────────────────────────────────────────────────────────────────

type TestLink = { id: string; reason: string; origin?: string };

type TestNote = {
  id: string;
  when: string;
  why: string;
  what: string;
  tags: string[];
  kind: "dato" | "protocollo" | "sintesi" | "attrito" | "configurazione" | "indice";
  refs: TestLink[];
  backrefs?: string[];
  hits?: number;
  hits_related?: number;
  last_hit?: string;
  last_hit_related?: string;
  archived_at?: string;
  updated_at?: string;
  source?: string;
  exchange?: string;
  about?: string;
  embed_model?: string;
};

/** The test note of the spec: the base shape plus the fields the case needs. */
function note(id: string, over: Partial<TestNote> = {}): TestNote {
  return {
    id,
    when: "2024-01-01T00:00:00.000Z",
    why: `why of ${id}`,
    what: `what of ${id}`,
    tags: [],
    kind: "dato",
    refs: [],
    ...over,
  };
}

/** The test link of the spec: a reason, and an origin only when the case carries one. */
function link(id: string, reason: string, origin?: string): TestLink {
  return origin === undefined ? { id, reason } : { id, reason, origin };
}

const NOW = new Date("2025-06-01T10:20:30.000Z");

// ─── mergedLinks ─────────────────────────────────────────────────────────────

describe("mergedLinks", () => {
  // Postconditions: bare calls — the asserts inside mergedLinks are the oracle.
  test("mergedLinks: no link to itself or to a drop", () => {
    const into = note("I", { refs: [link("I", "self"), link("d1", "to-a-drop")], backrefs: ["I", "d1", "k"] });
    const drops = [note("d1", { refs: [link("I", "up"), link("d2", "down")], backrefs: ["I", "m"] }), note("d2")];
    mergedLinks(into, drops);
  });

  test("mergedLinks: no two refs to the same note", () => {
    const into = note("I", { refs: [link("a", "ra")] });
    const drops = [
      note("d1", { refs: [link("a", "ra-again"), link("b", "rb")] }),
      note("d2", { refs: [link("b", "rb-again"), link("c", "rc")] }),
    ];
    mergedLinks(into, drops);
  });

  test("mergedLinks: no backref twice", () => {
    mergedLinks(note("I", { backrefs: ["p", "q"] }), [note("d1", { backrefs: ["q", "r"] })]);
  });

  test("mergedLinks: the refs of into win over the moved ones", () => {
    mergedLinks(note("I", { refs: [link("a", "into-reason")] }), [note("d1", { refs: [link("a", "drop-reason")] })]);
  });

  test("mergedLinks: every other link of into and the drops is kept", () => {
    mergedLinks(
      note("I", { refs: [link("a", "ra")], backrefs: ["p"] }),
      [note("d1", { refs: [link("b", "rb")], backrefs: ["q"] }), note("d2", { refs: [link("c", "rc")] })],
    );
  });

  // The spec rules, pinned.
  test("mergedLinks: into first, then the drops in order, and the first ref per id wins", () => {
    const into = note("I", {
      refs: [link("a", "ra-into", "umano"), link("I", "self"), link("d1", "to-a-drop"), link("b", "rb-into")],
      backrefs: ["x", "I", "d2", "y"],
    });
    const d1 = note("d1", {
      refs: [link("b", "rb-d1"), link("d2", "cross"), link("I", "up"), link("c", "rc", "aristotele")],
      backrefs: ["y", "d1", "z"],
    });
    const d2 = note("d2", {
      refs: [link("a", "ra-d2"), link("d", "rd")],
      backrefs: ["x", "w"],
    });
    expect(mergedLinks(into, [d1, d2])).toEqual({
      refs: [link("a", "ra-into", "umano"), link("b", "rb-into"), link("c", "rc", "aristotele"), link("d", "rd")],
      backrefs: ["x", "y", "z", "w"],
    });
  });

  test("mergedLinks: with no drops, into only loses its self-links", () => {
    const into = note("I", { refs: [link("a", "ra"), link("I", "self")], backrefs: ["p", "I"] });
    expect(mergedLinks(into, [])).toEqual({ refs: [link("a", "ra")], backrefs: ["p"] });
  });
});

// ─── mergedCounters ──────────────────────────────────────────────────────────

describe("mergedCounters", () => {
  test("mergedCounters: at least one note", () => {
    expect(() => mergedCounters([])).toThrow("mergedCounters: at least one note");
  });

  // Postconditions: bare calls — the asserts inside mergedCounters are the oracle.
  test("mergedCounters: hits and related hits are the sums", () => {
    mergedCounters([
      note("I", { hits: 2, hits_related: 1 }),
      note("d1", { hits: 3 }),
      note("d2", { hits_related: 4 }),
    ]);
  });

  test("mergedCounters: last hits are the latest ones", () => {
    mergedCounters([
      note("I", { last_hit: "2024-05-01", last_hit_related: "2024-01-01" }),
      note("d1", { last_hit: "2024-03-01", last_hit_related: "2024-02-01" }),
    ]);
  });

  test("mergedCounters: archived only if every note is", () => {
    mergedCounters([note("I", { archived_at: "2024-06-01" }), note("d1", { archived_at: "2024-07-01" })]);
  });

  // The spec rules, pinned.
  test("mergedCounters: absent counters count as zero, last hits take the latest date", () => {
    const into = note("I", { hits: 2, hits_related: 1, last_hit: "2024-05-02", last_hit_related: "2024-04-01" });
    const d1 = note("d1", { hits: 3, last_hit_related: "2024-05-01", archived_at: "2024-08-01" });
    const d2 = note("d2");
    expect(mergedCounters([into, d1, d2])).toEqual({
      hits: 5,
      hits_related: 1,
      last_hit: "2024-05-02",
      last_hit_related: "2024-05-01",
    });
  });

  test("mergedCounters: archived_at is the first note's, and only when every note has one", () => {
    const into = note("I", { archived_at: "2024-06-01" });
    const d1 = note("d1", { archived_at: "2024-07-01" });
    expect(mergedCounters([into, d1])).toEqual({ hits: 0, hits_related: 0, archived_at: "2024-06-01" });
  });

  test("mergedCounters: one note alone carries its own counters", () => {
    const solo = note("I", {
      hits: 7,
      hits_related: 4,
      last_hit: "2024-03-03",
      last_hit_related: "2024-02-02",
      archived_at: "2024-01-01",
    });
    expect(mergedCounters([solo])).toEqual({
      hits: 7,
      hits_related: 4,
      last_hit: "2024-03-03",
      last_hit_related: "2024-02-02",
      archived_at: "2024-01-01",
    });
    expect(mergedCounters([note("I")])).toEqual({ hits: 0, hits_related: 0 });
  });
});

// ─── mergedInto ──────────────────────────────────────────────────────────────

describe("mergedInto", () => {
  test("mergedInto: now is a valid date", () => {
    expect(() => mergedInto(note("I"), [note("d1")], new Date("not a date"))).toThrow("mergedInto: now is a valid date");
  });

  // Postconditions: bare calls — the asserts inside mergedInto are the oracle.
  test("mergedInto: id, text, why, kind and when are the into ones", () => {
    mergedInto(
      note("I", { what: "the fact", why: "the context", kind: "attrito", when: "2023-12-31T23:59:59.000Z" }),
      [note("d1", { what: "another fact", why: "another context", kind: "dato", when: "2020-01-01T00:00:00.000Z" })],
      NOW,
    );
  });

  test("mergedInto: tags are the union", () => {
    mergedInto(note("I", { tags: ["x", "y"] }), [note("d1", { tags: ["y", "z"] }), note("d2", { tags: ["w"] })], NOW);
  });

  test("mergedInto: links and counters are the merged ones", () => {
    mergedInto(
      note("I", { refs: [link("a", "ra")], hits: 1 }),
      [note("d1", { refs: [link("b", "rb")], backrefs: ["q"], hits: 2, last_hit: "2024-09-01" })],
      NOW,
    );
  });

  test("mergedInto: updated_at is now", () => {
    mergedInto(note("I", { updated_at: "2020-01-01T00:00:00.000Z" }), [note("d1")], NOW);
  });

  // The spec rules, pinned.
  test("mergedInto: the note is into, with the merged links, counters, tags and updated_at", () => {
    const into = note("I", {
      when: "2024-02-02T00:00:00.000Z",
      why: "why of into",
      what: "what of into",
      kind: "sintesi",
      tags: ["a", "b"],
      refs: [link("a", "ra")],
      backrefs: ["q"],
      hits: 2,
      hits_related: 1,
      last_hit: "2024-05-02",
      last_hit_related: "2024-04-01",
      source: "http://src",
      exchange: "ex1",
      about: "mondo",
      embed_model: "model-x",
      updated_at: "2020-01-01T00:00:00.000Z",
    });
    const d1 = note("d1", {
      tags: ["b", "c"],
      refs: [link("d2", "cross"), link("b", "rb")],
      backrefs: ["q", "r"],
      hits: 3,
      last_hit: "2024-03-01",
    });
    const d2 = note("d2", { tags: ["d"], hits_related: 2, last_hit_related: "2024-06-01", archived_at: "2024-07-01" });
    expect(mergedInto(into, [d1, d2], NOW)).toStrictEqual({
      id: "I",
      when: "2024-02-02T00:00:00.000Z",
      why: "why of into",
      what: "what of into",
      kind: "sintesi",
      tags: ["a", "b", "c", "d"],
      refs: [link("a", "ra"), link("b", "rb")],
      backrefs: ["q", "r"],
      hits: 5,
      hits_related: 3,
      last_hit: "2024-05-02",
      last_hit_related: "2024-06-01",
      source: "http://src",
      exchange: "ex1",
      about: "mondo",
      embed_model: "model-x",
      updated_at: "2025-06-01T10:20:30.000Z",
    });
  });

  test("mergedInto: a counter nobody has leaves no key in the note", () => {
    const merged = mergedInto(note("I"), [note("d1")], NOW);
    expect("hits" in merged).toBe(true);
    expect("hits_related" in merged).toBe(true);
    expect(merged.hits).toBe(0);
    expect(merged.hits_related).toBe(0);
    expect("last_hit" in merged).toBe(false);
    expect("last_hit_related" in merged).toBe(false);
    expect("archived_at" in merged).toBe(false);
  });
});

// ─── relinkOf ────────────────────────────────────────────────────────────────

describe("relinkOf", () => {
  test("relinkOf: into is not a drop", () => {
    expect(() => relinkOf(note("L"), "I", new Set(["I", "d1"]))).toThrow("relinkOf: into is not a drop");
  });

  // Postconditions: bare calls — the asserts inside relinkOf are the oracle.
  test("relinkOf: the id is the note id", () => {
    relinkOf(note("L", { refs: [link("a", "ra")] }), "I", new Set(["d1"]));
  });

  test("relinkOf: no link to a drop", () => {
    relinkOf(
      note("L", { refs: [link("d1", "rd1"), link("a", "ra")], backrefs: ["d1", "p"] }),
      "I",
      new Set(["d1", "d2"]),
    );
  });

  test("relinkOf: no two refs to the same note", () => {
    relinkOf(note("L", { refs: [link("d1", "rd1"), link("d2", "rd2"), link("a", "ra")] }), "I", new Set(["d1", "d2"]));
  });

  test("relinkOf: a link to a drop points at into, an own ref to into wins", () => {
    relinkOf(note("L", { refs: [link("d1", "rd1"), link("b", "rb")] }), "I", new Set(["d1"]));
    relinkOf(note("L", { refs: [link("d1", "rd1"), link("I", "own")] }), "I", new Set(["d1"]));
  });

  // The spec rules, pinned.
  test("relinkOf: the first ref to a drop moves to into in place, the other drop refs fall away", () => {
    const linked = note("L", {
      refs: [link("a", "ra"), link("d1", "rd1", "aristotele"), link("b", "rb"), link("d2", "rd2"), link("c", "rc")],
      backrefs: ["p", "I", "d1", "q", "d2", "d1"],
    });
    expect(relinkOf(linked, "I", new Set(["d1", "d2", "d3"]))).toEqual({
      id: "L",
      refs: [link("a", "ra"), link("I", "rd1", "aristotele"), link("b", "rb"), link("c", "rc")],
      backrefs: ["p", "I", "q"],
    });
  });

  test("relinkOf: an own ref to into wins, the moved ref falls away", () => {
    const linked = note("L", {
      refs: [link("a", "ra"), link("d1", "rd1"), link("I", "own"), link("b", "rb")],
      backrefs: ["d1", "p"],
    });
    expect(relinkOf(linked, "I", new Set(["d1"]))).toEqual({
      id: "L",
      refs: [link("a", "ra"), link("I", "own"), link("b", "rb")],
      backrefs: ["I", "p"],
    });
  });

  test("relinkOf: a note with no link to a drop stays as it is", () => {
    const linked = note("L", { refs: [link("a", "ra")], backrefs: ["p"] });
    expect(relinkOf(linked, "I", new Set(["d1"]))).toEqual({ id: "L", refs: [link("a", "ra")], backrefs: ["p"] });
  });
});

// ─── mergePlan ───────────────────────────────────────────────────────────────

describe("mergePlan", () => {
  test("mergePlan: at least one drop", () => {
    expect(() => mergePlan(note("I"), [], [], NOW, 10)).toThrow("mergePlan: at least one drop");
  });

  test("mergePlan: into and the drops are all different notes", () => {
    const into = note("I");
    expect(() => mergePlan(into, [note("d1"), note("I")], [], NOW, 10)).toThrow(
      "mergePlan: into and the drops are all different notes",
    );
    expect(() => mergePlan(into, [note("d1"), note("d2"), note("d1")], [], NOW, 10)).toThrow(
      "mergePlan: into and the drops are all different notes",
    );
  });

  test("mergePlan: refsLimit is a positive integer", () => {
    const into = note("I");
    const drop = note("d1");
    expect(() => mergePlan(into, [drop], [], NOW, 0)).toThrow("mergePlan: refsLimit is a positive integer");
    expect(() => mergePlan(into, [drop], [], NOW, -1)).toThrow("mergePlan: refsLimit is a positive integer");
    expect(() => mergePlan(into, [drop], [], NOW, 2.5)).toThrow("mergePlan: refsLimit is a positive integer");
  });

  // Postconditions: bare calls — the asserts inside mergePlan are the oracle.
  test("mergePlan: the refs of into fit the limit", () => {
    mergePlan(
      note("I", { refs: [link("a", "ra"), link("b", "rb")] }),
      [note("d1", { refs: [link("c", "rc")] })],
      [],
      NOW,
      3,
    );
  });

  test("mergePlan: no note in the plan links to a drop", () => {
    mergePlan(
      note("I", { refs: [link("a", "ra")] }),
      [note("d1", { refs: [link("I", "loop"), link("b", "rb")] })],
      [note("L", { refs: [link("d1", "rd1")], backrefs: ["d1"] })],
      NOW,
      10,
    );
  });

  // The spec rules, pinned.
  test("mergePlan: into merged, the linked notes relinked once per id, the drops listed in order", () => {
    const into = note("I", {
      when: "2024-01-01T00:00:00.000Z",
      why: "why-I",
      what: "what-I",
      kind: "sintesi",
      tags: ["t1"],
      refs: [link("a", "ra")],
      backrefs: ["q"],
      hits: 2,
      hits_related: 1,
      last_hit: "2024-05-02",
      last_hit_related: "2024-04-01",
      source: "http://src",
      exchange: "ex1",
      about: "mondo",
      embed_model: "model-x",
    });
    const d1 = note("d1", { tags: ["t2"], refs: [link("b", "rb"), link("I", "loop")], backrefs: ["q", "z"], hits: 3 });
    const d2 = note("d2", { hits_related: 2 });
    const neighbour = note("L1", { refs: [link("d1", "rd1"), link("c", "rc")], backrefs: ["d2", "p"] });
    const byBackref = note("L2", { backrefs: ["d1"] });
    const sameIdAgain = note("L1", { refs: [link("zz", "rzz")] });
    const intoAgain = note("I", { refs: [link("zz", "rzz")] });
    const linked = [intoAgain, neighbour, byBackref, sameIdAgain, d2];
    expect(mergePlan(into, [d1, d2], linked, NOW, 10)).toStrictEqual({
      ok: true,
      plan: {
        into: {
          id: "I",
          when: "2024-01-01T00:00:00.000Z",
          why: "why-I",
          what: "what-I",
          kind: "sintesi",
          tags: ["t1", "t2"],
          refs: [link("a", "ra"), link("b", "rb")],
          backrefs: ["q", "z"],
          hits: 5,
          hits_related: 3,
          last_hit: "2024-05-02",
          last_hit_related: "2024-04-01",
          source: "http://src",
          exchange: "ex1",
          about: "mondo",
          embed_model: "model-x",
          updated_at: "2025-06-01T10:20:30.000Z",
        },
        relinked: [
          { id: "L1", refs: [link("I", "rd1"), link("c", "rc")], backrefs: ["I", "p"] },
          { id: "L2", refs: [], backrefs: ["I"] },
        ],
        dropped: ["d1", "d2"],
      },
    });
  });

  test("mergePlan: past the refs limit the plan is a world error naming the count", () => {
    const into = note("I", { refs: [link("a", "ra"), link("b", "rb")] });
    const drop = note("d1", { refs: [link("c", "rc")] });
    expect(mergePlan(into, [drop], [], NOW, 3).ok).toBe(true);
    expect(mergePlan(into, [drop], [], NOW, 4).ok).toBe(true);
    expect(mergePlan(into, [drop], [], NOW, 2)).toStrictEqual({
      ok: false,
      error: "refs limit: 3 refs, limit 2; drop some refs or make a hub first",
    });
    expect(mergePlan(into, [drop], [], NOW, 1)).toStrictEqual({
      ok: false,
      error: "refs limit: 3 refs, limit 1; drop some refs or make a hub first",
    });
    expect(mergePlan(note("I", { refs: [link("a", "ra")] }), [note("d1")], [], NOW, 1).ok).toBe(true);
  });
});