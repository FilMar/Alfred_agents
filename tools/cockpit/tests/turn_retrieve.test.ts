import { describe, expect, mock, test } from "bun:test";

describe("retrieve", () => {
  test("maps tb and ti search hits into flat strings", async () => {
    mock.module("../../tb/src/notes.ts", () => ({
      searchNotes: async () => [{ note: { what: "the idea", why: "context" } }],
    }));
    mock.module("../../ti/src/identity.ts", () => ({
      searchEntries: async () => [{ if: "when X", do: ["do Y", "do Z"] }],
    }));
    const { retrieve } = await import("../src/turn/retrieve.ts");
    const r = await retrieve("query");
    expect(r.tb).toEqual(["the idea"]);
    expect(r.ti).toEqual(["when X -> do Y; do Z"]);
  });

  test("no hits from either source degrades to empty arrays", async () => {
    mock.module("../../tb/src/notes.ts", () => ({ searchNotes: async () => [] }));
    mock.module("../../ti/src/identity.ts", () => ({ searchEntries: async () => [] }));
    const { retrieve } = await import("../src/turn/retrieve.ts");
    const r = await retrieve("query");
    expect(r).toEqual({ tb: [], ti: [] });
  });

  test("a rejection from tb or ti propagates, the caller decides how to degrade", async () => {
    mock.module("../../tb/src/notes.ts", () => ({
      searchNotes: async () => {
        throw new Error("qdrant is asleep");
      },
    }));
    mock.module("../../ti/src/identity.ts", () => ({ searchEntries: async () => [] }));
    const { retrieve } = await import("../src/turn/retrieve.ts");
    await expect(retrieve("query")).rejects.toThrow("qdrant is asleep");
  });
});
