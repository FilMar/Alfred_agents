import { describe, expect, test } from "bun:test";
import { parseCommand } from "../src/router/core.ts";

const HATS = ["black", "white", "green"];
const parse = (s: string) => parseCommand(s, HATS);

describe("turns", () => {
  test("plain text -> turn with no files", () => {
    expect(parse("how does tb store vectors?")).toEqual({
      kind: "turn",
      text: "how does tb store vectors?",
      files: [],
    });
  });

  test("@mentions are extracted, text stays intact", () => {
    const c = parse("summarize @notes.md and @src/a.ts please");
    expect(c).toEqual({
      kind: "turn",
      text: "summarize @notes.md and @src/a.ts please",
      files: ["notes.md", "src/a.ts"],
    });
  });

  test("duplicate mentions collapse", () => {
    const c = parse("@a.md again @a.md");
    expect(c.kind === "turn" && c.files).toEqual(["a.md"]);
  });

  test(":: escapes a literal leading colon", () => {
    expect(parse("::this is text")).toEqual({ kind: "turn", text: ":this is text", files: [] });
  });
});

describe("commands", () => {
  test(":bash with a command", () => {
    expect(parse(":bash ls -la /tmp")).toEqual({ kind: "bash", cmd: "ls -la /tmp" });
  });

  test(":bash without argument -> unknown", () => {
    expect(parse(":bash").kind).toBe("unknown");
  });

  test(":mem with and without name", () => {
    expect(parse(":mem work")).toEqual({ kind: "mem", name: "work" });
    expect(parse(":mem")).toEqual({ kind: "mem" });
  });

  test(":new requires a name", () => {
    expect(parse(":new scratch")).toEqual({ kind: "new", name: "scratch" });
    expect(parse(":new").kind).toBe("unknown");
  });

  test(":delete with and without name", () => {
    expect(parse(":delete old")).toEqual({ kind: "delete", name: "old" });
    expect(parse(":delete")).toEqual({ kind: "delete" });
  });

  test(":clear, :safe, :edit-memory take no argument", () => {
    expect(parse(":clear")).toEqual({ kind: "clear" });
    expect(parse(":safe")).toEqual({ kind: "safe" });
    expect(parse(":edit-memory")).toEqual({ kind: "edit-memory" });
  });

  test(":cd with and without path", () => {
    expect(parse(":cd /home/x/repo")).toEqual({ kind: "cd", path: "/home/x/repo" });
    expect(parse(":cd")).toEqual({ kind: "cd" });
  });

  test(":detach carries the task text", () => {
    expect(parse(":detach re-embed the whole corpus")).toEqual({
      kind: "detach",
      task: "re-embed the whole corpus",
    });
  });
});

describe("hats", () => {
  test("a known hat arms it", () => {
    expect(parse(":black")).toEqual({ kind: "hat", name: "black" });
  });

  test("an unknown hat is not a hat", () => {
    expect(parse(":purple").kind).toBe("unknown");
  });
});

describe("unknown", () => {
  test("typos never reach the agent", () => {
    const c = parse(":men work");
    expect(c).toEqual({ kind: "unknown", raw: ":men work" });
  });

  test("lone or malformed colon input is unknown, not a turn", () => {
    expect(parse(":").kind).toBe("unknown");
    expect(parse(":)").kind).toBe("unknown");
  });
});
