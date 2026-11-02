import { afterAll, describe, expect, test } from "bun:test";
import type { Usage } from "@earendil-works/pi-ai";

import { MAX_TRIES, ModelAnswer, ModelCaller, ModelTokens } from "../tools/td/src/model_caller.ts";
import type { JsonCheck } from "../tools/td/src/model_caller.ts";
import { Role } from "../tools/td/src/config.ts";
import { extractorJson } from "./helpers/td_stubs.ts";


type Reply = { text: string; thinking?: string } | { status: number } | { delayMs: number };
const queue: Reply[] = [];
const seen: Array<{ messages: Array<{ role: string; content: unknown }>; reasoning_effort?: string }> = [];

function sse(text: string, thinking?: string): string {
  const chunks = [
    ...(thinking === undefined ? [] : [{ id: "c1", object: "chat.completion.chunk", created: 1, model: "m",
      choices: [{ index: 0, delta: { role: "assistant", reasoning_content: thinking }, finish_reason: null }] }]),
    { id: "c1", object: "chat.completion.chunk", created: 1, model: "m",
      choices: [{ index: 0, delta: { role: "assistant", content: text }, finish_reason: null }] },
    { id: "c1", object: "chat.completion.chunk", created: 1, model: "m",
      choices: [{ index: 0, delta: {}, finish_reason: "stop" }] },
    { id: "c1", object: "chat.completion.chunk", created: 1, model: "m", choices: [],
      usage: { prompt_tokens: 30, completion_tokens: 7, total_tokens: 37, prompt_tokens_details: { cached_tokens: 10 } } },
  ];
  return chunks.map((c) => `data: ${JSON.stringify(c)}\n\n`).join("") + "data: [DONE]\n\n";
}

const server = Bun.serve({
  port: 0,
  async fetch(req) {
    seen.push((await req.json()) as (typeof seen)[number]);
    const next = queue.shift() ?? { status: 400 };
    if ("delayMs" in next) {
      await Bun.sleep(next.delayMs);
      return new Response(sse('{"a":1}'), { headers: { "content-type": "text/event-stream" } });
    }
    if ("status" in next) {
      return new Response(JSON.stringify({ error: { message: "fake failure" } }),
        { status: next.status, headers: { "content-type": "application/json" } });
    }
    return new Response(sse(next.text, next.thinking), { headers: { "content-type": "text/event-stream" } });
  },
});

afterAll(() => {
  server.stop();
});

const base = `http://localhost:${server.port}/v1`;

function role(baseUrl: string, thinking: "off" | "low" = "low", reasoning = true): Role {
  const json = extractorJson(baseUrl, "You answer in JSON.").extract;
  return Role.fromJson({ ...json, connection: { ...json.connection, reasoning }, thinking });
}

const check: JsonCheck = (json) => {
  if (typeof json !== "object" || json === null || Array.isArray(json)) return "a must be 1";
  return (json as { a?: unknown }).a === 1 ? null : "a must be 1";
};

const usage: Usage = {
  input: 20, output: 7, cacheRead: 10, cacheWrite: 0, totalTokens: 37,
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
};

function usageOf(input: number, output: number, cacheRead: number, cacheWrite: number): Usage {
  return {
    input, output, cacheRead, cacheWrite,
    totalTokens: input + output + cacheRead + cacheWrite,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
  };
}

test("MAX_TRIES is 2: the answer, then one fix", () => {
  expect(MAX_TRIES).toBe(2);
});

describe("ModelTokens", () => {
  const counts: [string, () => unknown, string | null][] = [
    ["zero: every count is zero", () => ModelTokens.zero(), null],
    ["of: the tokens carry the usage", () => ModelTokens.of(usage), null],
    ["of: 0, at the edge, is a count", () => ModelTokens.of(usageOf(0, 0, 0, 0)), null],
    ["of: 1, just inside the edge, is a count", () => ModelTokens.of(usageOf(1, 1, 1, 1)), null],
    ["of: input below 0 is not a count", () => ModelTokens.of({ ...usage, input: -1 }), "ModelTokens.of: input is a count"],
    ["of: output below 0 is not a count", () => ModelTokens.of({ ...usage, output: -1 }), "ModelTokens.of: output is a count"],
    ["of: cacheRead below 0 is not a count", () => ModelTokens.of({ ...usage, cacheRead: -1 }), "ModelTokens.of: cacheRead is a count"],
    ["of: cacheWrite below 0 is not a count", () => ModelTokens.of({ ...usage, cacheWrite: -1 }), "ModelTokens.of: cacheWrite is a count"],
    ["of: a fractional input is not a count", () => ModelTokens.of({ ...usage, input: 0.5 }), "ModelTokens.of: input is a count"],
    ["of: an infinite input is not a count", () => ModelTokens.of({ ...usage, input: Infinity }), "ModelTokens.of: input is a count"],
    ["of: NaN is not a count", () => ModelTokens.of({ ...usage, input: NaN }), "ModelTokens.of: input is a count"],
  ];

  for (const [name, call, message] of counts) {
    test(name, () => {
      if (message === null) call();
      else expect(call).toThrow(message);
    });
  }

  test("plus: each count is the sum of both", () => {
    const a = ModelTokens.of(usage);
    const b = ModelTokens.of(usageOf(5, 3, 2, 1));
    a.plus(b);
  });
});

describe("ModelAnswer", () => {
  const TRIES = "tries is from 1 to MAX_TRIES";
  const answers: [string, () => unknown, string | null][] = [
    ["accepted: the answer is ok on the first try", () => ModelAnswer.accepted({ a: 1 }, 1, ModelTokens.zero()), null],
    ["accepted: the answer is ok on the last try", () => ModelAnswer.accepted({ a: 1 }, MAX_TRIES, ModelTokens.zero()), null],
    ["accepted: try 0 is not a try", () => ModelAnswer.accepted({ a: 1 }, 0, ModelTokens.zero()), `ModelAnswer.accepted: ${TRIES}`],
    ["accepted: one try past MAX_TRIES is not a try", () => ModelAnswer.accepted({ a: 1 }, MAX_TRIES + 1, ModelTokens.zero()), `ModelAnswer.accepted: ${TRIES}`],
    ["accepted: a fractional try is not a try", () => ModelAnswer.accepted({ a: 1 }, 1.5, ModelTokens.zero()), `ModelAnswer.accepted: ${TRIES}`],
    ["accepted: the json is given", () => ModelAnswer.accepted(undefined, 1, ModelTokens.zero()), "ModelAnswer.accepted: the json is given"],
    ["rejected: the answer is not ok on the first try", () => ModelAnswer.rejected("no luck", 1, ModelTokens.zero()), null],
    ["rejected: the answer is not ok on the last try", () => ModelAnswer.rejected("no luck", MAX_TRIES, ModelTokens.zero()), null],
    ["rejected: try 0 is not a try", () => ModelAnswer.rejected("no luck", 0, ModelTokens.zero()), `ModelAnswer.rejected: ${TRIES}`],
    ["rejected: one try past MAX_TRIES is not a try", () => ModelAnswer.rejected("no luck", MAX_TRIES + 1, ModelTokens.zero()), `ModelAnswer.rejected: ${TRIES}`],
    ["rejected: a fractional try is not a try", () => ModelAnswer.rejected("no luck", 1.5, ModelTokens.zero()), `ModelAnswer.rejected: ${TRIES}`],
    ["rejected: the failure is not blank", () => ModelAnswer.rejected("", 1, ModelTokens.zero()), "ModelAnswer.rejected: the failure is not blank"],
    ["json: only an ok answer has json", () => ModelAnswer.rejected("no luck", 1, ModelTokens.zero()).json(), "ModelAnswer.json: only an ok answer has json"],
  ];

  for (const [name, call, message] of answers) {
    test(name, () => {
      if (message === null) call();
      else expect(call).toThrow(message);
    });
  }
});

describe("ModelCaller.extractJson", () => {
  const texts: [string, string, unknown][] = [
    ["a bare object", '{"a":1}', { a: 1 }],
    ["a bare array", "[1,2]", [1, 2]],
    ["a fenced block with a json tag", '```json\n{"a":1}\n```', { a: 1 }],
    ["a fenced block with no tag", '```\n{"a":1}\n```', { a: 1 }],
    ["json inside prose", 'Here it is: {"a":1} hope it helps', { a: 1 }],
    ["braces in the prose before a fenced block", 'Shape: {a}\n```json\n{"a":1}\n```', { a: 1 }],
    ["an array inside an object", '{"a":[1,2]}', { a: [1, 2] }],
    ["an object inside an array", '[{"a":1}]', [{ a: 1 }]],
    ["plain words give null", "no json here", null],
    ["an empty text gives null", "", null],
    ["an unclosed object gives null", '{"a":1', null],
    ["a key without quotes gives null", "{a:1}", null],
    ["a bare string gives null", '"just a string"', null],
    ["a bare number gives null", "42", null],
  ];

  for (const [name, text, expected] of texts) {
    test(name, () => {
      expect(ModelCaller.extractJson(text)).toEqual(expected);
    });
  }
});

describe("ModelCaller.ask", () => {
  test("the prompt is not blank", async () => {
    await expect(ModelCaller.ask(role(base), "", check))
      .rejects.toThrow("ModelCaller.ask: the prompt is not blank");
  });

  test("timeoutMs 0 is not a positive integer", async () => {
    await expect(ModelCaller.ask(role(base), "Give me the JSON.", check, 0))
      .rejects.toThrow("ModelCaller.ask: timeoutMs is a positive integer");
  });

  test("a fractional timeoutMs is not a positive integer", async () => {
    await expect(ModelCaller.ask(role(base), "Give me the JSON.", check, 1.5))
      .rejects.toThrow("ModelCaller.ask: timeoutMs is a positive integer");
  });

  test("timeoutMs 1, at the edge, is a positive integer", async () => {
    queue.length = 0;
    queue.push({ delayMs: 200 });
    await ModelCaller.ask(role(base), "Give me the JSON.", check, 1);
  });

  test("a call past the timeout is a rejected answer at the first try", async () => {
    queue.length = 0;
    queue.push({ delayMs: 500 });
    const answer = await ModelCaller.ask(role(base), "Give me the JSON.", check, 50);
    expect(answer.isOk()).toBe(false);
    expect(answer.tries()).toBe(1);
  });

  const outcomes: Array<{
    name: string;
    replies: Reply[];
    ok: boolean;
    tries: number;
    output: number;
    failure?: string;
  }> = [
    { name: "JSON right at the first try", replies: [{ text: '{"a":1}' }], ok: true, tries: 1, output: 7 },
    { name: "wrong at the first try and right at the second", replies: [{ text: '{"a":2}' }, { text: '{"a":1}' }], ok: true, tries: 2, output: 14 },
    { name: "wrong twice", replies: [{ text: '{"a":2}' }, { text: '{"a":3}' }], ok: false, tries: 2, output: 14, failure: "the JSON is still wrong after" },
    { name: "no JSON at all twice", replies: [{ text: "I have no JSON for you." }, { text: "Still no JSON." }], ok: false, tries: 2, output: 14, failure: "no JSON object or array in the answer" },
    { name: "JSON in the thinking is not the answer", replies: [{ text: '{"a":1}', thinking: 'maybe {"a":2}' }], ok: true, tries: 1, output: 7 },
    { name: "a provider error at the first try", replies: [{ status: 400 }], ok: false, tries: 1, output: 0, failure: "fake failure" },
    { name: "a provider error at the second try", replies: [{ text: '{"a":2}' }, { status: 400 }], ok: false, tries: 2, output: 7, failure: "fake failure" },
  ];

  for (const o of outcomes) {
    test(`outcome: ${o.name}`, async () => {
      queue.length = 0;
      queue.push(...o.replies);
      const answer = await ModelCaller.ask(role(base), "Give me the JSON.", check);
      expect(answer.isOk()).toBe(o.ok);
      expect(answer.tries()).toBe(o.tries);
      expect(answer.tokens().output()).toBe(o.output);
      if (o.failure !== undefined) expect(answer.failure()).toContain(o.failure);
      if (o.ok) expect(answer.json()).toEqual({ a: 1 });
    });
  }

  test("the system prompt goes as the system role, with reasoning low", async () => {
    queue.length = 0;
    seen.length = 0;
    queue.push({ text: '{"a":1}' });
    await ModelCaller.ask(role(base), "Give me the JSON.", check);
    expect(seen[0].messages[0]).toEqual({ role: "system", content: "You answer in JSON." });
    expect(seen[0].reasoning_effort).toBe("low");
  });

  test("the second try carries the reply and the error", async () => {
    queue.length = 0;
    seen.length = 0;
    queue.push({ text: '{"a":2}' }, { text: '{"a":1}' });
    await ModelCaller.ask(role(base), "Give me the JSON.", check);
    const last = seen[1].messages[seen[1].messages.length - 1];
    expect(seen[1].messages.map((m) => m.role)).toEqual(["system", "user", "assistant", "user"]);
    expect(String(last.content)).toContain("a must be 1");
  });

  test("a role with thinking off sends no reasoning effort", async () => {
    queue.length = 0;
    seen.length = 0;
    queue.push({ text: '{"a":1}' });
    await ModelCaller.ask(role(base, "off", false), "Give me the JSON.", check);
    expect(seen[0].reasoning_effort).toBeUndefined();
  });
});
