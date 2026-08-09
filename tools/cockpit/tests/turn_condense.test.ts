import { describe, expect, mock, test } from "bun:test";
import type { Exchange } from "../src/bank/types.ts";

const ex: Exchange = { at: "2026-08-09T10:00:00Z", user: "hello", agent: "hi there" };

describe("condense", () => {
  test("sends the summary and exchange to Ollama, returns the trimmed response", async () => {
    let seenBody: unknown;
    mock.module("../../tb/src/infra.ts", () => ({
      ollamaClient: {
        request: async (_method: string, _path: string, body: unknown) => {
          seenBody = body;
          return { response: "  - updated summary  \n" };
        },
      },
    }));
    const { condense } = await import("../src/turn/condense.ts");
    const result = await condense("old summary", ex);
    expect(result).toBe("- updated summary");
    expect(seenBody).toMatchObject({ model: "gemma4:cloud", stream: false });
    expect((seenBody as { prompt: string }).prompt).toContain("old summary");
    expect((seenBody as { prompt: string }).prompt).toContain("hello");
    expect((seenBody as { prompt: string }).prompt).toContain("hi there");
  });

  test("an empty summary is rendered as (empty), not blank", async () => {
    let seenBody: unknown;
    mock.module("../../tb/src/infra.ts", () => ({
      ollamaClient: {
        request: async (_method: string, _path: string, body: unknown) => {
          seenBody = body;
          return { response: "first summary" };
        },
      },
    }));
    const { condense } = await import("../src/turn/condense.ts");
    await condense("", ex);
    expect((seenBody as { prompt: string }).prompt).toContain("(empty)");
  });

  test("an Ollama failure rejects, the caller decides how to degrade", async () => {
    mock.module("../../tb/src/infra.ts", () => ({
      ollamaClient: {
        request: async () => {
          throw new Error("model down");
        },
      },
    }));
    const { condense } = await import("../src/turn/condense.ts");
    await expect(condense("old", ex)).rejects.toThrow("model down");
  });
});
