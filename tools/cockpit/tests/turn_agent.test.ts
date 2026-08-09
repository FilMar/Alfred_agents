import { describe, expect, test } from "bun:test";
import { buildExtraBinds, parseReply } from "../src/turn/agent.ts";

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
