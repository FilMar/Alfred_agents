import { test } from "node:test";
import assert from "node:assert/strict";

import { LOW_TEXT_CHARS, TRUST_FLOOR, planOf, restoredNoteOf } from "../tools/tb/src/refine.ts";
import type { Scored } from "../tools/tb/src/refine.ts";
import type { Note } from "../tools/tb/src/types.ts";

const WHEN = "2026-09-25T08:00:00.000Z";
const ARCHIVED_AT = "2026-10-01T00:00:00.000Z";
const AT_FLOOR = TRUST_FLOOR;
const UNDER_FLOOR = TRUST_FLOOR - 0.01;
const OVER_FLOOR = TRUST_FLOOR + 0.01;
const BASE_WHAT = "0123456789".repeat(20);
const AT_LIMIT_WHAT = BASE_WHAT.slice(0, LOW_TEXT_CHARS);
const OVER_LIMIT_WHAT = `${AT_LIMIT_WHAT}!`;

// Partial notes with a cast, as in the other refine tests.
function noteOf(id: string, extra: Partial<Note> = {}): Note {
  return { id, what: `what of ${id}`, when: WHEN, ...extra } as Note;
}

// planOf

test("planOf rejects a trust outside the unit range", () => {
  assert.throws(
    () => planOf([{ note: noteOf("below-zero"), trust: -0.01 }]),
    /planOf: every trust is between 0 and 1/,
  );
  assert.throws(
    () =>
      planOf([
        { note: noteOf("fine"), trust: 0.5 },
        { note: noteOf("above-one"), trust: 1.01 },
      ]),
    /planOf: every trust is between 0 and 1/,
  );
});

// The table from the spec:
//   trust      archived_at   outcome
//   under 0.2  absent        archive
//   under 0.2  present       nothing
//   0.2 or up  present       restore
//   0.2 or up  absent        nothing
test("planOf classifies every note by the table", () => {
  const scored: Scored[] = [
    { note: noteOf("under-archived", { archived_at: ARCHIVED_AT }), trust: UNDER_FLOOR },
    { note: noteOf("above-absent"), trust: 0.5 },
    { note: noteOf("under-absent", { what: OVER_LIMIT_WHAT, hits: 3, hits_related: 4 }), trust: UNDER_FLOOR },
    { note: noteOf("above-archived", { archived_at: ARCHIVED_AT }), trust: 0.5 },
  ];
  assert.deepStrictEqual(planOf(scored), {
    archive: [
      { id: "under-absent", trust: UNDER_FLOOR, text: AT_LIMIT_WHAT, when: WHEN, hits: 3, hits_related: 4 },
    ],
    restore: [
      { id: "above-archived", trust: 0.5, text: "what of above-archived", when: WHEN, hits: 0, hits_related: 0 },
    ],
  });
});

test("planOf puts a trust exactly at the floor on the restore side", () => {
  const scored: Scored[] = [
    { note: noteOf("at-floor-free"), trust: AT_FLOOR },
    { note: noteOf("under-free"), trust: UNDER_FLOOR },
    { note: noteOf("at-floor-archived", { archived_at: ARCHIVED_AT }), trust: AT_FLOOR },
    { note: noteOf("under-archived", { archived_at: ARCHIVED_AT }), trust: UNDER_FLOOR },
    { note: noteOf("just-above-archived", { archived_at: ARCHIVED_AT }), trust: OVER_FLOOR },
  ];
  assert.deepStrictEqual(planOf(scored), {
    archive: [
      { id: "under-free", trust: UNDER_FLOOR, text: "what of under-free", when: WHEN, hits: 0, hits_related: 0 },
    ],
    restore: [
      { id: "at-floor-archived", trust: AT_FLOOR, text: "what of at-floor-archived", when: WHEN, hits: 0, hits_related: 0 },
      { id: "just-above-archived", trust: OVER_FLOOR, text: "what of just-above-archived", when: WHEN, hits: 0, hits_related: 0 },
    ],
  });
});

test("planOf accepts the ends of the unit range", () => {
  const scored: Scored[] = [
    { note: noteOf("top-free"), trust: 1 },
    { note: noteOf("bottom-free"), trust: 0 },
    { note: noteOf("top-archived", { archived_at: ARCHIVED_AT }), trust: 1 },
    { note: noteOf("bottom-archived", { archived_at: ARCHIVED_AT }), trust: 0 },
    { note: noteOf("just-in-bottom"), trust: 0.01 },
    { note: noteOf("just-in-top", { archived_at: ARCHIVED_AT }), trust: 0.99 },
  ];
  assert.deepStrictEqual(planOf(scored), {
    archive: [
      { id: "bottom-free", trust: 0, text: "what of bottom-free", when: WHEN, hits: 0, hits_related: 0 },
      { id: "just-in-bottom", trust: 0.01, text: "what of just-in-bottom", when: WHEN, hits: 0, hits_related: 0 },
    ],
    restore: [
      { id: "just-in-top", trust: 0.99, text: "what of just-in-top", when: WHEN, hits: 0, hits_related: 0 },
      { id: "top-archived", trust: 1, text: "what of top-archived", when: WHEN, hits: 0, hits_related: 0 },
    ],
  });
});

test("planOf orders both lists by trust and then by id", () => {
  const scored: Scored[] = [
    { note: noteOf("b"), trust: 0.15 },
    { note: noteOf("y", { archived_at: ARCHIVED_AT }), trust: 0.8 },
    { note: noteOf("a"), trust: 0.15 },
    { note: noteOf("x", { archived_at: ARCHIVED_AT }), trust: 0.8 },
    { note: noteOf("c"), trust: 0.05 },
    { note: noteOf("w", { archived_at: ARCHIVED_AT }), trust: 0.9 },
  ];
  const plan = planOf(scored);
  assert.deepStrictEqual(
    plan.archive.map((entry) => entry.id),
    ["c", "a", "b"],
  );
  assert.deepStrictEqual(
    plan.restore.map((entry) => entry.id),
    ["x", "y", "w"],
  );
});

test("planOf of an empty list gives two empty lists", () => {
  assert.deepStrictEqual(planOf([]), { archive: [], restore: [] });
});

// The contract asserts in the callee are the oracle: each call must reach them without throwing.
test("planOf keeps the two lists disjoint", () => {
  planOf([
    { note: noteOf("to-archive"), trust: 0.1 },
    { note: noteOf("to-restore", { archived_at: ARCHIVED_AT }), trust: 0.9 },
  ]);
});

test("planOf archives only notes under the floor and not archived yet", () => {
  planOf([
    { note: noteOf("low-and-free"), trust: 0.1 },
    { note: noteOf("low-and-archived", { archived_at: ARCHIVED_AT }), trust: 0.1 },
  ]);
});

test("planOf restores only archived notes at the floor or above", () => {
  planOf([
    { note: noteOf("high-and-archived", { archived_at: ARCHIVED_AT }), trust: 0.9 },
    { note: noteOf("high-and-free"), trust: 0.9 },
  ]);
});

// restoredNoteOf

test("restoredNoteOf rejects a trust under the floor", () => {
  const note = noteOf("under");
  assert.throws(() => restoredNoteOf(note, UNDER_FLOOR), /restoredNoteOf: the trust is at the floor or above/);
  assert.throws(() => restoredNoteOf(note, 0), /restoredNoteOf: the trust is at the floor or above/);
});

test("restoredNoteOf builds the low note shape", () => {
  const note = noteOf("shaped", { what: OVER_LIMIT_WHAT, hits: 3, hits_related: 4 });
  assert.deepStrictEqual(restoredNoteOf(note, 0.8), {
    id: "shaped",
    trust: 0.8,
    text: AT_LIMIT_WHAT,
    when: WHEN,
    hits: 3,
    hits_related: 4,
  });
});

test("restoredNoteOf keeps a what at the limit unchanged", () => {
  const note = noteOf("at-limit", { what: AT_LIMIT_WHAT });
  assert.deepStrictEqual(restoredNoteOf(note, AT_FLOOR), {
    id: "at-limit",
    trust: AT_FLOOR,
    text: AT_LIMIT_WHAT,
    when: WHEN,
    hits: 0,
    hits_related: 0,
  });
});

// The contract asserts in the callee are the oracle: each call must reach them without throwing.
test("restoredNoteOf keeps the note id", () => {
  restoredNoteOf(noteOf("kept"), 0.8);
});

test("restoredNoteOf cuts what to the limit", () => {
  restoredNoteOf(noteOf("long", { what: OVER_LIMIT_WHAT }), AT_FLOOR);
});