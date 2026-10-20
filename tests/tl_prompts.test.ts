import { describe, expect, test } from "bun:test";
import { isHumanPrompt, promptsOf } from "../tools/tl/src/prompts.ts";
import type { PromptSource } from "../tools/tl/src/prompts.ts";

type Exchange = PromptSource["exchange"];

// The spec's test Exchange: { id, session: "s", timestamp, kind, actor: "alfredo" }, plus meta when it serves.
function exchangeOf(id: string, timestamp: string, kind: Exchange["kind"], meta?: Exchange["meta"]): Exchange {
  return meta === undefined
    ? { id, session: "s", timestamp, kind, actor: "alfredo" }
    : { id, session: "s", timestamp, kind, actor: "alfredo", meta };
}

describe("isHumanPrompt", () => {
  const timestamp = "2024-01-01T00:00:00Z";

  const cases: ReadonlyArray<{ name: string; exchange: Exchange; expected: boolean }> = [
    { name: "chat without meta is human", exchange: exchangeOf("e1", timestamp, "chat"), expected: true },
    { name: "chat with meta without trigger is human", exchange: exchangeOf("e2", timestamp, "chat", {}), expected: true },
    { name: "chat with trigger human is human", exchange: exchangeOf("e3", timestamp, "chat", { trigger: "human" }), expected: true },
    { name: "subtask without meta is not human", exchange: exchangeOf("e4", timestamp, "subtask"), expected: false },
    { name: "subtask with trigger human is not human", exchange: exchangeOf("e5", timestamp, "subtask", { trigger: "human" }), expected: false },
    { name: "chat with trigger task-notification is not human", exchange: exchangeOf("e6", timestamp, "chat", { trigger: "task-notification" }), expected: false },
    { name: "chat with trigger peer is not human", exchange: exchangeOf("e7", timestamp, "chat", { trigger: "peer" }), expected: false },
    { name: "chat with any other trigger is not human", exchange: exchangeOf("e8", timestamp, "chat", { trigger: "agent" }), expected: false },
  ];

  for (const row of cases) {
    test(row.name, () => {
      expect(isHumanPrompt(row.exchange)).toBe(row.expected);
    });
  }
});

describe("promptsOf", () => {
  test("no blank text", () => {
    promptsOf([
      { exchange: exchangeOf("e1", "2024-01-01T00:00:00Z", "chat"), text: "  real prompt  " },
      { exchange: exchangeOf("e2", "2024-01-02T00:00:00Z", "chat"), text: "" },
      { exchange: exchangeOf("e3", "2024-01-03T00:00:00Z", "chat"), text: "   " },
    ]);
  });

  test("no text twice", () => {
    promptsOf([
      { exchange: exchangeOf("e1", "2024-01-01T00:00:00Z", "chat"), text: "write the tests" },
      { exchange: exchangeOf("e2", "2024-01-02T00:00:00Z", "chat"), text: "write the tests" },
      { exchange: exchangeOf("e3", "2024-01-03T00:00:00Z", "chat"), text: "same words" },
      { exchange: exchangeOf("e4", "2024-01-04T00:00:00Z", "chat"), text: "  same words  " },
    ]);
  });

  test("oldest first", () => {
    promptsOf([
      { exchange: exchangeOf("e1", "2024-01-03T00:00:00Z", "chat"), text: "last" },
      { exchange: exchangeOf("e2", "2024-01-01T00:00:00Z", "chat"), text: "first" },
      { exchange: exchangeOf("e3", "2024-01-02T00:00:00Z", "chat"), text: "middle" },
      { exchange: exchangeOf("e4", "2024-01-02T00:00:00Z", "chat"), text: "middle too" },
    ]);
  });

  test("every prompt comes from a human exchange", () => {
    promptsOf([
      { exchange: exchangeOf("e1", "2024-01-01T00:00:00Z", "chat"), text: "from me" },
      { exchange: exchangeOf("e2", "2024-01-02T00:00:00Z", "chat", { trigger: "human" }), text: "also from me" },
      { exchange: exchangeOf("e3", "2024-01-03T00:00:00Z", "subtask"), text: "subtask chatter" },
      { exchange: exchangeOf("e4", "2024-01-04T00:00:00Z", "chat", { trigger: "peer" }), text: "agent chatter" },
      { exchange: exchangeOf("e5", "2024-01-05T00:00:00Z", "chat", { trigger: "task-notification" }), text: "task chatter" },
    ]);
  });

  test("oldest first, ties by exchange id", () => {
    promptsOf([
      { exchange: exchangeOf("e9", "2024-01-01T00:00:00Z", "chat"), text: "later id" },
      { exchange: exchangeOf("e1", "2024-01-01T00:00:00Z", "chat"), text: "earlier id" },
    ]);
  });

  test("text is trimmed", () => {
    promptsOf([{ exchange: exchangeOf("e1", "2024-01-01T00:00:00Z", "chat"), text: "  spaced  " }]);
  });

  test("empty sources", () => {
    promptsOf([]);
  });
});