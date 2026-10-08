import { describe, expect, test } from "bun:test";

import { assert } from "../tools/contract/contract.ts";

describe("assert", () => {
  test("a true condition with a string message", () => {
    assert(true, "never shown");
  });

  test("a true condition does not build a lazy message", () => {
    assert(true, () => {
      throw new Error("built");
    });
  });

  test("a false condition throws the string message", () => {
    expect(() => assert(false, "X.f: string message")).toThrow("X.f: string message");
  });

  test("a false condition throws the lazy message", () => {
    expect(() => assert(false, () => "X.f: lazy message")).toThrow("X.f: lazy message");
  });
});
