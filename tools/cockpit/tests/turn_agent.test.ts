import { describe, expect, test } from "bun:test";
import { buildExtraBinds, parseReply, splitLines } from "../src/turn/agent.ts";

describe("buildExtraBinds", () => {
  test("empty safe profile yields no extra binds", () => {
    expect(buildExtraBinds({ read: [], write: [] })).toEqual([]);
  });

  test("read paths become ro binds, write paths become rw binds", () => {
    const binds = buildExtraBinds({ read: ["/r1", "/r2"], write: ["/w1"] });
    expect(binds).toEqual([
      { path: "/r1", mode: "ro" },
      { path: "/r2", mode: "ro" },
      { path: "/w1", mode: "rw" },
    ]);
  });
});

describe("parseReply", () => {
  test("parses a well-formed reply", () => {
    const raw = JSON.stringify({ text: "hi", widgets: [], ledgerProposals: ["x"] });
    expect(parseReply(raw)).toEqual({ text: "hi", widgets: [], ledgerProposals: ["x"] });
  });

  test("rejects invalid JSON", () => {
    expect(() => parseReply("not json")).toThrow();
  });

  test("rejects JSON missing the expected shape", () => {
    expect(() => parseReply(JSON.stringify({ text: "hi" }))).toThrow("malformed agent reply");
  });
});

describe("splitLines", () => {
  test("no newline yet -> everything stays in rest", () => {
    expect(splitLines("", "partial")).toEqual({ lines: [], rest: "partial" });
  });

  test("one full line plus a trailing partial one", () => {
    expect(splitLines("", 'line1\n{"a":1}\npart')).toEqual({
      lines: ["line1", '{"a":1}'],
      rest: "part",
    });
  });

  test("carries the buffered rest into the next chunk", () => {
    const first = splitLines("", "ab");
    expect(first).toEqual({ lines: [], rest: "ab" });
    const second = splitLines(first.rest, "cd\n");
    expect(second).toEqual({ lines: ["abcd"], rest: "" });
  });

  test("empty lines are dropped", () => {
    expect(splitLines("", "a\n\nb\n")).toEqual({ lines: ["a", "b"], rest: "" });
  });
});
