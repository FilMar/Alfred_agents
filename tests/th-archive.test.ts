import { describe, it, expect } from "bun:test";

import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { archivePending, runRows, spooledFiles, SPOOL_SUFFIX } from "../tools/th/src/archive.ts";
import type { FinishedRun } from "../tools/th/src/archive.ts";
import { exchangeId, validateContents, validateExchange, validateSession } from "../tools/tl/src/types.ts";

const T1 = "2026-09-28T10:00:00.000Z";
const T2 = "2026-09-28T10:04:00.000Z";
const RUN_ID = "c3a43d84-bdad-49db-a7f7-352bf088bc1b";

const run = (over: Partial<FinishedRun> = {}): FinishedRun => ({
  id: RUN_ID, hat: "black-core", task: "audit the renderer",
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
    expect(exchange.actor).toBe("black-core");
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

  it("the run's own prompt is not part of its output: that is the input", () => {
    const prompt = { role: "user", content: [{ type: "text", text: "audit the renderer" }] };
    const rows = runRows(run(), [prompt, message()], "kokpit", "/work");
    expect(rows.contents.output).toBe("done");
    expect(rows.contents.output).not.toContain("audit the renderer");
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

describe("meta of a finished run", () => {
  it("carries how long it took, in seconds", () => {
    expect(runRows(run(), [], "kokpit", "/work").exchange.meta).toMatchObject({ duration_s: 240 });
  });

  it("says which cap a timeout hit", () => {
    const { exchange } = runRows(run({ status: "timeout", timeout_s: 120 }), [], "kokpit", "/work");
    expect(exchange.meta).toMatchObject({ status: "timeout", timeout_s: 120 });
  });

  it("leaves out a cap nobody set", () => {
    expect(runRows(run(), [], "kokpit", "/work").exchange.meta).not.toHaveProperty("timeout_s");
  });

  it("records the thinking level when one was asked for", () => {
    expect(runRows(run({ thinking: "high" }), [], "kokpit", "/work").exchange.meta).toMatchObject({ thinking: "high" });
  });
});

describe("the spool, which is the only safety net left", () => {
  const spoolDir = () => mkdtempSync(join(tmpdir(), "th-spool-test-"));

  it("finds a spooled run", () => {
    const dir = spoolDir();
    writeFileSync(join(dir, `th-hat-1${SPOOL_SUFFIX}`), "{}");
    expect(spooledFiles(dir)).toHaveLength(1);
  });

  it("ignores the run's other files", () => {
    const dir = spoolDir();
    for (const name of ["th-hat-1.status", "th-hat-1.out", "th-hat-1.log", "th-hat-1.pid"]) {
      writeFileSync(join(dir, name), "running");
    }
    expect(spooledFiles(dir)).toEqual([]);
  });

  it("ignores a file that is not a th run", () => {
    const dir = spoolDir();
    writeFileSync(join(dir, `other-thing${SPOOL_SUFFIX}`), "{}");
    expect(spooledFiles(dir)).toEqual([]);
  });

  it("returns nothing for a directory that is not there", () => {
    expect(spooledFiles(join(tmpdir(), "th-spool-absent-dir"))).toEqual([]);
  });

  it("counts a spooled run it cannot send as failed, and keeps the file", async () => {
    const dir = spoolDir();
    const path = join(dir, `th-hat-1${SPOOL_SUFFIX}`);
    writeFileSync(path, "not json at all");
    const result = await archivePending(dir);
    expect(result).toEqual({ sent: 0, failed: 1 });
    expect(spooledFiles(dir)).toHaveLength(1);
  });
});
