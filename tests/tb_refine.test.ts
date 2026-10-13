import { describe, expect, test } from "bun:test";
import {
  COUNTERS_START,
  LOW_WHAT_CHARS,
  REFINE_NOTES_LIMIT,
  TRUST_FLOOR,
  lowNoteOf,
  refineReport,
  signalsOf,
  spreadOf,
  trustOf,
} from "../tools/tb/src/refine.ts";
import type { Note } from "../tools/tb/src/types.ts";

// Anchor dates, all UTC midnights so the day gaps stay whole.
// NOW is COUNTERS_START plus 90 days, one half life.
const NOW = new Date("2026-12-20T00:00:00.000Z");
const NOW_ISO = "2026-12-20T00:00:00.000Z";
const COUNTERS_START_ISO = "2026-09-21T00:00:00.000Z";
// COUNTERS_START plus 118 and 119 days: the floor crossing of a signal-less note.
const AFTER_118 = new Date("2027-01-17T00:00:00.000Z");
const AFTER_119 = new Date("2027-01-18T00:00:00.000Z");

type NoteFields = {
  id?: string;
  when?: string;
  what?: string;
  hits?: number;
  hits_related?: number;
  last_hit?: string;
  last_hit_related?: string;
};

// Note carries many fields: the tests fill only id, when, what and the counters, and cast.
function makeNote(fields: NoteFields): Note {
  return fields as Note;
}

describe("signalsOf", () => {
  test("signalsOf: when is an ISO date", () => {
    expect(() => signalsOf(makeNote({ id: "n", when: "not a date", what: "w" }), COUNTERS_START)).toThrow(
      "signalsOf: when is an ISO date",
    );
  });

  test("signalsOf: countersStart is a valid date", () => {
    expect(() => signalsOf(makeNote({ id: "n", when: NOW_ISO, what: "w" }), new Date("not a date"))).toThrow(
      "signalsOf: countersStart is a valid date",
    );
  });

  test("signalsOf: lastSignal is a valid date", () => {
    signalsOf(makeNote({ id: "n", when: NOW_ISO, what: "w", last_hit: "2026-10-05T00:00:00.000Z" }), COUNTERS_START);
  });

  test("signalsOf: without a signal the floor is the counters start", () => {
    signalsOf(makeNote({ id: "old", when: "2026-08-01T00:00:00.000Z", what: "old" }), COUNTERS_START);
  });

  test("a lone last_hit drives the last signal", () => {
    const result = signalsOf(
      makeNote({ id: "n", when: "2026-09-25T00:00:00.000Z", what: "w", hits: 7, last_hit: "2026-10-05T00:00:00.000Z" }),
      COUNTERS_START,
    );
    expect(result).toEqual({ hits: 7, hitsRelated: 0, lastSignal: new Date("2026-10-05T00:00:00.000Z") });
  });

  test("a lone last_hit_related drives the last signal", () => {
    const result = signalsOf(
      makeNote({
        id: "n",
        when: "2026-09-25T00:00:00.000Z",
        what: "w",
        hits_related: 4,
        last_hit_related: "2026-10-07T00:00:00.000Z",
      }),
      COUNTERS_START,
    );
    expect(result).toEqual({ hits: 0, hitsRelated: 4, lastSignal: new Date("2026-10-07T00:00:00.000Z") });
  });

  test("with both signals the most recent wins, related newer", () => {
    const result = signalsOf(
      makeNote({
        id: "n",
        when: "2026-09-25T00:00:00.000Z",
        what: "w",
        last_hit: "2026-10-01T00:00:00.000Z",
        last_hit_related: "2026-10-15T00:00:00.000Z",
      }),
      COUNTERS_START,
    );
    expect(result.lastSignal).toEqual(new Date("2026-10-15T00:00:00.000Z"));
  });

  test("with both signals the most recent wins, hit newer", () => {
    const result = signalsOf(
      makeNote({
        id: "n",
        when: "2026-09-25T00:00:00.000Z",
        what: "w",
        last_hit: "2026-10-20T00:00:00.000Z",
        last_hit_related: "2026-10-10T00:00:00.000Z",
      }),
      COUNTERS_START,
    );
    expect(result.lastSignal).toEqual(new Date("2026-10-20T00:00:00.000Z"));
  });

  test("without signals a when after the counters start counts from when", () => {
    const result = signalsOf(
      makeNote({ id: "later", when: "2026-10-30T00:00:00.000Z", what: "w", hits: 5, hits_related: 3 }),
      COUNTERS_START,
    );
    expect(result).toEqual({ hits: 5, hitsRelated: 3, lastSignal: new Date("2026-10-30T00:00:00.000Z") });
  });

  test("without signals a when before the counters start falls to the floor", () => {
    const result = signalsOf(makeNote({ id: "early", when: "2026-08-01T00:00:00.000Z", what: "w" }), COUNTERS_START);
    expect(result).toEqual({ hits: 0, hitsRelated: 0, lastSignal: COUNTERS_START });
  });

  test("without signals a when on the counters start stays there", () => {
    const result = signalsOf(makeNote({ id: "same", when: COUNTERS_START_ISO, what: "w" }), COUNTERS_START);
    expect(result).toEqual({ hits: 0, hitsRelated: 0, lastSignal: COUNTERS_START });
  });
});

describe("trustOf", () => {
  test("trustOf: hits is a whole number from 0", () => {
    expect(() => trustOf({ hits: -1, hitsRelated: 0, lastSignal: NOW }, NOW)).toThrow(
      "trustOf: hits is a whole number from 0",
    );
  });

  test("trustOf: hitsRelated is a whole number from 0", () => {
    expect(() => trustOf({ hits: 0, hitsRelated: 1.5, lastSignal: NOW }, NOW)).toThrow(
      "trustOf: hitsRelated is a whole number from 0",
    );
  });

  test("trustOf: lastSignal is a valid date", () => {
    expect(() => trustOf({ hits: 0, hitsRelated: 0, lastSignal: new Date("not a date") }, NOW)).toThrow(
      "trustOf: lastSignal is a valid date",
    );
  });

  test("trustOf: now is a valid date", () => {
    expect(() => trustOf({ hits: 0, hitsRelated: 0, lastSignal: NOW }, new Date("not a date"))).toThrow(
      "trustOf: now is a valid date",
    );
  });

  test("trustOf: the trust is between 0 and 1", () => {
    trustOf({ hits: 1000, hitsRelated: 1000, lastSignal: NOW }, NOW);
  });

  test("a note without hits and with the last signal now is worth 0.5", () => {
    expect(trustOf({ hits: 0, hitsRelated: 0, lastSignal: NOW }, NOW)).toBe(0.5);
  });

  test("the trust halves every 90 days", () => {
    expect(trustOf({ hits: 0, hitsRelated: 0, lastSignal: COUNTERS_START }, NOW)).toBe(0.25);
  });

  test("two half lives", () => {
    expect(trustOf({ hits: 0, hitsRelated: 0, lastSignal: new Date("2026-06-23T00:00:00.000Z") }, NOW)).toBe(0.125);
  });

  test("three half lives", () => {
    expect(trustOf({ hits: 0, hitsRelated: 0, lastSignal: new Date("2026-03-25T00:00:00.000Z") }, NOW)).toBe(0.0625);
  });

  test("a last signal in the future counts zero days", () => {
    expect(trustOf({ hits: 4, hitsRelated: 0, lastSignal: new Date("2026-12-30T00:00:00.000Z") }, NOW)).toBe(0.7);
  });

  test("the days count as fractions", () => {
    expect(trustOf({ hits: 0, hitsRelated: 0, lastSignal: new Date("2026-12-19T12:00:00.000Z") }, NOW)).toBeCloseTo(
      0.49807829,
      6,
    );
  });

  test("two hits add 0.1", () => {
    expect(trustOf({ hits: 2, hitsRelated: 0, lastSignal: NOW }, NOW)).toBe(0.6);
  });

  test("nine hits stay under the cap", () => {
    expect(trustOf({ hits: 9, hitsRelated: 0, lastSignal: NOW }, NOW)).toBe(0.95);
  });

  test("ten hits reach the cap", () => {
    expect(trustOf({ hits: 10, hitsRelated: 0, lastSignal: NOW }, NOW)).toBe(1);
  });

  test("ten related hits add 0.2", () => {
    expect(trustOf({ hits: 0, hitsRelated: 10, lastSignal: NOW }, NOW)).toBe(0.7);
  });

  test("eleven related hits are worth the same as ten", () => {
    expect(trustOf({ hits: 0, hitsRelated: 11, lastSignal: NOW }, NOW)).toBe(0.7);
  });

  test("counters above the cap change nothing", () => {
    expect(trustOf({ hits: 11, hitsRelated: 11, lastSignal: NOW }, NOW)).toBe(1);
  });

  test("six hits after two half lives sit exactly at the floor", () => {
    expect(trustOf({ hits: 6, hitsRelated: 0, lastSignal: new Date("2026-06-23T00:00:00.000Z") }, NOW)).toBe(0.2);
  });

  test("118 days without hits stay above the floor", () => {
    expect(trustOf({ hits: 0, hitsRelated: 0, lastSignal: COUNTERS_START }, AFTER_118)).toBeGreaterThan(TRUST_FLOOR);
  });

  test("119 days without hits drop below the floor", () => {
    expect(trustOf({ hits: 0, hitsRelated: 0, lastSignal: COUNTERS_START }, AFTER_119)).toBeLessThan(TRUST_FLOOR);
  });
});

describe("spreadOf", () => {
  test("spreadOf: every trust is between 0 and 1", () => {
    expect(() => spreadOf([0.5, 1.5])).toThrow("spreadOf: every trust is between 0 and 1");
  });

  test("spreadOf: there is one bin per tenth", () => {
    spreadOf([]);
  });

  test("spreadOf: the total counts every trust", () => {
    spreadOf([0.5, 0.7, 0.15]);
  });

  test("spreadOf: the bins add up to the total", () => {
    spreadOf([0.05, 0.95, 0.5]);
  });

  test("spreadOf: the notes below the floor are part of the total", () => {
    spreadOf([0.1, 0.3]);
  });

  test("no trusts make an empty spread", () => {
    expect(spreadOf([])).toEqual({ bins: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], total: 0, belowFloor: 0 });
  });

  test("trust 0 lands in the first bin, below the floor", () => {
    expect(spreadOf([0])).toEqual({ bins: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0], total: 1, belowFloor: 1 });
  });

  test("trust 0.09 stays in the first bin", () => {
    expect(spreadOf([0.09])).toEqual({ bins: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0], total: 1, belowFloor: 1 });
  });

  test("trust 0.1 opens the second bin", () => {
    expect(spreadOf([0.1])).toEqual({ bins: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0], total: 1, belowFloor: 1 });
  });

  test("trust 0.19 is below the floor", () => {
    expect(spreadOf([0.19])).toEqual({ bins: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0], total: 1, belowFloor: 1 });
  });

  test("trust 0.2 sits at the floor, not below it", () => {
    expect(spreadOf([0.2])).toEqual({ bins: [0, 0, 1, 0, 0, 0, 0, 0, 0, 0], total: 1, belowFloor: 0 });
  });

  test("trust 1 lands in the last bin", () => {
    expect(spreadOf([1])).toEqual({ bins: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1], total: 1, belowFloor: 0 });
  });

  test("a mixed spread", () => {
    expect(spreadOf([0.05, 0.15, 0.25, 0.5, 0.75, 0.95, 1])).toEqual({
      bins: [1, 1, 1, 0, 0, 1, 0, 1, 0, 2],
      total: 7,
      belowFloor: 2,
    });
  });
});

describe("lowNoteOf", () => {
  test("lowNoteOf: the trust is under the floor", () => {
    expect(() => lowNoteOf(makeNote({ id: "n", when: NOW_ISO, what: "w" }), TRUST_FLOOR)).toThrow(
      "lowNoteOf: the trust is under the floor",
    );
  });

  test("lowNoteOf: the id is the note id", () => {
    lowNoteOf(makeNote({ id: "keep", when: NOW_ISO, what: "w" }), 0.1);
  });

  test("lowNoteOf: what is cut to the limit", () => {
    lowNoteOf(makeNote({ id: "long", when: NOW_ISO, what: "w".repeat(200) }), 0.1);
  });

  test("copies the note with its counters", () => {
    expect(
      lowNoteOf(
        makeNote({
          id: "full",
          when: "2026-10-01T00:00:00.000Z",
          what: "a short what",
          hits: 3,
          hits_related: 2,
        }),
        0.15,
      ),
    ).toEqual({
      id: "full",
      trust: 0.15,
      what: "a short what",
      when: "2026-10-01T00:00:00.000Z",
      hits: 3,
      hits_related: 2,
    });
  });

  test("a what of exactly 80 characters is kept whole", () => {
    expect(lowNoteOf(makeNote({ id: "eighty", when: NOW_ISO, what: "e".repeat(LOW_WHAT_CHARS) }), 0.19)).toEqual({
      id: "eighty",
      trust: 0.19,
      what: "e".repeat(LOW_WHAT_CHARS),
      when: NOW_ISO,
      hits: 0,
      hits_related: 0,
    });
  });

  test("a what of 81 characters is cut to 80, no ellipsis", () => {
    expect(
      lowNoteOf(makeNote({ id: "over", when: NOW_ISO, what: "o".repeat(LOW_WHAT_CHARS + 1) }), 0.05),
    ).toEqual({
      id: "over",
      trust: 0.05,
      what: "o".repeat(LOW_WHAT_CHARS),
      when: NOW_ISO,
      hits: 0,
      hits_related: 0,
    });
  });

  test("missing counters default to 0", () => {
    expect(lowNoteOf(makeNote({ id: "bare", when: NOW_ISO, what: "bare" }), 0.05)).toEqual({
      id: "bare",
      trust: 0.05,
      what: "bare",
      when: NOW_ISO,
      hits: 0,
      hits_related: 0,
    });
  });
});

describe("refineReport", () => {
  test("refineReport: the read is not cut by the limit", () => {
    const notes = Array.from({ length: REFINE_NOTES_LIMIT }, (_, i) => makeNote({ id: `n${i}`, when: NOW_ISO, what: "w" }));
    expect(() => refineReport(notes, NOW, COUNTERS_START)).toThrow("refineReport: the read is not cut by the limit");
  });

  test("refineReport: the spread counts every note", () => {
    refineReport(
      [
        makeNote({ id: "a", when: NOW_ISO, what: "a" }),
        makeNote({ id: "b", when: COUNTERS_START_ISO, what: "b" }),
        makeNote({ id: "c", when: "2026-08-01T00:00:00.000Z", what: "c" }),
      ],
      NOW,
      COUNTERS_START,
    );
  });

  test("refineReport: one low note per trust below the floor", () => {
    refineReport(
      [makeNote({ id: "gone", when: "2026-02-01T00:00:00.000Z", what: "gone", last_hit: "2026-03-25T00:00:00.000Z" })],
      NOW,
      COUNTERS_START,
    );
  });

  test("9999 notes stay just under the limit", () => {
    const notes = Array.from({ length: REFINE_NOTES_LIMIT - 1 }, (_, i) =>
      makeNote({ id: `n${i}`, when: NOW_ISO, what: "w" }),
    );
    refineReport(notes, NOW, COUNTERS_START);
  });

  test("no notes make an empty report", () => {
    expect(refineReport([], NOW, COUNTERS_START)).toEqual({
      spread: { bins: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], total: 0, belowFloor: 0 },
      low: [],
    });
  });

  test("composes signals, trust and spread, low sorted by trust then id", () => {
    const notes = [
      makeNote({ id: "fresh", when: NOW_ISO, what: "fresh", hits: 10, hits_related: 10, last_hit: NOW_ISO }),
      makeNote({ id: "young", when: NOW_ISO, what: "young" }),
      makeNote({ id: "nose", when: COUNTERS_START_ISO, what: "nose" }),
      makeNote({ id: "edge", when: "2026-06-01T00:00:00.000Z", what: "edge", hits: 6, last_hit: "2026-06-23T00:00:00.000Z" }),
      makeNote({ id: "zz", when: "2026-06-01T00:00:00.000Z", what: "zz", last_hit: "2026-06-23T00:00:00.000Z" }),
      makeNote({ id: "aa", when: "2026-05-01T00:00:00.000Z", what: "a".repeat(90), last_hit: "2026-06-23T00:00:00.000Z" }),
      makeNote({ id: "gone", when: "2026-02-01T00:00:00.000Z", what: "gone", last_hit: "2026-03-25T00:00:00.000Z" }),
    ];
    expect(refineReport(notes, NOW, COUNTERS_START)).toEqual({
      spread: { bins: [1, 2, 2, 0, 0, 1, 0, 0, 0, 1], total: 7, belowFloor: 3 },
      low: [
        {
          id: "gone",
          trust: 0.0625,
          what: "gone",
          when: "2026-02-01T00:00:00.000Z",
          hits: 0,
          hits_related: 0,
        },
        {
          id: "aa",
          trust: 0.125,
          what: "a".repeat(LOW_WHAT_CHARS),
          when: "2026-05-01T00:00:00.000Z",
          hits: 0,
          hits_related: 0,
        },
        {
          id: "zz",
          trust: 0.125,
          what: "zz",
          when: "2026-06-01T00:00:00.000Z",
          hits: 0,
          hits_related: 0,
        },
      ],
    });
  });

  test("a signal-less note before the counters start is worth 0.5 on the first day", () => {
    const notes = [makeNote({ id: "old", when: "2026-08-01T00:00:00.000Z", what: "old" })];
    expect(refineReport(notes, COUNTERS_START, COUNTERS_START)).toEqual({
      spread: { bins: [0, 0, 0, 0, 0, 1, 0, 0, 0, 0], total: 1, belowFloor: 0 },
      low: [],
    });
  });

  test("after 118 days the same note is still above the floor", () => {
    const notes = [makeNote({ id: "old", when: "2026-08-01T00:00:00.000Z", what: "old" })];
    expect(refineReport(notes, AFTER_118, COUNTERS_START)).toEqual({
      spread: { bins: [0, 0, 1, 0, 0, 0, 0, 0, 0, 0], total: 1, belowFloor: 0 },
      low: [],
    });
  });

  test("after 119 days it drops below the floor", () => {
    const notes = [makeNote({ id: "old", when: "2026-08-01T00:00:00.000Z", what: "old" })];
    const report = refineReport(notes, AFTER_119, COUNTERS_START);
    expect(report.spread.total).toBe(1);
    expect(report.spread.belowFloor).toBe(1);
    expect(report.low.length).toBe(1);
    expect(report.low[0].id).toBe("old");
    expect(report.low[0].trust).toBeLessThan(TRUST_FLOOR);
  });
});