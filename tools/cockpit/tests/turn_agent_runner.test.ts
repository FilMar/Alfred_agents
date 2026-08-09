import { describe, expect, test } from "bun:test";
import {
  extractReplyText,
  makeEmitWidgetTool,
  makeProposeLedgerTool,
  subscribeProgress,
} from "../src/turn/agent-runner.ts";

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

function fakeSession() {
  let listener: (event: unknown) => void = () => {};
  return {
    subscribe: (l: (event: unknown) => void) => {
      listener = l;
    },
    fire: (event: unknown) => listener(event),
  };
}

describe("subscribeProgress", () => {
  test("a tool call emits its name", () => {
    const session = fakeSession();
    const lines: unknown[] = [];
    subscribeProgress(session, (l) => lines.push(l));
    session.fire({ type: "tool_execution_start", toolName: "bash" });
    expect(lines).toEqual([{ type: "progress", text: "tool: bash" }]);
  });

  test("consecutive thinking deltas emit only once", () => {
    const session = fakeSession();
    const lines: unknown[] = [];
    subscribeProgress(session, (l) => lines.push(l));
    session.fire({ type: "message_update", assistantMessageEvent: { type: "thinking_delta" } });
    session.fire({ type: "message_update", assistantMessageEvent: { type: "thinking_delta" } });
    session.fire({ type: "message_update", assistantMessageEvent: { type: "thinking_delta" } });
    expect(lines).toEqual([{ type: "progress", text: "thinking…" }]);
  });

  test("switching from thinking to answering emits a second line", () => {
    const session = fakeSession();
    const lines: unknown[] = [];
    subscribeProgress(session, (l) => lines.push(l));
    session.fire({ type: "message_update", assistantMessageEvent: { type: "thinking_delta" } });
    session.fire({ type: "message_update", assistantMessageEvent: { type: "text_delta" } });
    expect(lines).toEqual([
      { type: "progress", text: "thinking…" },
      { type: "progress", text: "answering…" },
    ]);
  });

  test("a tool call resets the dedupe so a repeated thinking burst emits again", () => {
    const session = fakeSession();
    const lines: unknown[] = [];
    subscribeProgress(session, (l) => lines.push(l));
    session.fire({ type: "message_update", assistantMessageEvent: { type: "thinking_delta" } });
    session.fire({ type: "tool_execution_start", toolName: "read" });
    session.fire({ type: "message_update", assistantMessageEvent: { type: "thinking_delta" } });
    expect(lines).toEqual([
      { type: "progress", text: "thinking…" },
      { type: "progress", text: "tool: read" },
      { type: "progress", text: "thinking…" },
    ]);
  });

  test("ignores unrelated event types", () => {
    const session = fakeSession();
    const lines: unknown[] = [];
    subscribeProgress(session, (l) => lines.push(l));
    session.fire({ type: "tool_execution_end", toolName: "bash" });
    session.fire({ type: "agent_end" });
    expect(lines).toEqual([]);
  });
});
