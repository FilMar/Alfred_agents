import { describe, expect, it } from "bun:test";
import {
  NEAR_ITEMS_LIMIT,
  cosine,
  nearPairs,
  topPairs,
  vectorSetOf,
  type Pair,
  type VectorSet,
  type Vectored,
} from "../tools/tb/src/near.ts";

function item(id: string, vector: readonly number[]): Vectored {
  return { id, vector };
}

// The brand is nominal and the spec says vectorSetOf returns `{ items }` cast
// to VectorSet, so the tests build sets directly.
function setOf(...items: readonly Vectored[]): VectorSet {
  return { items } as VectorSet;
}

function pair(a: string, b: string, score: number): Pair {
  return { a, b, score };
}

function manyItems(count: number): Vectored[] {
  return Array.from({ length: count }, (_, i) => item(`n${i}`, [1]));
}

// p and q point the same way, r cuts both, s points against them.
const setPQRS = setOf(item("p", [1, 0]), item("q", [1, 0]), item("r", [0, 1]), item("s", [-1, 0]));
// Enumeration meets (t, v) before (t, u), both at score 0.
const setTVU = setOf(item("t", [1, 0]), item("v", [0, -1]), item("u", [0, 1]));
// The earlier item has the later id.
const setZA = setOf(item("z", [1, 0]), item("a", [1, 0]));
const setALONE = setOf(item("x", [1, 0]));
const setEMPTY = setOf();
const setORTH = setOf(item("m", [1, 0]), item("n", [0, 1]));

// Out of score order on purpose: topPairs keeps the input order.
const pairA = pair("a", "b", 0.5);
const pairB = pair("a", "c", 0.9);
const pairC = pair("b", "c", 0.7);
const pairsABC = [pairA, pairB, pairC];

describe("vectorSetOf", () => {
  it("keeps every item", () => {
    vectorSetOf([item("a", [1]), item("b", [2])]);
  });

  it("wraps the same array", () => {
    const items = [item("a", [1]), item("b", [2])];
    expect(vectorSetOf(items).items).toBe(items);
  });

  it("accepts no items", () => {
    vectorSetOf([]);
  });

  it("accepts exactly NEAR_ITEMS_LIMIT items", () => {
    vectorSetOf(manyItems(NEAR_ITEMS_LIMIT));
  });

  it("accepts one under NEAR_ITEMS_LIMIT items", () => {
    vectorSetOf(manyItems(NEAR_ITEMS_LIMIT - 1));
  });

  it("throws above NEAR_ITEMS_LIMIT items", () => {
    expect(() => vectorSetOf(manyItems(NEAR_ITEMS_LIMIT + 1))).toThrow("vectorSetOf: at most NEAR_ITEMS_LIMIT items");
  });

  it("throws when an id appears twice", () => {
    expect(() => vectorSetOf([item("a", [1]), item("a", [2])])).toThrow("vectorSetOf: no id twice");
  });

  it("throws when vector lengths differ", () => {
    expect(() => vectorSetOf([item("a", [1, 2]), item("b", [1])])).toThrow("vectorSetOf: every vector has the same length");
  });

  it("throws on a zero vector", () => {
    expect(() => vectorSetOf([item("a", [1, 0]), item("b", [0, 0])])).toThrow("vectorSetOf: no zero vector");
  });
});

describe("cosine", () => {
  it("returns a score between -1 and 1", () => {
    cosine([1, 0], [1, 0]);
  });

  it.each([
    [[1, 0], [1, 0], 1],
    [[1, 0], [0, 1], 0],
    [[1, 0], [-1, 0], -1],
    [[3, 4], [4, 3], 24 / 25],
    [[1, 2], [3, 4], 11 / (5 * Math.sqrt(5))],
  ])("cosine(%j, %j) is close to %j", (left: readonly number[], right: readonly number[], expected: number) => {
    expect(cosine(left, right)).toBeCloseTo(expected, 10);
  });

  it("throws when the lengths differ", () => {
    expect(() => cosine([1], [1, 2])).toThrow("cosine: same length");
  });

  it("throws when the left vector is zero", () => {
    expect(() => cosine([0, 0], [1, 2])).toThrow("cosine: left is not a zero vector");
  });

  it("throws when the right vector is zero", () => {
    expect(() => cosine([1, 2], [0, 0])).toThrow("cosine: right is not a zero vector");
  });

  it("throws when both vectors are empty", () => {
    expect(() => cosine([], [])).toThrow("cosine: left is not a zero vector");
  });
});

describe("nearPairs", () => {
  it("breaks score ties by a, then b", () => {
    nearPairs(setOf(item("c", [1, 0]), item("a", [1, 0]), item("b", [1, 0])), 0.5);
  });

  it("gives two different known ids, each pair once", () => {
    nearPairs(setPQRS, -1);
  });

  it("keeps every score at or above min", () => {
    nearPairs(setPQRS, 0);
  });

  it("puts the closest pair first", () => {
    nearPairs(setPQRS, -0.5);
  });

  it("accepts a min of -1", () => {
    nearPairs(setPQRS, -1);
  });

  it("accepts a min of 1", () => {
    nearPairs(setPQRS, 1);
  });

  it("accepts a min just inside the range", () => {
    nearPairs(setPQRS, 0.999);
    nearPairs(setPQRS, -0.999);
  });

  it("throws when min is above 1", () => {
    expect(() => nearPairs(setPQRS, 1.0001)).toThrow("nearPairs: min is between -1 and 1");
  });

  it("throws when min is below -1", () => {
    expect(() => nearPairs(setPQRS, -1.0001)).toThrow("nearPairs: min is between -1 and 1");
  });

  it("throws when min is not a number", () => {
    expect(() => nearPairs(setPQRS, Number.NaN)).toThrow("nearPairs: min is between -1 and 1");
  });

  it.each([
    [
      "keeps the pairs at min, closest first, ties by a then b",
      setPQRS,
      0,
      [pair("p", "q", 1), pair("p", "r", 0), pair("q", "r", 0), pair("r", "s", 0)],
    ],
    [
      "keeps every pair at the bottom edge",
      setPQRS,
      -1,
      [
        pair("p", "q", 1),
        pair("p", "r", 0),
        pair("q", "r", 0),
        pair("r", "s", 0),
        pair("p", "s", -1),
        pair("q", "s", -1),
      ],
    ],
    ["keeps only the perfect match at the top edge", setPQRS, 1, [pair("p", "q", 1)]],
    ["breaks ties by a then b, whatever the input order", setTVU, 0, [pair("t", "u", 0), pair("t", "v", 0)]],
    ["names the earlier item a, whatever the id order", setZA, 0, [pair("z", "a", 1)]],
    ["returns nothing from a single item", setALONE, -1, []],
    ["returns nothing below min", setORTH, 0.5, []],
    ["returns nothing from no items", setEMPTY, -1, []],
  ])("%s", (name: string, set: VectorSet, min: number, expected: readonly Pair[]) => {
    expect(nearPairs(set, min)).toEqual(expected);
  });
});

describe("topPairs", () => {
  it("holds the limit and cuts nothing else", () => {
    topPairs(pairsABC, 2);
  });

  it("keeps everything when the limit passes the length", () => {
    topPairs(pairsABC, 5);
  });

  it("accepts a limit of one", () => {
    topPairs(pairsABC, 1);
  });

  it("throws when the limit is zero", () => {
    expect(() => topPairs(pairsABC, 0)).toThrow("topPairs: limit is a positive integer");
  });

  it("throws when the limit is negative", () => {
    expect(() => topPairs(pairsABC, -1)).toThrow("topPairs: limit is a positive integer");
  });

  it("throws when the limit is not an integer", () => {
    expect(() => topPairs(pairsABC, 1.5)).toThrow("topPairs: limit is a positive integer");
  });

  it.each([
    ["cuts at the limit, keeping the input order", pairsABC, 2, [pairA, pairB]],
    ["keeps only the first at one", pairsABC, 1, [pairA]],
    ["keeps everything when the limit meets the length", pairsABC, 3, [pairA, pairB, pairC]],
    ["keeps everything when the limit passes the length", pairsABC, 5, [pairA, pairB, pairC]],
    ["keeps nothing when there is nothing", [], 1, []],
  ])("%s", (name: string, pairs: readonly Pair[], limit: number, expected: readonly Pair[]) => {
    expect(topPairs(pairs, limit)).toEqual(expected);
  });
});