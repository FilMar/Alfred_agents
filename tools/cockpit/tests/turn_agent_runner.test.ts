import { describe, expect, test } from "bun:test";
import { extractReplyText, makeEmitWidgetTool, makeProposeLedgerTool } from "../src/turn/agent-runner.ts";

describe("extractReplyText", () => {
  test("no messages -> empty string", () => {
    expect(extractReplyText([])).toBe("");
  });

  test("joins text content of the last assistant message", () => {
    const messages = [
      { role: "user", content: [{ type: "text", text: "hi" }] },
      { role: "assistant", content: [{ type: "text", text: "first" }] },
      { role: "toolResult", content: [{ type: "text", text: "tool output" }] },
      { role: "assistant", content: [{ type: "text", text: "final " }, { type: "text", text: "reply" }] },
    ];
    expect(extractReplyText(messages)).toBe("final reply");
  });

  test("ignores non-text content in the assistant message", () => {
    const messages = [
      { role: "assistant", content: [{ type: "toolCall" }, { type: "text", text: "answer" }] } as never,
    ];
    expect(extractReplyText(messages)).toBe("answer");
  });
});

describe("makeEmitWidgetTool", () => {
  test("pushes emitted widgets into the shared array", async () => {
    const widgets: unknown[] = [];
    const tool = makeEmitWidgetTool(widgets as never);
    const widget = { type: "table", columns: ["a"], rows: [["1"]] };
    await tool.execute("id1", widget as never, undefined as never, undefined as never, undefined as never);
    expect(widgets).toEqual([widget]);
  });
});

describe("makeProposeLedgerTool", () => {
  test("pushes proposed text into the shared array", async () => {
    const proposals: string[] = [];
    const tool = makeProposeLedgerTool(proposals);
    await tool.execute("id1", { text: "remember this" } as never, undefined as never, undefined as never, undefined as never);
    expect(proposals).toEqual(["remember this"]);
  });
});
