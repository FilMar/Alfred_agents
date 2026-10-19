// ti hits and ti refine against the memory stubs.
// The pure mapping is in ti_refine.test.ts. Here: a search writes the counters, --no-hits writes none,
// append-do keeps them, --no-archived hides an archived rule, and ti refine writes only with --apply.

import { afterAll, describe, expect, test } from "bun:test";
import { startMemoryStubs } from "./helpers/td_stubs.ts";

const memory = startMemoryStubs();
afterAll(() => memory.stop());

const { addEntry, searchEntries, appendDo, markArchived } = await import("../tools/ti/src/identity.ts");

const OLD_HIT = "2026-01-01T00:00:00.000Z";
const ARCHIVED_AT = "2026-10-01T00:00:00.000Z";

const payloadOf = (id: string): Record<string, unknown> => {
  const point = memory.collection("pi_identity")?.get(id);
  if (point === undefined) throw new Error(`no rule in the store: ${id}`);
  return point.payload;
};

const touch = (id: string, fields: Record<string, unknown>): void => {
  Object.assign(payloadOf(id), fields);
};

const snapshot = (): string => JSON.stringify([...(memory.collection("pi_identity") ?? new Map()).entries()]);

const run = async (...args: string[]): Promise<{ code: number; out: string; err: string }> => {
  const proc = Bun.spawn(["bun", "tools/ti/src/cli.ts", ...args], { env: process.env, stdout: "pipe", stderr: "pipe" });
  const code = await proc.exited;
  return { code, out: await new Response(proc.stdout).text(), err: await new Response(proc.stderr).text() };
};

const idsOf = (list: Array<{ id: string }>): string[] => list.map((entry) => entry.id).sort();

const counted = await addEntry("giraffa elefante leone savana", "fai una cosa", []);
const quiet = await addEntry("pinguino foca orso polare", "fai un'altra cosa", []);

describe("addEntry", () => {
  test("stores when", () => {
    expect(payloadOf(counted.id).when).toBe(counted.when);
    expect(Number.isFinite(Date.parse(String(counted.when)))).toBe(true);
  });
});

describe("searchEntries hits", () => {
  test("a search counts one hit on every rule returned", async () => {
    await searchEntries("giraffa elefante leone savana", { limit: 1 });
    await searchEntries("giraffa elefante leone savana", { limit: 1 });
    expect(payloadOf(counted.id).hits).toBe(2);
    expect(typeof payloadOf(counted.id).last_hit).toBe("string");
  });

  test("record_hits false writes no counter", async () => {
    await searchEntries("pinguino foca orso polare", { limit: 1, record_hits: false });
    expect(payloadOf(quiet.id).hits).toBeUndefined();
    expect(payloadOf(quiet.id).last_hit).toBeUndefined();
  });
});

describe("appendDo", () => {
  test("keeps when, the counters and archived_at", async () => {
    touch(quiet.id, { hits: 4, last_hit: OLD_HIT, archived_at: ARCHIVED_AT });
    const before = { ...payloadOf(quiet.id) };
    await appendDo(quiet.id, "e poi questa");
    expect(payloadOf(quiet.id)).toEqual({ ...before, do: ["fai un'altra cosa", "e poi questa"] });
  });
});

describe("exclude_archived", () => {
  test("an archived rule is left out", async () => {
    const results = await searchEntries("pinguino foca orso polare", { limit: 5, record_hits: false, exclude_archived: true });
    expect(idsOf(results)).toEqual([counted.id]);
  });

  test("without the option an archived rule is found and shows archived_at", async () => {
    const results = await searchEntries("pinguino foca orso polare", { limit: 1, record_hits: false });
    expect(results[0].id).toBe(quiet.id);
    expect(results[0].archived_at).toBe(ARCHIVED_AT);
  });

  test("ti search --no-archived --no-hits as a process", async () => {
    const before = snapshot();
    const result = await run("search", "pinguino foca orso polare", "--limit", "5", "--no-hits", "--no-archived", "--json");
    expect(result.code).toBe(0);
    expect(idsOf(JSON.parse(result.out))).toEqual([counted.id]);
    expect(snapshot()).toBe(before);
  });
});

describe("ti refine", () => {
  test("without --apply it prints the plan and writes nothing", async () => {
    delete payloadOf(quiet.id).archived_at;
    const before = snapshot();
    const result = await run("refine");
    expect(result.err).toBe("");
    expect(result.code).toBe(0);
    const report = JSON.parse(result.out);
    expect(report.spread.total).toBe(2);
    expect(idsOf(report.plan.archive)).toEqual([quiet.id]);
    expect(report.plan.archive[0].text).toBe("pinguino foca orso polare");
    expect(report.applied).toBeUndefined();
    expect(snapshot()).toBe(before);
  });

  test("with --apply it archives the low rule and restores a live one", async () => {
    await markArchived([counted.id], new Date(ARCHIVED_AT));
    const result = await run("refine", "--apply");
    expect(result.code).toBe(0);
    expect(JSON.parse(result.out).applied).toEqual({ archived: 1, restored: 1 });
    expect(typeof payloadOf(quiet.id).archived_at).toBe("string");
    expect(payloadOf(counted.id).archived_at).toBeUndefined();
  });
});
