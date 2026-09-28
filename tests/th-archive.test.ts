import { describe, it, expect } from "bun:test";

import { runRows } from "../tools/th/src/archive.ts";
import type { FinishedRun } from "../tools/th/src/archive.ts";
import { exchangeId, validateContents, validateExchange, validateSession } from "../tools/tl/src/types.ts";

const T1 = "2026-09-28T10:00:00.000Z";
const T2 = "2026-09-28T10:04:00.000Z";
const RUN_ID = "c3a43d84-bdad-49db-a7f7-352bf088bc1b";

const run = (over: Partial<FinishedRun> = {}): FinishedRun => ({
  id: RUN_ID, member: "carmack-white", task: "audit the renderer",
  status: "done", started_at: T1, finished_at: T2, ...over,
});

// The shape th holds in memory: pi's own message, which pi's reader already knows.
const message = (over: Record<string, unknown> = {}) => ({
  role: "assistant", model: "glm-5.2:cloud", provider: "ollama",
  content: [{ type: "text", text: "done" }],
  usage: { input: 100, output: 20, cacheRead: 5, cacheWrite: 1, cost: { total: 0.004 } },
  ...over,
});

describe("runRows", () => {
  it("makes three rows the archive accepts", () => {
    const rows = runRows(run(), [message()], "kokpit", "/work");
    expect(validateSession(rows.session)).toBeNull();
    expect(validateExchange(rows.exchange)).toBeNull();
    expect(validateContents(rows.contents)).toBeNull();
  });

  it("a run is its own session, named th", () => {
    const rows = runRows(run(), [message()], "kokpit", "/work");
    expect(rows.session).toEqual({ id: RUN_ID, started: T1, harness: "th", host: "kokpit", path: "/work" });
  });

  it("the hat is the actor and the row is a subtask", () => {
    const { exchange } = runRows(run(), [message()], "kokpit", "/work");
    expect(exchange.kind).toBe("subtask");
    expect(exchange.actor).toBe("carmack-white");
  });

  it("the exchange id is derived, so it is not the session id", () => {
    const { exchange } = runRows(run(), [message()], "kokpit", "/work");
    expect(exchange.id).toBe(exchangeId(RUN_ID, "run"));
    expect(exchange.id).not.toBe(exchange.session);
  });

  it("writing the same run twice produces the same id", () => {
    const first = runRows(run(), [message()], "kokpit", "/work").exchange.id;
    const second = runRows(run(), [message()], "kokpit", "/work").exchange.id;
    expect(first).toBe(second);
  });

  it("sums the tokens of every message, in the archive's own names", () => {
    const rows = runRows(run(), [message(), message()], "kokpit", "/work");
    expect(rows.exchange.tokens_in).toBe(200);
    expect(rows.exchange.tokens_out).toBe(40);
    expect(rows.exchange.tokens_cache_read).toBe(10);
    expect(rows.exchange.tokens_cache_write).toBe(2);
  });

  it("carries the model the hat answered with", () => {
    expect(runRows(run(), [message()], "kokpit", "/work").exchange.model).toBe("glm-5.2:cloud");
  });

  it("records the status and the end, because a run can fail or time out", () => {
    const { exchange } = runRows(run({ status: "timeout", finished_at: T2 }), [], "kokpit", "/work");
    expect(exchange.meta).toMatchObject({ status: "timeout", finished_at: T2 });
  });

  it("leaves the cost out when it is zero, instead of writing a zero", () => {
    const free = message({ usage: { input: 1, output: 1, cost: { total: 0 } } });
    expect(runRows(run(), [free], "kokpit", "/work").exchange.meta).not.toHaveProperty("cost_usd");
  });

  it("keeps the cost when the hat spent money", () => {
    expect(runRows(run(), [message()], "kokpit", "/work").exchange.meta).toMatchObject({ cost_usd: 0.004 });
  });

  it("the task is the input and the answer is the output", () => {
    const rows = runRows(run(), [message()], "kokpit", "/work");
    expect(rows.contents.input).toBe("audit the renderer");
    expect(rows.contents.output).toBe("done");
  });

  it("keeps the tool calls a hat made, which is most of what it did", () => {
    const withTool = message({ content: [{ type: "toolCall", name: "bash", arguments: { cmd: "ls" } }] });
    expect(runRows(run(), [withTool], "kokpit", "/work").contents.output).toBe('[tool bash] {"cmd":"ls"}');
  });

  it("a run that produced nothing still yields a row: the cost is real", () => {
    const rows = runRows(run({ status: "error" }), [], "kokpit", "/work");
    expect(rows.contents.output).toBe("");
    expect(validateExchange(rows.exchange)).toBeNull();
  });

  it("has no parent yet: nothing tells th which exchange asked for it", () => {
    expect(runRows(run(), [message()], "kokpit", "/work").exchange).not.toHaveProperty("parent");
  });
});
