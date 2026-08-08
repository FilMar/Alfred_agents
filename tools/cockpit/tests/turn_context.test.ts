import { describe, expect, test } from "bun:test";
import { appendLedger, emptyBank, pushExchange, setSummary } from "../src/bank/core.ts";
import { assembleContext } from "../src/turn/context.ts";
import type { Retrieval } from "../src/turn/types.ts";

const NO_RETRIEVAL: Retrieval = { tb: [], ti: [] };

describe("assembleContext", () => {
  test("empty bank: prompt is just the request", () => {
    const p = assembleContext(emptyBank("t"), "hello", null, NO_RETRIEVAL, []);
    expect(p.user).toContain("hello");
    expect(p.user).not.toContain("## Session summary");
    expect(p.user).not.toContain("## Ledger");
    expect(p.user).not.toContain("## Recent exchanges");
  });

  test("summary, ledger and tail all land in the prompt", () => {
    let b = emptyBank("t");
    b = setSummary(b, "We chose Hono.");
    b = appendLedger(b, { at: "2026-08-08", text: "No SQLite." });
    b = pushExchange(b, { at: "2026-08-08T10:00:00Z", user: "why?", agent: "because." });
    const p = assembleContext(b, "next question", null, NO_RETRIEVAL, []);
    expect(p.user).toContain("We chose Hono.");
    expect(p.user).toContain("No SQLite.");
    expect(p.user).toContain("why?");
    expect(p.user).toContain("because.");
    expect(p.user).toContain("next question");
  });

  test("retrieval hits land in the prompt", () => {
    const p = assembleContext(
      emptyBank("t"),
      "q",
      null,
      { tb: ["tb says this"], ti: ["if X do Y"] },
      [],
    );
    expect(p.user).toContain("tb says this");
    expect(p.user).toContain("if X do Y");
  });

  test("mentioned files land in the prompt with their path", () => {
    const p = assembleContext(emptyBank("t"), "q", null, NO_RETRIEVAL, [
      { path: "notes.md", content: "file body here" },
    ]);
    expect(p.user).toContain("notes.md");
    expect(p.user).toContain("file body here");
  });

  test("hat overlay is appended to the system prompt, not the user prompt", () => {
    const bare = assembleContext(emptyBank("t"), "q", null, NO_RETRIEVAL, []);
    const hatted = assembleContext(emptyBank("t"), "q", "Be skeptical.", NO_RETRIEVAL, []);
    expect(hatted.system).toContain("Be skeptical.");
    expect(hatted.system).toContain(bare.system);
    expect(hatted.user).not.toContain("Be skeptical.");
  });
});
