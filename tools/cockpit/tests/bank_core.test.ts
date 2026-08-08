import { describe, expect, test } from "bun:test";
import {
  appendLedger,
  clearBank,
  emptyBank,
  parseBank,
  pushExchange,
  renderBank,
  setSummary,
} from "../src/bank/core.ts";
import type { Bank, Exchange } from "../src/bank/types.ts";

const ex = (n: number): Exchange => ({
  at: `2026-08-08T10:0${n}:00Z`,
  user: `question ${n}`,
  agent: `answer ${n}`,
});

const fullBank = (): Bank => ({
  name: "work",
  summary: "We are building the cockpit.\nBank module first.",
  ledger: [
    { at: "2026-08-08", text: "Vim-style ':' prefix chosen over '/'." },
    { at: "2026-08-08", text: "No default safe paths." },
  ],
  tail: [ex(1), ex(2)],
  safe: { read: ["/data/docs"], write: ["essays/", "alfred"] },
  cwd: "/home/filippo/git_projects/pi",
});

describe("emptyBank", () => {
  test("everything empty, cwd null, name kept", () => {
    const b = emptyBank("scratch");
    expect(b).toEqual({
      name: "scratch",
      summary: "",
      ledger: [],
      tail: [],
      safe: { read: [], write: [] },
      cwd: null,
    });
  });
});

describe("pushExchange", () => {
  test("appends and returns a new bank", () => {
    const b = emptyBank("t");
    const b2 = pushExchange(b, ex(1));
    expect(b2.tail).toEqual([ex(1)]);
    expect(b.tail).toEqual([]); // immutable
  });

  test("keeps only the last 3, oldest first", () => {
    let b = emptyBank("t");
    for (const n of [1, 2, 3, 4]) b = pushExchange(b, ex(n));
    expect(b.tail).toEqual([ex(2), ex(3), ex(4)]);
  });
});

describe("appendLedger", () => {
  test("appends and returns a new bank", () => {
    const b = emptyBank("t");
    const entry = { at: "2026-08-08", text: "A fixed sentence." };
    const b2 = appendLedger(b, entry);
    expect(b2.ledger).toEqual([entry]);
    expect(b.ledger).toEqual([]);
  });
});

describe("setSummary", () => {
  test("replaces the summary only", () => {
    const b = fullBank();
    const b2 = setSummary(b, "new summary");
    expect(b2.summary).toBe("new summary");
    expect(b2.ledger).toEqual(b.ledger);
    expect(b2.tail).toEqual(b.tail);
  });
});

describe("clearBank", () => {
  test("wipes summary and tail, keeps ledger, safe and cwd", () => {
    const b = clearBank(fullBank());
    expect(b.summary).toBe("");
    expect(b.tail).toEqual([]);
    expect(b.ledger).toEqual(fullBank().ledger);
    expect(b.safe).toEqual(fullBank().safe);
    expect(b.cwd).toBe(fullBank().cwd);
  });
});

describe("render/parse", () => {
  test("round trip preserves a full bank", () => {
    const b = fullBank();
    expect(parseBank("work", renderBank(b))).toEqual(b);
  });

  test("round trip preserves an empty bank", () => {
    const b = emptyBank("void");
    expect(parseBank("void", renderBank(b))).toEqual(b);
  });

  test("render is stable: render(parse(render(b))) == render(b)", () => {
    const once = renderBank(fullBank());
    expect(renderBank(parseBank("work", once))).toBe(once);
  });

  test("parse is lenient: empty input -> empty bank", () => {
    expect(parseBank("x", "")).toEqual(emptyBank("x"));
  });

  test("parse is lenient: missing sections fall back to defaults", () => {
    const raw = "## Summary\n\nonly a summary here";
    const b = parseBank("x", raw);
    expect(b.summary).toBe("only a summary here");
    expect(b.ledger).toEqual([]);
    expect(b.tail).toEqual([]);
    expect(b.cwd).toBeNull();
  });

  test("multi-line user and agent text survives the round trip", () => {
    const b = pushExchange(emptyBank("m"), {
      at: "2026-08-08T10:00:00Z",
      user: "line one\nline two",
      agent: "reply one\n\nreply after blank",
    });
    expect(parseBank("m", renderBank(b))).toEqual(b);
  });
});
