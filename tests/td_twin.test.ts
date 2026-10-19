import { describe, expect, it } from "bun:test";
import {
  SAME_SESSION_CUTOFF_DEFAULT,
  allSameLength,
  cosine,
  cutoffOf,
  bothHaveNorm,
  hasNorm,
  inUnitRange,
  isCutoff,
  isCutoffOrNull,
  sameLength,
  twinIsNearest,
  twinOf,
  twinReaches,
  type SessionVector,
  type Twin,
} from "../tools/td/src/twin.ts";

describe("SAME_SESSION_CUTOFF_DEFAULT", () => {
  it("is 0.75, the default of the CLI", () => {
    expect(SAME_SESSION_CUTOFF_DEFAULT).toBe(0.75);
  });
});

describe("isCutoff", () => {
  it("is true only for a finite number above 0 and at most 1", () => {
    const table: Array<[number, boolean]> = [
      [Number.MIN_VALUE, true], // the smallest number above 0
      [0.000000001, true], // just inside, above 0
      [0.5, true],
      [0.8, true],
      [1, true], // at the edge: 1 is a cutoff
      [-0, false], // -0 is 0
      [0, false], // at the edge: 0 is not a cutoff
      [-0.5, false],
      [-1, false],
      [1.0000000001, false], // just outside, above 1
      [1.1, false],
      [2, false],
      [NaN, false],
      [Infinity, false],
      [-Infinity, false],
    ];
    for (const [value, expected] of table) {
      expect(isCutoff(value)).toBe(expected);
    }
  });
});

describe("isCutoffOrNull", () => {
  it("is true for null, and for a finite number above 0 and at most 1", () => {
    const table: Array<[number | null, boolean]> = [
      [null, true], // null is allowed
      [0.000000001, true], // just inside, above 0
      [0.5, true],
      [0.8, true],
      [1, true], // at the edge
      [-0, false],
      [0, false], // at the edge: 0 is excluded
      [1.0000000001, false], // just outside, above 1
      [1.1, false],
      [-0.5, false],
      [NaN, false],
      [Infinity, false],
    ];
    for (const [value, expected] of table) {
      expect(isCutoffOrNull(value)).toBe(expected);
    }
  });
});

describe("sameLength", () => {
  it("is true only for two vectors of the same length", () => {
    const table: Array<[readonly number[], readonly number[], boolean]> = [
      [[], [], true],
      [[1], [2], true], // the components do not matter, only the length
      [[1, 2], [3, 4], true],
      [[1], [], false],
      [[], [1], false],
      [[1, 2], [1], false],
      [[1], [1, 2], false],
      [[1, 2, 3], [1, 2], false],
    ];
    for (const [a, b, expected] of table) {
      expect(sameLength(a, b)).toBe(expected);
    }
  });
});

describe("allSameLength", () => {
  it("is true when every item has a vector as long as the vector", () => {
    const table: Array<[readonly number[], readonly SessionVector[], boolean]> = [
      [[1, 2], [], true], // no items: the rule holds for every one of them
      [[], [], true],
      [[], [{ key: "a", vector: [] }], true], // both empty have the same length
      [[1, 2], [{ key: "a", vector: [1, 2] }], true],
      [[1, 2], [{ key: "a", vector: [3, 4] }, { key: "b", vector: [5, 6] }], true],
      [[1, 2], [{ key: "a", vector: [1] }], false], // an item shorter than the vector
      [[1, 2], [{ key: "a", vector: [1, 2, 3] }], false], // an item longer than the vector
      [[1], [{ key: "a", vector: [1] }, { key: "b", vector: [1, 2] }], false], // one item among the good ones
    ];
    for (const [vector, items, expected] of table) {
      expect(allSameLength(vector, items)).toBe(expected);
    }
  });
});

describe("hasNorm", () => {
  it("is true only for a vector with a component other than zero", () => {
    const table: Array<[readonly number[], boolean]> = [
      [[1, 0], true],
      [[0, 1], true],
      [[0.0001, 0], true], // a small component is still a norm
      [[-1, 0], true], // a negative component is not zero
      [[1, 2, 3], true],
      [[0], false],
      [[0, 0, 0], false], // all zeros: no norm
      [[], false], // no component: no norm
    ];
    for (const [vector, expected] of table) {
      expect(hasNorm(vector)).toBe(expected);
    }
  });
});

describe("inUnitRange", () => {
  it("is true only for a number between -1 and 1, within the tolerance", () => {
    const table: Array<[number, boolean]> = [
      [0, true],
      [0.5, true],
      [-0.5, true],
      [1, true], // at the edge of the range of the cosine
      [-1, true],
      [1 + 1e-9, true], // at the edge of the tolerance
      [-1 - 1e-9, true],
      [1.00000001, false], // just outside the tolerance
      [-1.00000001, false],
      [2, false],
      [-2, false],
      [NaN, false],
      [Infinity, false],
      [-Infinity, false],
    ];
    for (const [value, expected] of table) {
      expect(inUnitRange(value)).toBe(expected);
    }
  });
});

describe("twinReaches", () => {
  it("is true for no twin, and for a twin whose score is at least the cutoff", () => {
    const table: Array<[Twin | null, number, boolean]> = [
      [null, 0.8, true], // no twin always reaches
      [null, 1, true],
      [{ key: "a", score: 0.8 }, 0.8, true], // a score equal to the cutoff reaches: at least the cutoff
      [{ key: "a", score: 1 }, 1, true], // the same at the edge cutoff 1
      [{ key: "a", score: 1 }, 0.8, true], // above the cutoff
      [{ key: "a", score: 0.79 }, 0.8, false], // below the cutoff
      [{ key: "a", score: 0 }, 0.8, false],
    ];
    for (const [twin, cutoff, expected] of table) {
      expect(twinReaches(twin, cutoff)).toBe(expected);
    }
  });
});

describe("twinIsNearest", () => {
  it("checks that the twin is the first nearest item, and that without a twin nothing reaches the cutoff", () => {
    // the cosines below are exact: 1 for [1, 0] and [1, 0], 0 for [1, 0] and [0, 1], -1 for [1, 0] and [-1, 0]
    const table: Array<[Twin | null, readonly number[], readonly SessionVector[], number, boolean]> = [
      // without a twin, no item may reach the cutoff
      [null, [1, 0], [], 0.8, true], // no items at all
      [null, [1, 0], [{ key: "a", vector: [0, 1] }], 0.8, true], // the nearest cosine is 0, below 0.8
      [null, [1, 0], [{ key: "a", vector: [-1, 0] }], 0.5, true], // the nearest cosine is -1
      [null, [1, 0], [{ key: "a", vector: [1, 0] }], 0.8, false], // the nearest cosine is 1: a twin should exist
      [null, [1, 0], [{ key: "a", vector: [1, 0] }], 1, false], // the cosine 1 equals the cutoff 1
      // the twin must be the first of the nearest items
      [{ key: "a", score: 1 }, [1, 0], [{ key: "a", vector: [1, 0] }], 0.8, true],
      [{ key: "a", score: 1 }, [1, 0], [{ key: "b", vector: [1, 0] }], 0.8, false], // the key of another item
      [{ key: "a", score: 0.5 }, [1, 0], [{ key: "a", vector: [1, 0] }], 0.8, false], // the score is not the nearest
      [{ key: "b", score: 1 }, [1, 0], [{ key: "a", vector: [0, 1] }, { key: "b", vector: [1, 0] }], 0.5, true], // the nearest is the second item
      [{ key: "a", score: 1 }, [1, 0], [{ key: "a", vector: [1, 0] }, { key: "b", vector: [1, 0] }], 0.5, true], // a tie: the first wins
      [{ key: "b", score: 1 }, [1, 0], [{ key: "a", vector: [1, 0] }, { key: "b", vector: [1, 0] }], 0.5, false], // a tie: the second does not win
    ];
    for (const [twin, vector, items, cutoff, expected] of table) {
      expect(twinIsNearest(twin, vector, items, cutoff)).toBe(expected);
    }
  });
});

describe("cosine", () => {
  it("rejects empty vectors", () => {
    expect(() => cosine([], [])).toThrow("cosine: the vectors are not empty");
    expect(() => cosine([], [1])).toThrow("cosine: the vectors are not empty");
  });

  it("rejects vectors of different lengths", () => {
    expect(() => cosine([1, 0], [1])).toThrow("cosine: the vectors have the same length");
    expect(() => cosine([1], [1, 0])).toThrow("cosine: the vectors have the same length");
  });

  it("rejects an all-zero vector", () => {
    expect(() => cosine([0, 0], [1, 0])).toThrow("cosine: neither vector is all zeros");
    expect(() => cosine([1, 0], [0, 0])).toThrow("cosine: neither vector is all zeros");
  });

  it("returns the cosine of the two vectors, a number between -1 and 1", () => {
    // the contract asserts: "cosine: the cosine is between -1 and 1"
    cosine([1, 0], [1, 0]); // 1: at the edge of the range
    cosine([1, 0], [-1, 0]); // -1: at the other edge
    cosine([1, 0], [0, 1]); // 0
    cosine([1, 0], [-1, 1]); // about -0.71
    cosine([3, 4], [4, 3]); // 0.96
    cosine([1, 2, 3], [2, 4, 6]); // 1: the same direction
    cosine([1], [2]); // 1: a single component
  });
});

describe("twinOf", () => {
  it("rejects a cutoff that is not a number above 0 and at most 1", () => {
    const cutoffs = [
      -0, // -0 is 0
      0, // at the edge: 0 is excluded
      -0.5,
      -1,
      1.0000000001, // just outside, above 1
      1.1,
      2,
      NaN,
      Infinity,
      -Infinity,
    ];
    for (const cutoff of cutoffs) {
      expect(() => twinOf([1, 0], [], cutoff)).toThrow("twinOf: the cutoff is a number above 0 and at most 1");
    }
  });

  it("rejects an item whose vector is not as long as the vector", () => {
    expect(() => twinOf([1, 0], [{ key: "a", vector: [1, 0, 0] }], 0.8)).toThrow(
      "twinOf: every item has a vector as long as the vector",
    );
    expect(() => twinOf([1], [{ key: "a", vector: [1, 2] }], 0.8)).toThrow(
      "twinOf: every item has a vector as long as the vector",
    );
    expect(() => twinOf([1, 0], [{ key: "a", vector: [1, 0] }, { key: "b", vector: [1] }], 0.8)).toThrow(
      "twinOf: every item has a vector as long as the vector",
    );
  });

  it("returns a twin that reaches the cutoff, or no twin", () => {
    // the contract asserts: "twinOf: a twin reaches the cutoff"
    twinOf([1, 0], [{ key: "a", vector: [1, 0] }], 1); // cosine 1, equal to the cutoff 1: at least the cutoff
    twinOf([1, 0], [{ key: "a", vector: [1, 1] }], 0.7); // cosine about 0.71, at or above 0.7
    twinOf([1, 0], [{ key: "a", vector: [0, 1] }], 1e-9); // cosine 0 reaches a cutoff just above 0
    twinOf([1, 0], [{ key: "a", vector: [1, 1] }], 0.8); // cosine about 0.71, below 0.8: no twin
    twinOf([1, 0], [{ key: "a", vector: [-1, 0] }], 0.5); // cosine -1: no twin
  });

  it("returns the first nearest item, and no twin when nothing reaches the cutoff", () => {
    // the contract asserts: "twinOf: the twin is the first nearest item, and without a twin no item reaches the cutoff"
    twinOf([1, 0], [], 0.8); // no items: no twin
    twinOf([1, 0], [{ key: "a", vector: [1, 0] }, { key: "b", vector: [1, 0] }], 0.5); // a tie: the first wins
    twinOf([1, 0], [{ key: "a", vector: [1, 0] }, { key: "b", vector: [1, 0] }, { key: "c", vector: [1, 0] }], 1); // a tie at the cutoff 1
    twinOf([1, 0], [{ key: "a", vector: [0, 1] }, { key: "b", vector: [1, 0] }], 0.5); // the nearest is the second item
    twinOf([1, 0], [{ key: "a", vector: [1, 0] }, { key: "b", vector: [0, 1] }], 0.5); // the nearest is the first item
    twinOf([1, 0], [{ key: "a", vector: [1, 1] }, { key: "b", vector: [1, 0] }], 0.5); // both reach the cutoff, but only the nearest wins
    twinOf([1, 0], [{ key: "a", vector: [0, 1] }, { key: "b", vector: [1, 1] }, { key: "c", vector: [-1, 0] }], 0.5); // only the nearest reaches the cutoff
  });
});

describe("cutoffOf", () => {
  it("rejects text that is not a string", () => {
    const raws = [42, 0.8, null, undefined, true, {}, ["0.8"]];
    for (const raw of raws) {
      expect(() => cutoffOf(raw as unknown as string)).toThrow("cutoffOf: raw is text");
    }
  });

  it("returns the cutoff written in the text, or null when the text is not a cutoff", () => {
    // the contract asserts: "cutoffOf: the cutoff is a number above 0 and at most 1, or null"
    cutoffOf("0.8"); // the default of the CLI
    cutoffOf("1"); // at the edge: 1 is a cutoff
    cutoffOf("0.5");
    cutoffOf("0.0001"); // just above 0
    cutoffOf("0"); // 0 is not above 0
    cutoffOf("1.1"); // above 1
    cutoffOf("1.0001"); // just above 1
    cutoffOf("0,8"); // a comma is not a decimal point
    cutoffOf("-0.5"); // negative
    cutoffOf("1e-1"); // not digits with an optional decimal part
    cutoffOf(""); // empty
    cutoffOf("abc"); // not a number
  });
});

describe("outcome tables", () => {
  it("cutoffOf reads a number written with digits and an optional decimal part, above 0 and at most 1", () => {
    const table: Array<[string, number | null]> = [
      ["0.8", 0.8],
      ["0.80", 0.8],
      ["1", 1],
      ["1.0", 1],
      ["0.5", 0.5],
      ["0.0001", 0.0001],
      ["0", null],
      ["0.0", null],
      ["1.1", null],
      ["1.0001", null],
      ["0,8", null],
      ["-0.5", null],
      ["+0.5", null],
      ["1e-1", null],
      [".8", null],
      ["0.8abc", null],
      [" 0.8", null],
      ["0.8 ", null],
      ["", null],
      ["abc", null],
    ];
    for (const [raw, expected] of table) {
      expect(cutoffOf(raw)).toBe(expected);
    }
  });

  it("cosine gives the known values", () => {
    const table: Array<[readonly number[], readonly number[], number]> = [
      [[1, 0], [1, 0], 1],
      [[1, 0], [-1, 0], -1],
      [[1, 0], [0, 1], 0],
      [[3, 4], [3, 4], 1],
      [[1, 2, 3], [2, 4, 6], 1],
      [[3, 4], [4, 3], 0.96],
      [[1, 0], [1, 1], Math.SQRT1_2],
      [[1], [5], 1],
      [[1], [-5], -1],
    ];
    for (const [a, b, expected] of table) {
      expect(cosine(a, b)).toBeCloseTo(expected, 9);
    }
  });

  it("twinOf returns the first nearest item that reaches the cutoff", () => {
    const table: Array<[readonly number[], readonly SessionVector[], number, string | null]> = [
      [[1, 0], [], 0.8, null],
      [[1, 0], [{ key: "a", vector: [0, 1] }], 0.5, null],
      [[1, 0], [{ key: "a", vector: [-1, 0] }], 0.5, null],
      [[1, 0], [{ key: "a", vector: [1, 0] }], 1, "a"],
      [[1, 0], [{ key: "a", vector: [1, 0] }, { key: "b", vector: [1, 0] }], 0.5, "a"],
      [[1, 0], [{ key: "a", vector: [0, 1] }, { key: "b", vector: [1, 0] }], 0.5, "b"],
      [[1, 0], [{ key: "a", vector: [1, 1] }, { key: "b", vector: [1, 0] }], 0.5, "b"],
      [[1, 0], [{ key: "a", vector: [1, 1] }], 0.8, null],
      [[1, 0], [{ key: "a", vector: [1, 1] }], 0.7, "a"],
    ];
    for (const [vector, items, cutoff, expected] of table) {
      expect(twinOf(vector, items, cutoff)?.key ?? null).toBe(expected);
    }
    expect(twinOf([1, 0], [{ key: "a", vector: [1, 1] }], 0.7)?.score).toBeCloseTo(Math.SQRT1_2, 9);
  });
});

describe("bothHaveNorm", () => {
  it("is true only when both vectors have a component other than zero", () => {
    expect(bothHaveNorm([1], [1])).toBe(true);
    expect(bothHaveNorm([0, 1], [-1, 0])).toBe(true);
    expect(bothHaveNorm([0], [1])).toBe(false);
    expect(bothHaveNorm([1], [0])).toBe(false);
    expect(bothHaveNorm([0, 0], [0, 0])).toBe(false);
    expect(bothHaveNorm([], [1])).toBe(false);
  });
});
