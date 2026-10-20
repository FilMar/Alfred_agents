// tb near, ti near, tl prompts and ti reach as processes against the stubs.
// The pure parts are in tb_near.test.ts, tl_prompts.test.ts and ti_reach.test.ts.

import { afterAll, describe, expect, test } from "bun:test";
import * as db from "../tools/tl/src/db.ts";
import { exchangeId } from "../tools/tl/src/types.ts";
import { startMemoryStubs, startTlStub } from "./helpers/td_stubs.ts";

const memory = startMemoryStubs();
const tl = startTlStub();
afterAll(() => {
  memory.stop();
  tl.stop();
});

const { createNote } = await import("../tools/tb/src/notes.ts");
const { addEntry, markArchived } = await import("../tools/ti/src/identity.ts");

const run = async (tool: string, args: string[], stdin?: string): Promise<{ code: number; out: string; err: string }> => {
  const proc = Bun.spawn(["bun", `tools/${tool}/src/cli.ts`, ...args], {
    env: process.env,
    stdin: stdin === undefined ? "ignore" : new Blob([stdin]),
    stdout: "pipe",
    stderr: "pipe",
  });
  const code = await proc.exited;
  return { code, out: await new Response(proc.stdout).text(), err: await new Response(proc.stderr).text() };
};

const note = (what: string, tags: string[]) => createNote({ what, why: what, tags });

describe("tb near", () => {
  test("pairs live notes with the same words, and the tag filter narrows them", async () => {
    const lion = await note("giraffa leone savana", ["africa"]);
    const twin = await note("savana leone giraffa", ["africa"]);
    await note("pinguino foca ghiaccio", ["polo"]);
    const archived = await note("leone giraffa savana", ["zoo"]);
    Object.assign(memory.collection("third-brain")!.get(archived.id)!.payload, { archived_at: "2026-10-01T00:00:00.000Z" });

    const all = await run("tb", ["near", "--min", "0.9"]);
    expect(all.code).toBe(0);
    const pairs = JSON.parse(all.out);
    expect(pairs).toHaveLength(1);
    expect([pairs[0].a, pairs[0].b].sort()).toEqual([lion.id, twin.id].sort());
    expect([pairs[0].a_text, pairs[0].b_text].sort()).toEqual(["giraffa leone savana", "savana leone giraffa"]);

    const polar = await run("tb", ["near", "--min", "0.9", "--tags", "polo"]);
    expect(JSON.parse(polar.out)).toEqual([]);
  });

  test("refuses a min outside -1 and 1", async () => {
    const result = await run("tb", ["near", "--min", "2"]);
    expect(result.code).not.toBe(0);
    expect(result.err).toContain("--min");
  });
});

describe("ti near and ti reach", () => {
  test("ti near pairs rules with the same if", async () => {
    const one = await addEntry("giraffa elefante leone savana", "fai una cosa", []);
    const two = await addEntry("savana leone elefante giraffa", "fai una cosa", []);
    await addEntry("pinguino foca orso polare", "fai un'altra cosa", []);
    const result = await run("ti", ["near", "--min", "0.9"]);
    expect(result.code).toBe(0);
    const pairs = JSON.parse(result.out);
    expect(pairs).toHaveLength(1);
    expect([pairs[0].a, pairs[0].b].sort()).toEqual([one.id, two.id].sort());
  });

  test("tl prompts keeps the human prompts and ti reach counts the rules they reach", async () => {
    db.upsertSession(tl.handle, { id: "s", started: "2026-10-01T00:00:00.000Z" });
    const seed = (message: string, seconds: number, input: string, meta?: Record<string, unknown>) => {
      const id = exchangeId("s", message);
      db.upsertExchange(tl.handle, {
        id,
        session: "s",
        timestamp: new Date(Date.UTC(2026, 9, 1, 0, 0, seconds)).toISOString(),
        kind: "chat",
        actor: "alfredo",
        ...(meta && { meta }),
      });
      db.upsertContents(tl.handle, { exchange_id: id, input, output: "ok" });
    };
    seed("e1", 1, "giraffa elefante leone savana", { trigger: "human" });
    seed("e2", 2, "giraffa elefante leone savana", { trigger: "human" });
    seed("e3", 3, "pinguino foca orso polare", { trigger: "task-notification" });
    seed("e4", 4, "una domanda che non c'entra niente");

    const prompts = await run("tl", ["prompts", "--since", "2026-10-01", "--until", "2026-10-01"]);
    expect(prompts.code).toBe(0);
    expect(JSON.parse(prompts.out).map((p: { text: string }) => p.text)).toEqual([
      "giraffa elefante leone savana",
      "una domanda che non c'entra niente",
    ]);

    const polar = (await addEntry("orso bianco artico", "copriti", [])).id;
    await markArchived([polar], new Date());
    const before = JSON.stringify([...memory.collection("pi_identity")!.entries()]);
    const reach = await run("ti", ["reach"], prompts.out);
    expect(reach.err).toBe("");
    expect(reach.code).toBe(0);
    const report = JSON.parse(reach.out);
    expect(report.prompts).toBe(2);
    expect(report.rules.map((r: { id: string }) => r.id)).not.toContain(polar);
    expect(report.unreached.map((r: { if: string }) => r.if)).toContain("pinguino foca orso polare");
    expect(report.rules.filter((r: { reached: number }) => r.reached > 0)).toHaveLength(2);
    expect(JSON.stringify([...memory.collection("pi_identity")!.entries()])).toBe(before);
  });

  test("ti reach refuses stdin that is not a list of prompts", async () => {
    const result = await run("ti", ["reach"], '{"text": "uno"}');
    expect(result.code).not.toBe(0);
    expect(result.err).toContain("JSON array");
  });
});
