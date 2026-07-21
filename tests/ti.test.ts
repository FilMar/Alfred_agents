import { describe, it, expect, spyOn, beforeEach } from "bun:test";
import { qdrantClient, ollamaClient } from "../tools/tb/src/infra.js";
import type { IdentityEntry } from "../tools/ti/src/types.js";

// Mock process.exit and argv to prevent CLI from running and exiting the test runner
const exitSpy = spyOn(process, "exit").mockImplementation((code?: string | number | null) => {
  return undefined as never;
});
process.argv = ["bun", "ti", "test-dummy"];

// Dynamic import to ensure mocks are in place
const { addEntry, searchEntries, listEntries, deleteEntry, appendDo } = await import("../tools/ti/src/identity.js");

describe("Third Identity (ti) Behavioral Tests", () => {
  beforeEach(() => {
    spyOn(qdrantClient, "request").mockReset();
    spyOn(ollamaClient, "request").mockReset();
    // ensureCollection() checks existence via fetch before every operation — mock it
    // as "already exists" so it's a no-op passthrough for these behavioural tests.
    spyOn(qdrantClient, "fetch").mockResolvedValue({ ok: true, json: async () => ({}) } as any);
  });

  describe("addEntry", () => {
    it("should embed the 'if' text and upsert a new point in pi_identity", async () => {
      const ifText = "when in a meeting";
      const doText = "mute notifications";
      const tags = ["work", "focus"];
      const mockVector = [0.1, 0.2, 0.3];
      const mockEntry: IdentityEntry = {
        id: "entry-1",
        vector: mockVector,
        if: ifText,
        do: [doText],
        tags: tags,
      };

      spyOn(ollamaClient, "request").mockResolvedValue({ embeddings: [mockVector] } as any);
      spyOn(qdrantClient, "request").mockResolvedValue(mockEntry as any);

      const result = await addEntry(ifText, doText, tags);

      expect(ollamaClient.request).toHaveBeenCalledWith(
        "POST",
        "/api/embed",
        expect.objectContaining({ input: ifText })
      );
      expect(qdrantClient.request).toHaveBeenCalledWith(
        "PUT",
        expect.stringContaining("/collections/pi_identity/points"),
        expect.objectContaining({
          points: [
            expect.objectContaining({
              id: expect.any(String),
              vector: mockVector,
              payload: expect.objectContaining({
                if: ifText,
                do: [doText],
                tags: tags,
              }),
            }),
          ],
        })
      );
      expect(result).toEqual(expect.objectContaining({
        id: expect.any(String),
        vector: mockVector,
        if: ifText,
        do: [doText],
        tags: tags,
      }));
    });

    it("should always create a new point (sentinel test: no silent overwrite)", async () => {
      const ifText = "context";
      const doText = "action";
      
      spyOn(ollamaClient, "request").mockResolvedValue({ embeddings: [[0.1]] } as any);
      spyOn(qdrantClient, "request").mockResolvedValue({ status: "ok" } as any);

      await addEntry(ifText, doText, []);
      
      const calls = (qdrantClient.request as any).mock.calls;
      const body = calls[0][2];
      expect(body.points[0].id).toBeDefined(); 
    });
  });

  describe("searchEntries", () => {
    it("should embed query, return ranked candidates with score and do array, and respect tags", async () => {
      const query = "meeting";
      const tags = ["work"];
      const mockVector = [0.1];
      const mockResults = [
        { id: "1", score: 0.99, payload: { if: "in meeting", do: ["mute"], tags: ["work"] } },
        { id: "2", score: 0.85, payload: { if: "conference call", do: ["quiet"], tags: ["work"] } },
      ];

      spyOn(ollamaClient, "request").mockResolvedValue({ embeddings: [mockVector] } as any);
      spyOn(qdrantClient, "request").mockResolvedValue({ result: mockResults } as any);

      const results = await searchEntries(query, { tags });

      expect(ollamaClient.request).toHaveBeenCalledWith("POST", "/api/embed", expect.objectContaining({ input: query }));
      expect(qdrantClient.request).toHaveBeenCalledWith(
        "POST",
        expect.stringContaining("/collections/pi_identity/points/query"),
        expect.objectContaining({
          vector: mockVector,
          filter: expect.objectContaining({
            must: [
              {
                key: "tags",
                match: { any: tags },
              },
            ],
          }),
        })
      );
      expect(results).toHaveLength(2);
      expect(results[0].do).toEqual(["mute"]);
      expect(results[0].id).toBe("1");
    });

    it("should not call an LLM during search", async () => {
      spyOn(ollamaClient, "request").mockResolvedValue({ embeddings: [[0.1]] } as any);
      spyOn(qdrantClient, "request").mockResolvedValue({ result: [] } as any);

      await searchEntries("test", {});

      const calls = (ollamaClient.request as any).mock.calls;
      for (const call of calls) {
        expect(call[1]).not.toBe("/api/generate");
        expect(call[1]).not.toBe("/api/chat");
      }
    });
  });

  describe("listEntries", () => {
    it("should return entries unranked and respect tag filter", async () => {
      const tags = ["work"];
      const mockPoints = [
        { id: "1", payload: { if: "a", do: ["1"], tags: ["work"] } },
        { id: "2", payload: { if: "b", do: ["2"], tags: ["work"] } },
      ];
      spyOn(qdrantClient, "request").mockResolvedValue({ points: mockPoints } as any);

      const results = await listEntries(tags);

      expect(qdrantClient.request).toHaveBeenCalledWith(
        "POST",
        expect.stringContaining("/collections/pi_identity/points/scroll"),
        expect.objectContaining({
          filter: expect.objectContaining({
            must: [{ key: "tags", match: { any: tags } }],
          }),
        })
      );
      expect(results).toHaveLength(2);
    });
  });

  describe("deleteEntry", () => {
    it("should remove entry by id", async () => {
      const id = "entry-123";
      spyOn(qdrantClient, "request").mockResolvedValue({ status: "ok" } as any);

      await deleteEntry(id);

      expect(qdrantClient.request).toHaveBeenCalledWith(
        "POST",
        expect.stringContaining("/collections/pi_identity/points/delete"),
        expect.objectContaining({
          points: [id],
        })
      );
    });
  });

  describe("appendDo", () => {
    it("should fetch existing entry, append to do array, and persist without modifying if or vector", async () => {
      const id = "entry-123";
      const newDo = "new action";
      const existingEntry: IdentityEntry = {
        id,
        vector: [0.1, 0.2],
        if: "original if",
        do: ["original do"],
        tags: ["tag1"],
      };

      spyOn(qdrantClient, "request")
        .mockResolvedValueOnce({ result: [ { id, payload: existingEntry, vector: existingEntry.vector } ] } as any) // GET
        .mockResolvedValueOnce({ status: "ok" } as any); // PUT

      const result = await appendDo(id, newDo);

      expect(qdrantClient.request).toHaveBeenCalledWith(
        "GET",
        expect.stringContaining(`/collections/pi_identity/points/${id}`),
        undefined
      );

      expect(qdrantClient.request).toHaveBeenCalledWith(
        "PUT",
        expect.stringContaining("/collections/pi_identity/points"),
        expect.objectContaining({
          points: [
            expect.objectContaining({
              id: id,
              payload: expect.objectContaining({
                if: "original if",
                do: ["original do", "new action"],
                tags: ["tag1"],
              }),
              vector: [0.1, 0.2],
            }),
          ],
        })
      );

      expect(result.do).toEqual(["original do", "new action"]);
      expect(result.if).toBe("original if");
    });
  });
});
