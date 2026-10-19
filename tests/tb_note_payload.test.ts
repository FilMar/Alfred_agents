// The payload of a note in the store, exact: a key that appears or goes missing fails here.
// The fields arrive from precise writes. createNote writes the first group, a hit adds the counters, a ref adds backrefs.

import { afterAll, describe, expect, test } from "bun:test";
import { startMemoryStubs } from "./helpers/td_stubs.ts";

const memory = startMemoryStubs();
afterAll(() => memory.stop());

const { createNote, addRefs, searchNotes, markArchived, clearArchived } = await import("../tools/tb/src/notes.ts");
const { EMBED_MODEL } = await import("../tools/tb/src/infra.ts");
const { ABOUT_NOBODY } = await import("../tools/tb/src/types.ts");

const payloadOf = (id: string): unknown => {
  const point = memory.collections.get("third-brain")?.get(id);
  if (point === undefined) throw new Error(`no point in the store: ${id}`);
  return point.payload;
};

const fresh = (what: string, why: string) => ({
  id: expect.any(String),
  when: expect.any(String),
  why,
  what,
  tags: [],
  kind: "dato",
  refs: [],
  embed_model: EMBED_MODEL,
  about: ABOUT_NOBODY,
  updated_at: expect.any(String),
});

describe("createNote", () => {
  test("stores the fresh payload and nothing else", async () => {
    const note = await createNote({ what: "alfa uno", why: "motivo uno" });
    expect(payloadOf(note.id)).toStrictEqual(fresh("alfa uno", "motivo uno"));
  });

  test("adds source and exchange when they are given", async () => {
    const note = await createNote({ what: "alfa due", why: "motivo due", source: "https://example.org/a", exchange: "exchange-7" });
    expect(payloadOf(note.id)).toStrictEqual({
      ...fresh("alfa due", "motivo due"),
      source: "https://example.org/a",
      exchange: "exchange-7",
    });
  });
});

describe("the payload after a search", () => {
  test("a direct hit adds hits and last_hit; a hit through a ref adds hits_related, last_hit_related and the backref", async () => {
    const direct = await createNote({ what: "zebra quagga okapi", why: "nota diretta" });
    const related = await createNote({ what: "cactus succulenta deserto", why: "nota collegata" });
    await addRefs(direct.id, [{ id: related.id, reason: "perché sì" }]);

    await searchNotes("zebra quagga okapi", { limit: 1, depth: 1 });

    expect(payloadOf(direct.id)).toStrictEqual({
      ...fresh("zebra quagga okapi", "nota diretta"),
      refs: [{ id: related.id, reason: "perché sì" }],
      hits: 1,
      last_hit: expect.any(String),
    });
    expect(payloadOf(related.id)).toStrictEqual({
      ...fresh("cactus succulenta deserto", "nota collegata"),
      backrefs: [direct.id],
      hits_related: 1,
      last_hit_related: expect.any(String),
    });
  });
});

describe("the payload after archiving", () => {
  test("archived_at is the only key added, and clearing it gives the fresh payload back", async () => {
    const at = new Date("2026-10-13T12:00:00.000Z");
    const note = await createNote({ what: "gamma tre", why: "motivo tre" });

    await markArchived([note.id], at);
    expect(payloadOf(note.id)).toStrictEqual({ ...fresh("gamma tre", "motivo tre"), archived_at: at.toISOString() });

    await clearArchived([note.id]);
    expect(payloadOf(note.id)).toStrictEqual(fresh("gamma tre", "motivo tre"));
  });
});
