// The command tb refine, run as a process against the memory stubs.
// The pure parts are in tb_refine.test.ts and tb_refine_plan.test.ts. Here: the edge reads every note,
// writes nothing without --apply, and with --apply writes archived_at once and only where the plan says.

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { startMemoryStubs } from "./helpers/td_stubs.ts";

const memory = startMemoryStubs();
afterAll(() => memory.stop());

const { createNote } = await import("../tools/tb/src/notes.ts");

const OLD_HIT = "2026-01-01T00:00:00.000Z";
const ARCHIVED_AT = "2026-10-01T00:00:00.000Z";

const snapshot = (): string => JSON.stringify([...memory.collections.entries()].map(([name, points]) => [name, [...points.entries()]]));

const payloadOf = (id: string): Record<string, unknown> => {
  for (const points of memory.collections.values()) {
    const point = points.get(id);
    if (point) return point.payload;
  }
  throw new Error(`no point in the store: ${id}`);
};

const touch = (id: string, fields: Record<string, unknown>): void => {
  Object.assign(payloadOf(id), fields);
};

const run = async (...args: string[]): Promise<{ code: number; out: string; err: string }> => {
  const proc = Bun.spawn(["bun", "tools/tb/src/cli.ts", "refine", ...args], {
    env: process.env,
    stdout: "pipe",
    stderr: "pipe",
  });
  const code = await proc.exited;
  return { code, out: await new Response(proc.stdout).text(), err: await new Response(proc.stderr).text() };
};

const idsOf = (list: Array<{ id: string }>): string[] => list.map((entry) => entry.id);

const kept = await createNote({ what: "Una nota viva", why: "Serve al test", kind: "dato", tags: ["memoria"] });
const gone = await createNote({ what: "Una nota ferma da mesi", why: "Serve al test", kind: "dato", tags: ["memoria"] });
touch(gone.id, { hits: 1, last_hit: OLD_HIT });

describe("tb refine without --apply", () => {
  test("prints the spread, the low notes and the plan, and leaves the stores as they were", async () => {
    const before = snapshot();

    const result = await run();

    expect(result.err).toBe("");
    expect(result.code).toBe(0);
    const report = JSON.parse(result.out);
    expect(report.spread.total).toBe(2);
    expect(report.spread.belowFloor).toBe(1);
    expect(idsOf(report.low)).toEqual([gone.id]);
    expect(idsOf(report.plan.archive)).toEqual([gone.id]);
    expect(report.plan.restore).toEqual([]);
    expect(report.applied).toBeUndefined();
    expect(snapshot()).toBe(before);
  });

  test("rejects an unknown option and writes nothing", async () => {
    const before = snapshot();

    const result = await run("--bogus");

    expect(result.code).not.toBe(0);
    expect(snapshot()).toBe(before);
  });
});

describe("tb refine --apply", () => {
  let stale = "";
  let revived = "";
  let stillArchived = "";

  beforeAll(async () => {
    stale = (await createNote({ what: "Un'altra nota ferma", why: "Serve al test", kind: "dato", tags: ["memoria"] })).id;
    revived = (await createNote({ what: "Una nota archiviata e poi ritrovata", why: "Serve al test", kind: "dato", tags: ["memoria"] })).id;
    stillArchived = (await createNote({ what: "Una nota archiviata e ancora ferma", why: "Serve al test", kind: "dato", tags: ["memoria"] })).id;
    touch(stale, { hits: 2, last_hit: OLD_HIT });
    touch(revived, { archived_at: ARCHIVED_AT, hits: 1, last_hit: new Date().toISOString() });
    touch(stillArchived, { archived_at: ARCHIVED_AT, hits: 1, last_hit: OLD_HIT });
  });

  test("archives the notes under the floor and restores the ones above it", async () => {
    const result = await run("--apply");

    expect(result.err).toBe("");
    expect(result.code).toBe(0);
    const report = JSON.parse(result.out);
    expect(report.applied).toEqual({ archived: 2, restored: 1 });
    expect(typeof payloadOf(gone.id).archived_at).toBe("string");
    expect(typeof payloadOf(stale).archived_at).toBe("string");
    expect("archived_at" in payloadOf(revived)).toBe(false);
    expect("archived_at" in payloadOf(kept.id)).toBe(false);
  });

  test("keeps the archived_at of a note that is still under the floor", () => {
    expect(payloadOf(stillArchived).archived_at).toBe(ARCHIVED_AT);
  });

  test("an archived note has the keys it had plus archived_at, and nothing else", () => {
    expect(Object.keys(payloadOf(gone.id)).sort()).toEqual(
      ["about", "archived_at", "embed_model", "hits", "id", "kind", "last_hit", "refs", "tags", "updated_at", "what", "when", "why"],
    );
  });

  test("a second run on the same data writes nothing", async () => {
    const before = snapshot();

    const result = await run("--apply");

    expect(result.code).toBe(0);
    expect(JSON.parse(result.out).applied).toEqual({ archived: 0, restored: 0 });
    expect(snapshot()).toBe(before);
  });
});
