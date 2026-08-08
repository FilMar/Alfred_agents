import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { emptyBank, setSummary } from "../src/bank/core.ts";
import type { Bank, Exchange } from "../src/bank/types.ts";
import { afterTurn, runTurn, type TurnDeps } from "../src/turn/pipeline.ts";
import type { AgentPrompt, AgentReply } from "../src/turn/types.ts";

const reply = (text: string): AgentReply => ({ text, widgets: [], ledgerProposals: [] });

const turn = (text: string, files: string[] = []) =>
  ({ kind: "turn", text, files }) as const;

function fakeDeps(overrides: Partial<TurnDeps> = {}): TurnDeps & { calls: AgentPrompt[] } {
  const calls: AgentPrompt[] = [];
  return {
    calls,
    retrieve: async () => ({ tb: [], ti: [] }),
    runAgent: async (prompt) => {
      calls.push(prompt);
      return reply("ok");
    },
    condense: async (summary, ex) => `${summary} +${ex.user}`,
    ...overrides,
  };
}

describe("runTurn", () => {
  test("assembles the bank context and returns the agent reply", async () => {
    const bank = setSummary(emptyBank("t"), "the summary");
    const deps = fakeDeps();
    const r = await runTurn(bank, turn("hello"), null, deps);
    expect(r.text).toBe("ok");
    expect(deps.calls[0]!.user).toContain("the summary");
    expect(deps.calls[0]!.user).toContain("hello");
  });

  test("passes the bank's safe profile and cwd to the agent", async () => {
    const bank: Bank = { ...emptyBank("t"), safe: { read: ["/r"], write: ["/w"] }, cwd: "/proj" };
    let seen: unknown[] = [];
    const deps = fakeDeps({
      runAgent: async (_p, safe, cwd) => {
        seen = [safe, cwd];
        return reply("ok");
      },
    });
    await runTurn(bank, turn("q"), null, deps);
    expect(seen).toEqual([{ read: ["/r"], write: ["/w"] }, "/proj"]);
  });

  test("retrieval failure degrades to empty, the turn still runs", async () => {
    const deps = fakeDeps({
      retrieve: async () => {
        throw new Error("qdrant is asleep");
      },
    });
    const r = await runTurn(emptyBank("t"), turn("q"), null, deps);
    expect(r.text).toBe("ok");
  });

  test("@files are read from the bank's cwd into the prompt", async () => {
    const dir = await mkdtemp(join(tmpdir(), "cockpit-files-"));
    try {
      await writeFile(join(dir, "notes.md"), "file body here");
      const bank: Bank = { ...emptyBank("t"), cwd: dir };
      const deps = fakeDeps();
      await runTurn(bank, turn("read @notes.md", ["notes.md"]), null, deps);
      expect(deps.calls[0]!.user).toContain("file body here");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("unreadable @files do not break the turn", async () => {
    const deps = fakeDeps();
    const r = await runTurn(emptyBank("t"), turn("read @ghost.md", ["ghost.md"]), null, deps);
    expect(r.text).toBe("ok");
  });
});

describe("afterTurn", () => {
  const ex: Exchange = { at: "2026-08-08T10:00:00Z", user: "q", agent: "a" };

  test("pushes the exchange and delta-merges the summary", async () => {
    const bank = setSummary(emptyBank("t"), "old");
    const b2 = await afterTurn(bank, ex, fakeDeps());
    expect(b2.tail).toEqual([ex]);
    expect(b2.summary).toBe("old +q");
  });

  test("condense failure keeps the exchange, summary untouched", async () => {
    const bank = setSummary(emptyBank("t"), "old");
    const deps = fakeDeps({
      condense: async () => {
        throw new Error("model down");
      },
    });
    const b2 = await afterTurn(bank, ex, deps);
    expect(b2.tail).toEqual([ex]);
    expect(b2.summary).toBe("old");
  });
});
