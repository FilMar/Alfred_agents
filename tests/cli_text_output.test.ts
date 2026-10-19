// tb and ti: search prints text blocks by default and JSON with --json; meta and the id commands accept a prefix.
// The CLIs run as processes against the memory stubs.

import { afterAll, describe, expect, test } from "bun:test";
import { startMemoryStubs } from "./helpers/td_stubs.ts";

const memory = startMemoryStubs();
afterAll(() => memory.stop());

const { createNote } = await import("../tools/tb/src/notes.ts");
const { addEntry } = await import("../tools/ti/src/identity.ts");

const note = await createNote({ what: "zebra quagga okapi savana", why: "nota di prova" });
const rule = await addEntry("giraffa gazzella antilope prateria", "guarda sempre la savana", ["prova"]);
const second = await addEntry("pinguino foca iceberg polare", "porta un cappotto", ["prova"]);

const run = async (tool: "tb" | "ti", ...args: string[]): Promise<{ code: number; out: string; err: string }> => {
  const proc = Bun.spawn(["bun", `tools/${tool}/src/cli.ts`, ...args], { env: process.env, stdout: "pipe", stderr: "pipe" });
  const code = await proc.exited;
  return { code, out: await new Response(proc.stdout).text(), err: await new Response(proc.stderr).text() };
};

describe("tb search", () => {
  test("prints one block: the short id, the what, the why", async () => {
    const result = await run("tb", "search", "zebra quagga okapi savana", "--limit", "1", "--depth", "0", "--no-hits");
    expect(result.code).toBe(0);
    expect(result.out).toBe(`-- ${note.id.slice(0, 8)}\n${note.what}\n${note.why}\n`);
  });

  test("with --json prints the full results", async () => {
    const result = await run("tb", "search", "zebra quagga okapi savana", "--limit", "1", "--depth", "0", "--no-hits", "--json");
    const parsed = JSON.parse(result.out);
    expect(parsed[0].note.id).toBe(note.id);
    expect(Object.keys(parsed[0]).sort()).toEqual(["citation", "note", "score", "via"]);
  });
});

describe("tb meta", () => {
  test("a prefix gives the note that search --json shows", async () => {
    const found = JSON.parse((await run("tb", "search", "zebra quagga okapi savana", "--limit", "1", "--depth", "0", "--no-hits", "--json")).out);
    const meta = await run("tb", "meta", note.id.slice(0, 8));
    expect(meta.code).toBe(0);
    expect(JSON.parse(meta.out)).toEqual(found[0].note);
  });

  test("an unknown prefix fails with a message", async () => {
    const meta = await run("tb", "meta", "ffffffff");
    expect(meta.code).toBe(1);
    expect(meta.err).toContain('No note id starts with "ffffffff"');
  });
});

describe("ti search", () => {
  test("prints one block per rule: the short id, then the actions", async () => {
    const result = await run("ti", "search", "giraffa gazzella antilope prateria", "--limit", "1");
    expect(result.code).toBe(0);
    expect(result.out).toBe(`-- ${rule.id.slice(0, 8)}\nguarda sempre la savana\n`);
  });

  test("with --json prints the rules without the vector", async () => {
    const result = await run("ti", "search", "giraffa gazzella antilope prateria", "--limit", "1", "--json");
    const parsed = JSON.parse(result.out);
    expect(parsed[0].id).toBe(rule.id);
    expect("vector" in parsed[0]).toBe(false);
  });

  test("prints nothing when no rule passes the score", async () => {
    const result = await run("ti", "search", "giraffa gazzella antilope prateria", "--min-score", "2");
    expect(result.code).toBe(0);
    expect(result.out).toBe("");
  });
});

describe("ti ids", () => {
  test("meta with a prefix gives the rule that search --json shows, minus the score", async () => {
    const found = JSON.parse((await run("ti", "search", "giraffa gazzella antilope prateria", "--limit", "1", "--json")).out);
    const meta = JSON.parse((await run("ti", "meta", rule.id.slice(0, 8))).out);
    const { score, ...withoutScore } = found[0];
    expect(meta).toEqual(withoutScore);
  });

  test("append-do accepts a prefix", async () => {
    const result = await run("ti", "append-do", rule.id.slice(0, 8), "--do", "non fidarti della prateria");
    expect(result.code).toBe(0);
    expect(JSON.parse((await run("ti", "meta", rule.id)).out).do).toEqual(["guarda sempre la savana", "non fidarti della prateria"]);
  });

  test("delete accepts a prefix and reports the full id", async () => {
    const result = await run("ti", "delete", second.id.slice(0, 8));
    expect(result.code).toBe(0);
    expect(JSON.parse(result.out)).toEqual({ id: second.id, deleted: true });
    expect((await run("ti", "meta", second.id)).code).toBe(1);
  });

  test("an unknown prefix fails with a message", async () => {
    const result = await run("ti", "meta", "ffffffff");
    expect(result.code).toBe(1);
    expect(result.err).toContain('No rule id starts with "ffffffff"');
  });
});
