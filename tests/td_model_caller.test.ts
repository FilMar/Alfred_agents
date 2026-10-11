import { afterAll, describe, expect, test } from "bun:test";
import type { Usage } from "@earendil-works/pi-ai";

import { MAX_TRIES, ModelAnswer, ModelCaller, ModelTokens } from "../tools/td/src/model_caller.ts";
import type { JsonCheck } from "../tools/td/src/model_caller.ts";
import { Role } from "../tools/td/src/config.ts";


type Reply = { text: string; thinking?: string } | { status: number };
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
    seen.push(await req.json());
    const next = queue.shift() ?? { status: 400 };
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
  return Role.fromJson({
    connection: {
      provider: "ollama",
      id: "glm-5.3-flash",
      api: "openai-completions",
      baseUrl,
      reasoning,
      compat: { supportsDeveloperRole: false },
      contextWindow: 128000,
      maxTokens: 8192,
    },
    thinking,
    temperature: 0.1,
    system: "You answer in JSON.",
  });
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
  test("zero: every count is zero", () => {
    ModelTokens.zero();
  });

  test("of: the tokens carry the usage", () => {
    ModelTokens.of(usage);
  });

  test("of: 0, at the edge, is a count", () => {
    ModelTokens.of(usageOf(0, 0, 0, 0));
  });

  test("of: 1, just inside the edge, is a count", () => {
    ModelTokens.of(usageOf(1, 1, 1, 1));
  });

  test("of: input below 0 is not a count", () => {
    expect(() => ModelTokens.of({ ...usage, input: -1 })).toThrow("ModelTokens.of: input is a count");
  });

  test("of: output below 0 is not a count", () => {
    expect(() => ModelTokens.of({ ...usage, output: -1 })).toThrow("ModelTokens.of: output is a count");
  });

  test("of: cacheRead below 0 is not a count", () => {
    expect(() => ModelTokens.of({ ...usage, cacheRead: -1 })).toThrow("ModelTokens.of: cacheRead is a count");
  });

  test("of: cacheWrite below 0 is not a count", () => {
    expect(() => ModelTokens.of({ ...usage, cacheWrite: -1 })).toThrow("ModelTokens.of: cacheWrite is a count");
  });

  test("of: a fractional input is not a count", () => {
    expect(() => ModelTokens.of({ ...usage, input: 0.5 })).toThrow("ModelTokens.of: input is a count");
  });

  test("of: an infinite input is not a count", () => {
    expect(() => ModelTokens.of({ ...usage, input: Infinity })).toThrow("ModelTokens.of: input is a count");
  });

  test("of: NaN is not a count", () => {
    expect(() => ModelTokens.of({ ...usage, input: NaN })).toThrow("ModelTokens.of: input is a count");
  });

  test("plus: each count is the sum of both", () => {
    const a = ModelTokens.of(usage);
    const b = ModelTokens.of(usageOf(5, 3, 2, 1));
    a.plus(b);
  });
});

describe("ModelAnswer", () => {
  test("accepted: the answer is ok on the first try", () => {
    ModelAnswer.accepted({ a: 1 }, 1, ModelTokens.zero());
  });

  test("accepted: the answer is ok on the last try", () => {
    ModelAnswer.accepted({ a: 1 }, MAX_TRIES, ModelTokens.zero());
  });

  test("accepted: try 0 is not a try", () => {
    expect(() => ModelAnswer.accepted({ a: 1 }, 0, ModelTokens.zero()))
      .toThrow("ModelAnswer.accepted: tries is from 1 to MAX_TRIES");
  });

  test("accepted: one try past MAX_TRIES is not a try", () => {
    expect(() => ModelAnswer.accepted({ a: 1 }, MAX_TRIES + 1, ModelTokens.zero()))
      .toThrow("ModelAnswer.accepted: tries is from 1 to MAX_TRIES");
  });

  test("accepted: a fractional try is not a try", () => {
    expect(() => ModelAnswer.accepted({ a: 1 }, 1.5, ModelTokens.zero()))
      .toThrow("ModelAnswer.accepted: tries is from 1 to MAX_TRIES");
  });

  test("accepted: the json is given", () => {
    expect(() => ModelAnswer.accepted(undefined, 1, ModelTokens.zero()))
      .toThrow("ModelAnswer.accepted: the json is given");
  });

  test("rejected: the answer is not ok on the first try", () => {
    ModelAnswer.rejected("no luck", 1, ModelTokens.zero());
  });

  test("rejected: the answer is not ok on the last try", () => {
    ModelAnswer.rejected("no luck", MAX_TRIES, ModelTokens.zero());
  });

  test("rejected: try 0 is not a try", () => {
    expect(() => ModelAnswer.rejected("no luck", 0, ModelTokens.zero()))
      .toThrow("ModelAnswer.rejected: tries is from 1 to MAX_TRIES");
  });

  test("rejected: one try past MAX_TRIES is not a try", () => {
    expect(() => ModelAnswer.rejected("no luck", MAX_TRIES + 1, ModelTokens.zero()))
      .toThrow("ModelAnswer.rejected: tries is from 1 to MAX_TRIES");
  });

  test("rejected: a fractional try is not a try", () => {
    expect(() => ModelAnswer.rejected("no luck", 1.5, ModelTokens.zero()))
      .toThrow("ModelAnswer.rejected: tries is from 1 to MAX_TRIES");
  });

  test("rejected: the failure is not blank", () => {
    expect(() => ModelAnswer.rejected("", 1, ModelTokens.zero()))
      .toThrow("ModelAnswer.rejected: the failure is not blank");
  });

  test("json: only an ok answer has json", () => {
    const answer = ModelAnswer.rejected("no luck", 1, ModelTokens.zero());
    expect(() => answer.json()).toThrow("ModelAnswer.json: only an ok answer has json");
  });
});

describe("ModelCaller.extractJson", () => {
  test("the result is an object, an array or null", () => {
    ModelCaller.extractJson('{"a":1}');
  });

  test("a bare object", () => {
    expect(ModelCaller.extractJson('{"a":1}')).toEqual({ a: 1 });
  });

  test("a bare array", () => {
    expect(ModelCaller.extractJson("[1,2]")).toEqual([1, 2]);
  });

  test("a fenced block with a json tag", () => {
    expect(ModelCaller.extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  test("a fenced block with no tag", () => {
    expect(ModelCaller.extractJson('```\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  test("json inside prose", () => {
    expect(ModelCaller.extractJson('Here it is: {"a":1} hope it helps')).toEqual({ a: 1 });
  });

  test("braces in the prose before a fenced block", () => {
    expect(ModelCaller.extractJson('Shape: {a}\n```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  test("an array inside an object", () => {
    expect(ModelCaller.extractJson('{"a":[1,2]}')).toEqual({ a: [1, 2] });
  });

  test("an object inside an array", () => {
    expect(ModelCaller.extractJson('[{"a":1}]')).toEqual([{ a: 1 }]);
  });

  test("plain words give null", () => {
    expect(ModelCaller.extractJson("no json here")).toBeNull();
  });

  test("an empty text gives null", () => {
    expect(ModelCaller.extractJson("")).toBeNull();
  });

  test("an unclosed object gives null", () => {
    expect(ModelCaller.extractJson('{"a":1')).toBeNull();
  });

  test("a key without quotes gives null", () => {
    expect(ModelCaller.extractJson("{a:1}")).toBeNull();
  });

  test("a bare string gives null", () => {
    expect(ModelCaller.extractJson('"just a string"')).toBeNull();
  });

  test("a bare number gives null", () => {
    expect(ModelCaller.extractJson("42")).toBeNull();
  });
});

describe("ModelCaller.ask", () => {
  test("the prompt is not blank", async () => {
    await expect(ModelCaller.ask(role(base), "", check))
      .rejects.toThrow("ModelCaller.ask: the prompt is not blank");
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
