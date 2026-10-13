// tb search --no-archived: the filter leaves out the archived notes, the related ones too.
// Without the option an archived note is found like any other, and it shows archived_at.

import { afterAll, describe, expect, test } from "bun:test";
import { startMemoryStubs } from "./helpers/td_stubs.ts";

const memory = startMemoryStubs();
afterAll(() => memory.stop());

const { createNote, addRefs, markArchived, searchNotes } = await import("../tools/tb/src/notes.ts");

const AT = new Date("2026-10-13T12:00:00.000Z");
const idsOf = (results: Array<{ note: { id: string } }>): string[] => results.map((result) => result.note.id).sort();

const live = await createNote({ what: "zebra quagga okapi savana", why: "nota viva" });
const archived = await createNote({ what: "cactus succulenta deserto arido", why: "nota archiviata" });
await addRefs(live.id, [{ id: archived.id, reason: "perché sì" }]);
await markArchived([archived.id], AT);

describe("searchNotes with exclude_archived", () => {
  test("a direct hit on an archived note is left out", async () => {
    const results = await searchNotes("cactus succulenta deserto arido", { limit: 5, depth: 0, record_hits: false, exclude_archived: true });
    expect(idsOf(results)).toEqual([live.id]);
  });

  test("an archived note reached through a ref is left out", async () => {
    const results = await searchNotes("zebra quagga okapi savana", { limit: 1, depth: 1, record_hits: false, exclude_archived: true });
    expect(idsOf(results)).toEqual([live.id]);
  });
});

describe("searchNotes without exclude_archived", () => {
  test("an archived note is found directly and shows archived_at", async () => {
    const results = await searchNotes("cactus succulenta deserto arido", { limit: 1, depth: 0, record_hits: false });
    expect(results[0].note.id).toBe(archived.id);
    expect(results[0].note.archived_at).toBe(AT.toISOString());
  });

  test("an archived note is reached through a ref", async () => {
    const results = await searchNotes("zebra quagga okapi savana", { limit: 1, depth: 1, record_hits: false });
    expect(idsOf(results)).toEqual([live.id, archived.id].sort());
  });
});

describe("tb search as a process", () => {
  const run = async (...extra: string[]): Promise<string[]> => {
    const proc = Bun.spawn(["bun", "tools/tb/src/cli.ts", "search", "zebra quagga okapi savana", "--limit", "1", "--depth", "1", "--no-hits", ...extra], {
      env: process.env,
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(await proc.exited).toBe(0);
    return idsOf(JSON.parse(await new Response(proc.stdout).text()));
  };

  test("--no-archived leaves out the archived note reached through a ref", async () => {
    expect(await run("--no-archived")).toEqual([live.id]);
  });

  test("without the flag the archived note is found", async () => {
    expect(await run()).toEqual([live.id, archived.id].sort());
  });
});
