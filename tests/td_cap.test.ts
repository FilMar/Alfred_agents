// Tests for the per-session cap of `td distill`, written from the contracts
// in cap.ts: preconditions throw with their assert message, postconditions
// are bare calls checked by the asserts inside, classifiers get tables.

import { expect, test } from "bun:test";

import {
  SESSION_CAP_DEFAULT,
  capOf,
  emptyExtraction,
  fullMeansReached,
  isCapOrNull,
  isCount,
  isSkippable,
  listWithinCap,
  noCapNeverFull,
  sessionIsFull,
} from "../tools/td/src/cap.ts";

// The shape of an Extraction as isSkippable sees it; derived from the export,
// so the test never imports a private member of another module.
type Extraction = Parameters<typeof isSkippable>[0];

function anExtraction(ok: boolean, notes: unknown[] = [], rules: unknown[] = []): Extraction {
  return { answer: { isOk: () => ok }, notes, rules } as unknown as Extraction;
}

test("isCount: a non-negative integer", () => {
  expect(isCount(0)).toBe(true); // the edge of the range
  expect(isCount(1)).toBe(true); // just inside
  expect(isCount(-1)).toBe(false); // just outside
  expect(isCount(0.5)).toBe(false); // not an integer
  expect(isCount(NaN)).toBe(false);
  expect(isCount(Infinity)).toBe(false);
});

test("isCapOrNull: a positive integer or no cap at all", () => {
  expect(isCapOrNull(null)).toBe(true);
  expect(isCapOrNull(1)).toBe(true); // the smallest cap
  expect(isCapOrNull(SESSION_CAP_DEFAULT)).toBe(true); // the CLI default
  expect(isCapOrNull(0)).toBe(false); // just outside: not positive
  expect(isCapOrNull(-1)).toBe(false);
  expect(isCapOrNull(2.5)).toBe(false); // not an integer
  expect(isCapOrNull(NaN)).toBe(false);
});

test("noCapNeverFull: only a capped session can be full", () => {
  expect(noCapNeverFull(null, false)).toBe(true);
  expect(noCapNeverFull(null, true)).toBe(false); // full without a cap is a broken state
  expect(noCapNeverFull(4, false)).toBe(true);
  expect(noCapNeverFull(4, true)).toBe(true);
});

test("fullMeansReached: a full session decided at least the cap", () => {
  expect(fullMeansReached(0, null, false)).toBe(true);
  expect(fullMeansReached(0, null, true)).toBe(false); // full without a cap is a broken state
  expect(fullMeansReached(0, 1, true)).toBe(false); // one below the smallest cap
  expect(fullMeansReached(3, 4, true)).toBe(false); // one below the default cap
  expect(fullMeansReached(4, 4, true)).toBe(true); // at the cap
  expect(fullMeansReached(5, 4, true)).toBe(true); // past the cap
  expect(fullMeansReached(3, 4, false)).toBe(true); // not full is always fine
});

test("isSkippable: an ok answer with nothing decided", () => {
  expect(isSkippable(anExtraction(true))).toBe(true);
  expect(isSkippable(anExtraction(true, [{}]))).toBe(false); // one note
  expect(isSkippable(anExtraction(true, [], [{}]))).toBe(false); // one rule
  expect(isSkippable(anExtraction(false))).toBe(false); // a failed answer
  expect(isSkippable(anExtraction(false, [{}], [{}]))).toBe(false);
});

test("sessionIsFull: saved is a count", () => {
  expect(() => sessionIsFull(-1, null)).toThrow("sessionIsFull: saved is a count"); // just outside
  expect(() => sessionIsFull(0.5, null)).toThrow("sessionIsFull: saved is a count"); // not an integer
  expect(() => sessionIsFull(NaN, null)).toThrow("sessionIsFull: saved is a count");
});

test("sessionIsFull: the cap is a positive integer or null", () => {
  expect(() => sessionIsFull(0, 0)).toThrow("sessionIsFull: the cap is a positive integer or null"); // just outside
  expect(() => sessionIsFull(0, -1)).toThrow("sessionIsFull: the cap is a positive integer or null");
  expect(() => sessionIsFull(0, 2.5)).toThrow("sessionIsFull: the cap is a positive integer or null");
});

test("sessionIsFull: with no cap a session is never full", () => {
  sessionIsFull(0, null); // nothing saved yet
  sessionIsFull(SESSION_CAP_DEFAULT, null); // the default saved, still no cap
});

test("sessionIsFull: a full session has reached its cap", () => {
  sessionIsFull(0, 1); // one below the smallest cap
  sessionIsFull(1, 1); // at the smallest cap
  sessionIsFull(3, 4); // one below the default cap
  sessionIsFull(4, 4); // at the default cap
  sessionIsFull(5, 4); // past the default cap
});

test("capOf: raw is text", () => {
  expect(() => capOf(4 as unknown as string)).toThrow("capOf: raw is text");
  expect(() => capOf(null as unknown as string)).toThrow("capOf: raw is text");
});

test("capOf: the cap is a positive integer or null", () => {
  capOf("1"); // the smallest cap
  capOf("2"); // just inside
  capOf(String(SESSION_CAP_DEFAULT)); // the CLI default
  capOf("0"); // just outside: zero is not positive
  capOf("2.5"); // outside: fractional
  capOf("-1"); // outside: negative
  capOf("4abc"); // outside: not only digits
  capOf(""); // outside: empty
});

test("emptyExtraction: an ok answer with no note and no rule", () => {
  emptyExtraction();
});

test.each([
  { saved: 0, cap: null, full: false },
  { saved: 4, cap: null, full: false },
  { saved: 0, cap: 1, full: false },
  { saved: 1, cap: 1, full: true },
  { saved: 3, cap: 4, full: false },
  { saved: 4, cap: 4, full: true },
  { saved: 5, cap: 4, full: true },
  { saved: 0, cap: 4, full: false },
])("sessionIsFull outcome table: saved=$saved cap=$cap", ({ saved, cap, full }) => {
  expect(sessionIsFull(saved, cap)).toBe(full);
});

test.each([
  { raw: "4", cap: 4 },
  { raw: "1", cap: 1 },
  { raw: "12", cap: 12 },
  { raw: "04", cap: 4 },
  { raw: "0", cap: null },
  { raw: "00", cap: null },
  { raw: "-1", cap: null },
  { raw: "+4", cap: null },
  { raw: "2.5", cap: null },
  { raw: "4abc", cap: null },
  { raw: "abc", cap: null },
  { raw: "", cap: null },
  { raw: " 4", cap: null },
  { raw: "1e3", cap: null },
])("capOf outcome table: raw=$raw", ({ raw, cap }) => {
  expect(capOf(raw)).toBe(cap);
});

test("emptyExtraction holds an ok answer and no candidate", () => {
  const extraction = emptyExtraction();
  expect(extraction.answer.isOk()).toBe(true);
  expect(extraction.notes).toEqual([]);
  expect(extraction.rules).toEqual([]);
});

test.each([
  { size: 0, cap: null, within: true },
  { size: 9, cap: null, within: true },
  { size: 3, cap: 4, within: true },
  { size: 4, cap: 4, within: true },
  { size: 5, cap: 4, within: false },
])("listWithinCap: size=$size cap=$cap", ({ size, cap, within }) => {
  expect(listWithinCap(size, cap)).toBe(within);
});
