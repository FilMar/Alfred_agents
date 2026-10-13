// The command tb refine, run as a process against the memory stubs.
// The pure parts are in tb_refine.test.ts. Here: the edge reads every note and writes nothing.

import { afterAll, expect, test } from "bun:test";
import { startMemoryStubs } from "./helpers/td_stubs.ts";

const memory = startMemoryStubs();
afterAll(() => memory.stop());

const { createNote } = await import("../tools/tb/src/notes.ts");

const snapshot = (): string => JSON.stringify([...memory.collections.entries()].map(([name, points]) => [name, [...points.entries()]]));

const refine = async (): Promise<{ code: number; out: string; err: string }> => {
  const proc = Bun.spawn(["bun", "tools/tb/src/cli.ts", "refine"], {
    env: process.env,
    stdout: "pipe",
    stderr: "pipe",
  });
  const code = await proc.exited;
  return { code, out: await new Response(proc.stdout).text(), err: await new Response(proc.stderr).text() };
};

test("tb refine prints the spread of every note and the low ones, and leaves the stores as they were", async () => {
  const kept = await createNote({ what: "Una nota viva", why: "Serve al test", kind: "dato", tags: ["memoria"] });
  const gone = await createNote({ what: "Una nota ferma da mesi", why: "Serve al test", kind: "dato", tags: ["memoria"] });
  for (const points of memory.collections.values()) {
    const stale = points.get(gone.id);
    if (stale) Object.assign(stale.payload, { hits: 1, last_hit: "2026-01-01T00:00:00.000Z" });
  }
  const before = snapshot();

  const result = await refine();

  expect(result.err).toBe("");
  expect(result.code).toBe(0);
  const report = JSON.parse(result.out);
  expect(report.spread.total).toBe(2);
  expect(report.spread.belowFloor).toBe(1);
  expect(report.low.map((note: { id: string }) => note.id)).toEqual([gone.id]);
  expect(report.low.map((note: { id: string }) => note.id)).not.toContain(kept.id);
  expect(snapshot()).toBe(before);
});

test("tb refine rejects an unknown option and writes nothing", async () => {
  const before = snapshot();
  const proc = Bun.spawn(["bun", "tools/tb/src/cli.ts", "refine", "--apply"], { env: process.env, stdout: "pipe", stderr: "pipe" });
  const code = await proc.exited;
  expect(code).not.toBe(0);
  expect(snapshot()).toBe(before);
});
