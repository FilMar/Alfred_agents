// tb merge against the memory stubs: links move to the new note, the drops are gone,
// and a merge past the refs limit writes nothing.
// The pure plan is in tb_merge.test.ts.

import { afterAll, describe, expect, test } from "bun:test";
import { startMemoryStubs } from "./helpers/td_stubs.ts";

const memory = startMemoryStubs();
afterAll(() => memory.stop());

const { createNote, addRefs, mergeNotes } = await import("../tools/tb/src/notes.ts");

const store = () => memory.collection("third-brain")!;
const payloadOf = (id: string): Record<string, any> => store().get(id)!.payload;
const snapshot = (): string => JSON.stringify([...store().entries()]);

const note = (what: string, tags: string[] = []) => createNote({ what, why: `perché ${what}`, tags });

const run = async (...args: string[]): Promise<{ code: number; out: string; err: string }> => {
  const proc = Bun.spawn(["bun", "tools/tb/src/cli.ts", ...args], { env: process.env, stdout: "pipe", stderr: "pipe" });
  const code = await proc.exited;
  return { code, out: await new Response(proc.stdout).text(), err: await new Response(proc.stderr).text() };
};

describe("mergeNotes", () => {
  test("moves links and counters onto the new note and deletes the drops", async () => {
    const [a, b, c, d, e, f, n] = await Promise.all(
      ["alfa", "beta", "gamma", "delta", "epsilon", "phi", "nuova"].map((what, i) => note(what, i === 1 ? ["abitudini"] : ["creativita"])),
    );
    await addRefs(a.id, [{ id: c.id, reason: "stesso principio" }]);
    await addRefs(b.id, [{ id: c.id, reason: "idem" }, { id: e.id, reason: "evidenza" }]);
    await addRefs(d.id, [{ id: a.id, reason: "esempio concreto" }]);
    await addRefs(f.id, [{ id: b.id, reason: "caso opposto" }, { id: n.id, reason: "già collegata" }]);
    Object.assign(payloadOf(a.id), { hits: 5, last_hit: "2026-09-01T00:00:00.000Z" });
    Object.assign(payloadOf(b.id), { hits: 2, last_hit: "2026-10-10T00:00:00.000Z" });

    const summary = await mergeNotes(n.id, [a.id, b.id]);

    expect(summary).toEqual({ into: n.id, dropped: [a.id, b.id], relinked: 4 });
    expect(store().has(a.id)).toBe(false);
    expect(store().has(b.id)).toBe(false);
    const merged = payloadOf(n.id);
    expect(merged.refs).toEqual([{ id: c.id, reason: "stesso principio" }, { id: e.id, reason: "evidenza" }]);
    expect([...merged.backrefs].sort()).toEqual([d.id, f.id].sort());
    expect(merged.hits).toBe(7);
    expect(merged.last_hit).toBe("2026-10-10T00:00:00.000Z");
    expect([...merged.tags].sort()).toEqual(["abitudini", "creativita"]);
    expect(merged.what).toBe("nuova");
    expect(payloadOf(d.id).refs).toEqual([{ id: n.id, reason: "esempio concreto" }]);
    expect(payloadOf(f.id).refs).toEqual([{ id: n.id, reason: "già collegata" }]);
    expect(payloadOf(c.id).backrefs).toEqual([n.id]);
    expect(payloadOf(e.id).backrefs).toEqual([n.id]);
  });

  test("past the refs limit it fails and writes nothing", async () => {
    const targets = await Promise.all(["uno", "due", "tre", "quattro", "cinque", "sei", "sette"].map((what) => note(what)));
    const into = await note("arrivo");
    const drop = await note("partenza");
    await addRefs(into.id, targets.slice(0, 4).map((t) => ({ id: t.id, reason: "r" })));
    await addRefs(drop.id, targets.slice(4).map((t) => ({ id: t.id, reason: "r" })));
    const before = snapshot();

    await expect(mergeNotes(into.id, [drop.id])).rejects.toThrow("refs limit");
    expect(snapshot()).toBe(before);
  });
});

describe("tb merge", () => {
  test("as a process, with id prefixes", async () => {
    const into = await note("destinazione");
    const drop = await note("origine");
    const result = await run("merge", into.id.slice(0, 8), drop.id.slice(0, 8));
    expect(result.code).toBe(0);
    expect(JSON.parse(result.out)).toEqual({ into: into.id, dropped: [drop.id], relinked: 0 });
    expect(store().has(drop.id)).toBe(false);
  });

  test("refuses to merge a note into itself", async () => {
    const lone = await note("sola");
    const result = await run("merge", lone.id, lone.id);
    expect(result.code).not.toBe(0);
    expect(result.err).toContain("into itself");
    expect(store().has(lone.id)).toBe(true);
  });
});
