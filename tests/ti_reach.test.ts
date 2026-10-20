// Tests for tools/ti/src/reach.ts: reachOf and promptTextsOf.
// Precondition tests expect the assert message. Postcondition tests are bare
// calls: the asserts inside the module are the oracle, a body that breaks one
// makes the test fail. Outcome tables pin what the spec fixes and the asserts
// do not check: exact results, ordering, the world-error message.

import { describe, expect, test } from "bun:test";

import { promptTextsOf, reachOf } from "../tools/ti/src/reach.ts";

describe("reachOf", () => {
  // Precondition: distinctIds. An input that breaks it makes the assert throw.
  test("a rule id twice is an error", () => {
    expect(() =>
      reachOf(
        [
          { id: "r1", if: "if one" },
          { id: "r1", if: "if two" },
        ],
        [],
      ),
    ).toThrow("reachOf: no rule id twice");
  });

  // Postcondition: prompts is the number of searches. Three searches over two
  // rules: neither the distinct ids (2) nor the returned ids (4) may be
  // reported as prompts.
  test("prompts is the number of searches", () => {
    reachOf(
      [
        { id: "r1", if: "if r1" },
        { id: "r2", if: "if r2" },
      ],
      [["r1"], ["r2"], ["r1", "r2"]],
    );
  });

  // Postcondition: every rule once. r3 never comes out, r1 comes out in two
  // searches, "ghost" is not a rule: the result must carry r1, r2, r3 exactly
  // once each.
  test("every rule once", () => {
    reachOf(
      [
        { id: "r1", if: "if r1" },
        { id: "r2", if: "if r2" },
        { id: "r3", if: "if r3" },
      ],
      [["r1", "r2", "ghost"], ["r1"], []],
    );
  });

  // Postcondition: reached counts the prompts that returned the rule. r1 is
  // returned by two of the three searches, twice inside the first one: it
  // counts once per search, so reached is 2, not 3.
  test("reached counts the prompts that returned the rule", () => {
    reachOf(
      [
        { id: "r1", if: "if r1" },
        { id: "r2", if: "if r2" },
      ],
      [["r1", "r1", "ghost"], ["r1"], ["r2"]],
    );
  });

  // Postcondition: unreached are the rules reached zero times. r2 and r3 never
  // come out, r1 comes out in both searches.
  test("unreached are the rules reached zero times", () => {
    reachOf(
      [
        { id: "r1", if: "if r1" },
        { id: "r2", if: "if r2" },
        { id: "r3", if: "if r3" },
      ],
      [["r1"], ["r1"]],
    );
  });

  // Outcome table from the spec: each search counts each id once, ids that
  // are not rules are ignored, the result carries if, rules are ordered by
  // reached ascending and then by id, unreached are the zero-reached rules in
  // the same order. The input order (b, a, d, c) is deliberately not the
  // expected order, so a body that forgets to sort fails here.
  test("counts, order and unreached follow the spec", () => {
    expect(
      reachOf(
        [
          { id: "r-b", if: "if b" },
          { id: "r-a", if: "if a" },
          { id: "r-d", if: "if d" },
          { id: "r-c", if: "if c" },
        ],
        [
          ["r-a", "r-b"],
          ["r-b", "r-b", "r-x"],
          ["r-a"],
          [],
        ],
      ),
    ).toEqual({
      prompts: 4,
      rules: [
        { id: "r-c", if: "if c", reached: 0 },
        { id: "r-d", if: "if d", reached: 0 },
        { id: "r-a", if: "if a", reached: 2 },
        { id: "r-b", if: "if b", reached: 2 },
      ],
      unreached: [
        { id: "r-c", if: "if c", reached: 0 },
        { id: "r-d", if: "if d", reached: 0 },
      ],
    });
  });

  // The boundary of unreached: a rule reached once is not unreached.
  test("a rule reached once is not unreached", () => {
    expect(
      reachOf(
        [
          { id: "r1", if: "if one" },
          { id: "r2", if: "if two" },
        ],
        [["r1"]],
      ),
    ).toEqual({
      prompts: 1,
      rules: [
        { id: "r2", if: "if two", reached: 0 },
        { id: "r1", if: "if one", reached: 1 },
      ],
      unreached: [{ id: "r2", if: "if two", reached: 0 }],
    });
  });

  // Edges: no rules, no searches, searches that return nothing known.
  test("no rules and no searches", () => {
    expect(reachOf([], [])).toEqual({ prompts: 0, rules: [], unreached: [] });
  });

  test("no searches: every rule is unreached", () => {
    expect(reachOf([{ id: "only", if: "if only" }], [])).toEqual({
      prompts: 0,
      rules: [{ id: "only", if: "if only", reached: 0 }],
      unreached: [{ id: "only", if: "if only", reached: 0 }],
    });
  });

  test("unknown ids are ignored and prompts still counts the searches", () => {
    expect(reachOf([], [["ghost"], []])).toEqual({ prompts: 2, rules: [], unreached: [] });
  });
});

describe("promptTextsOf", () => {
  // Postcondition: no blank text. Bare call, the assert is the oracle: a body
  // that keeps the whitespace-only text instead of dropping it makes the
  // assert throw.
  test("no blank text", () => {
    promptTextsOf([{ text: " " }, { text: "kept" }]);
  });

  // Outcome table from the spec: an array whose every element is an object
  // with a string text is valid; texts are trimmed, empty ones dropped, the
  // order is the given one. Extra fields, as tl prompts prints them, are fine.
  const valid: readonly (readonly [unknown, readonly string[]])[] = [
    [[], []],
    [[{ text: "  padded  " }, { text: "plain" }], ["padded", "plain"]],
    [[{ text: "" }, { text: " \t " }], []],
    [[{ text: "same" }, { text: "same" }], ["same", "same"]],
    [
      [{ exchange: "ex-1", timestamp: "2026-10-01T00:00:00.000Z", text: " as tl prompts prints " }],
      ["as tl prompts prints"],
    ],
  ];

  for (const [input, texts] of valid) {
    test(`valid: ${JSON.stringify(input)} gives ${JSON.stringify(texts)}`, () => {
      expect(promptTextsOf(input)).toEqual({ ok: true, texts });
    });
  }

  // Outcome table from the spec: stdin that is not an array of { text } is an
  // error of the world, with the exact message.
  const worldErrors: readonly (readonly [unknown, string])[] = [
    [undefined, "undefined"],
    [null, "null"],
    [42, "a number"],
    ["a string", "a string"],
    [{ text: "x" }, "an object that is not an array"],
    [[null], "an element that is null"],
    [["text"], "an element that is a string"],
    [[{}], "an element without text"],
    [[{ text: 7 }], "an element whose text is a number"],
    [[{ text: "ok" }, { text: false }], "a bad element after good ones"],
  ];

  for (const [input, why] of worldErrors) {
    test(`world error when stdin is ${why}`, () => {
      expect(promptTextsOf(input)).toEqual({
        ok: false,
        error: "stdin must be a JSON array of { text }, as tl prompts prints",
      });
    });
  }
});