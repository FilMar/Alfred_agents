import { describe, it, expect } from "bun:test";

import {
  dayOf, sumBy, validateContents, validateExchange, validateSession,
} from "../tools/tl/src/types.ts";
import type { Exchange } from "../tools/tl/src/types.ts";
import {
  isOpener, lineText, modelOf, parentOf, parseLines, parseTranscript, spans, sumTokens,
} from "../tools/tl/src/transcript.ts";
import type { Line } from "../tools/tl/src/transcript.ts";
import * as db from "../tools/tl/src/db.ts";
import { createApp } from "../tools/tl/src/api.ts";

const ID_A = "11111111-1111-1111-1111-111111111111";
const ID_B = "22222222-2222-2222-2222-222222222222";
const ID_C = "33333333-3333-3333-3333-333333333333";
const T1 = "2026-09-01T10:00:00.000Z";
const T2 = "2026-09-01T11:00:00.000Z";

const exchange = (over: Partial<Exchange> = {}): Exchange => ({
  id: ID_A, session: "s1", timestamp: T1, kind: "chat", actor: "alfredo", ...over,
});

const prompt = (id: string, timestamp: string, text: string): Line => ({
  type: "user", uuid: id, sessionId: "s1", timestamp, cwd: "/work",
  origin: { kind: "human" }, message: { role: "user", content: text },
});

const answer = (usage: Record<string, number>, model = "claude-opus-5"): Line => ({
  type: "assistant", message: { role: "assistant", model, content: [{ type: "text", text: "ok" }], usage },
});

const toolResult = (): Line => ({
  type: "user", uuid: "x", message: { role: "user", content: [{ type: "tool_result", content: "42" }] },
});

// ─── Validation ───────────────────────────────────────────────────────────────

describe("validateExchange", () => {
  it("accepts a minimal row", () => {
    expect(validateExchange(exchange())).toBeNull();
  });

  it("rejects an id that is not UUID-shaped", () => {
    expect(validateExchange(exchange({ id: "abc" }))).toContain("id");
  });

  it("rejects a timestamp without the Z", () => {
    expect(validateExchange(exchange({ timestamp: "2026-09-01T10:00:00" }))).toContain("timestamp");
  });

  it("rejects a timestamp at the wrong width", () => {
    expect(validateExchange(exchange({ timestamp: "2026-09-01T10:00:00Z" }))).toContain("timestamp");
  });

  it("rejects a kind outside the two", () => {
    expect(validateExchange(exchange({ kind: "cron" as "chat" }))).toContain("kind");
  });

  it("rejects a missing actor", () => {
    expect(validateExchange(exchange({ actor: "" }))).toContain("actor");
  });

  it("rejects a negative token count", () => {
    expect(validateExchange(exchange({ tokens_in: -1 }))).toContain("tokens_in");
  });

  it("rejects a parent that is not an id", () => {
    expect(validateExchange(exchange({ parent: "nope" }))).toContain("parent");
  });
});

describe("validateSession and validateContents", () => {
  it("accepts a minimal session", () => {
    expect(validateSession({ id: "s1", started: T1 })).toBeNull();
  });

  it("rejects a session without a timestamp shape", () => {
    expect(validateSession({ id: "s1", started: "yesterday" })).toContain("started");
  });

  it("accepts an empty body: a prompt with no answer is still a row", () => {
    expect(validateContents({ exchange_id: ID_A, input: "", output: "" })).toBeNull();
  });

  it("rejects a body whose exchange id is not an id", () => {
    expect(validateContents({ exchange_id: "zz", input: "a", output: "b" })).toContain("exchange_id");
  });
});

// ─── Cost ─────────────────────────────────────────────────────────────────────

describe("sumBy", () => {
  const rows = [
    exchange({ id: ID_A, timestamp: T1, tokens_in: 10, tokens_out: 1 }),
    exchange({ id: ID_B, timestamp: T2, tokens_in: 20, tokens_out: 2 }),
    exchange({ id: ID_C, timestamp: "2026-09-02T09:00:00.000Z", tokens_in: 5 }),
  ];

  it("sums the counters of one group", () => {
    const byDay = sumBy(rows, dayOf);
    expect(byDay[0]).toEqual({
      key: "2026-09-01", exchanges: 2, tokens_in: 30, tokens_out: 3,
      tokens_cache_read: 0, tokens_cache_write: 0,
    });
  });

  it("orders the groups by key", () => {
    expect(sumBy(rows, dayOf).map((r) => r.key)).toEqual(["2026-09-01", "2026-09-02"]);
  });

  it("counts every exchange exactly once", () => {
    expect(sumBy(rows, dayOf).reduce((n, r) => n + r.exchanges, 0)).toBe(rows.length);
  });

  it("treats a missing counter as zero, not as a hole", () => {
    expect(sumBy(rows, dayOf)[1].tokens_out).toBe(0);
  });

  it("groups an unknown model under one key", () => {
    expect(sumBy(rows, (e) => e.model ?? "unknown")[0].key).toBe("unknown");
  });

  it("returns nothing for no exchanges", () => {
    expect(sumBy([], dayOf)).toEqual([]);
  });
});

// ─── Transcript ───────────────────────────────────────────────────────────────

describe("isOpener", () => {
  it("a human prompt opens an exchange", () => {
    expect(isOpener(prompt(ID_A, T1, "ciao"), false)).toBe(true);
  });

  it("a tool result never opens one", () => {
    expect(isOpener(toolResult(), false)).toBe(false);
  });

  it("a user line without origin does not open one: it is command bookkeeping", () => {
    expect(isOpener({ type: "user", uuid: ID_A, message: { content: "/compact" } }, false)).toBe(false);
  });

  it("an assistant line never opens one", () => {
    expect(isOpener(answer({}), false)).toBe(false);
  });

  it("in a sidechain the line with no parent opens it", () => {
    expect(isOpener({ type: "user", uuid: ID_A, parentUuid: null }, true)).toBe(true);
  });

  it("in a sidechain a line with a parent does not", () => {
    expect(isOpener({ type: "user", uuid: ID_B, parentUuid: ID_A }, true)).toBe(false);
  });
});

describe("spans", () => {
  it("everything after an opener belongs to it", () => {
    const result = spans([prompt(ID_A, T1, "a"), answer({}), toolResult()], false);
    expect(result.spans).toHaveLength(1);
    expect(result.spans[0].body).toHaveLength(2);
  });

  it("a second opener starts a second span", () => {
    const result = spans([prompt(ID_A, T1, "a"), answer({}), prompt(ID_B, T2, "b")], false);
    expect(result.spans.map((s) => s.opener.uuid)).toEqual([ID_A, ID_B]);
  });

  it("answers before the first opener are counted, not attached", () => {
    const result = spans([answer({}), prompt(ID_A, T1, "a")], false);
    expect(result.orphans).toBe(1);
    expect(result.spans[0].body).toHaveLength(0);
  });

  it("no opener means no span", () => {
    expect(spans([answer({}), toolResult()], false).spans).toEqual([]);
  });
});

describe("sumTokens", () => {
  it("adds up every answer in the span", () => {
    const body = [
      answer({ input_tokens: 10, output_tokens: 2, cache_read_input_tokens: 100 }),
      answer({ input_tokens: 5, output_tokens: 3, cache_creation_input_tokens: 7 }),
    ];
    expect(sumTokens(body)).toEqual({
      tokens_in: 15, tokens_out: 5, tokens_cache_read: 100, tokens_cache_write: 7,
    });
  });

  it("ignores a line that is not an answer, even when it carries usage", () => {
    const user: Line = { type: "user", message: { role: "user", content: "x", usage: { input_tokens: 99 } } };
    expect(sumTokens([user, toolResult()]).tokens_in).toBe(0);
  });

  it("a span with no answer costs zero", () => {
    expect(sumTokens([])).toEqual({ tokens_in: 0, tokens_out: 0, tokens_cache_read: 0, tokens_cache_write: 0 });
  });
});

describe("modelOf", () => {
  it("takes the last model that answered", () => {
    expect(modelOf([answer({}, "claude-sonnet-5"), answer({}, "claude-opus-5")])).toBe("claude-opus-5");
  });

  it("ignores a synthetic model", () => {
    expect(modelOf([answer({}, "claude-opus-5"), answer({}, "<synthetic>")])).toBe("claude-opus-5");
  });

  it("returns nothing when nobody answered", () => {
    expect(modelOf([])).toBeUndefined();
  });
});

describe("lineText", () => {
  it("reads a plain string", () => {
    expect(lineText(prompt(ID_A, T1, "ciao"))).toBe("ciao");
  });

  it("keeps a tool call, with its name", () => {
    const line: Line = { type: "assistant", message: { content: [{ type: "tool_use", name: "Bash", input: { cmd: "ls" } }] } };
    expect(lineText(line)).toBe('[tool Bash] {"cmd":"ls"}');
  });

  it("keeps a tool result", () => {
    expect(lineText(toolResult())).toBe("[result] 42");
  });

  it("is empty when there is no content", () => {
    expect(lineText({ type: "system" })).toBe("");
  });
});

describe("parentOf", () => {
  const candidates = [exchange({ id: ID_A, timestamp: T1 }), exchange({ id: ID_B, timestamp: T2 })];

  it("picks the exchange that was running", () => {
    expect(parentOf("2026-09-01T10:30:00.000Z", candidates)).toBe(ID_A);
  });

  it("picks the latest one when several came before", () => {
    expect(parentOf("2026-09-01T12:00:00.000Z", candidates)).toBe(ID_B);
  });

  it("returns nothing when nothing came before", () => {
    expect(parentOf("2026-08-01T00:00:00.000Z", candidates)).toBeUndefined();
  });
});

describe("parseLines", () => {
  it("skips a line that is not JSON", () => {
    expect(parseLines('{"type":"user"}\nnot json\n\n{"type":"assistant"}')).toHaveLength(2);
  });
});

describe("parseTranscript", () => {
  const lines = [
    prompt(ID_A, T1, "prima domanda"),
    answer({ input_tokens: 10, output_tokens: 20 }),
    prompt(ID_B, T2, "seconda domanda"),
    answer({ input_tokens: 5, output_tokens: 6 }),
  ];

  it("reads the session from the first line that carries one", () => {
    expect(parseTranscript(lines, false, { host: "desktop" }).session)
      .toEqual({ id: "s1", started: T1, host: "desktop", path: "/work" });
  });

  it("makes one exchange per prompt", () => {
    expect(parseTranscript(lines, false).exchanges).toHaveLength(2);
  });

  it("gives every exchange a valid row", () => {
    const rows = parseTranscript(lines, false).exchanges.map((p) => validateExchange(p.exchange));
    expect(rows).toEqual([null, null]);
  });

  it("puts the prompt in input and the answer in output", () => {
    const first = parseTranscript(lines, false).exchanges[0].contents;
    expect(first.input).toBe("prima domanda");
    expect(first.output).toBe("ok");
  });

  it("carries the trigger into meta", () => {
    expect(parseTranscript(lines, false).exchanges[0].exchange.meta).toEqual({ trigger: "human" });
  });

  it("a main transcript produces chat exchanges", () => {
    expect(parseTranscript(lines, false).exchanges[0].exchange.kind).toBe("chat");
  });

  it("a sidechain produces a subtask attached to the exchange that asked", () => {
    const side: Line[] = [
      { type: "user", uuid: ID_C, parentUuid: null, sessionId: "s1", timestamp: T2, agentId: "a99", message: { content: "vai" } },
      answer({ input_tokens: 1, output_tokens: 1 }),
    ];
    const parents = parseTranscript(lines, false).exchanges.map((p) => p.exchange);
    const parsed = parseTranscript(side, true, { parents }).exchanges[0].exchange;
    expect(parsed.kind).toBe("subtask");
    expect(parsed.actor).toBe("agent-a99");
    expect(parsed.parent).toBe(ID_B);
  });

  it("drops a prompt with no id: an exchange without an id cannot be written twice", () => {
    const broken: Line[] = [{ type: "user", timestamp: T1, sessionId: "s1", origin: { kind: "human" }, message: { content: "x" } }];
    expect(parseTranscript(broken, false).exchanges).toEqual([]);
  });
});

// ─── Store ────────────────────────────────────────────────────────────────────

function freshDb() {
  const handle = db.open(":memory:");
  db.upsertSession(handle, { id: "s1", started: T1, host: "desktop" });
  return handle;
}

describe("db", () => {
  it("writes a session and reads it back", () => {
    expect(db.listSessions(freshDb())).toEqual([{ id: "s1", started: T1, host: "desktop" }]);
  });

  it("writing the same exchange twice leaves one row", () => {
    const handle = freshDb();
    db.upsertExchange(handle, exchange());
    db.upsertExchange(handle, exchange());
    expect(db.listExchanges(handle)).toHaveLength(1);
  });

  it("an absent field comes back absent, not null", () => {
    const handle = freshDb();
    db.upsertExchange(handle, exchange());
    expect(db.listExchanges(handle)[0]).toEqual(exchange());
  });

  it("keeps meta as an object", () => {
    const handle = freshDb();
    db.upsertExchange(handle, exchange({ meta: { trigger: "human" } }));
    expect(db.listExchanges(handle)[0].meta).toEqual({ trigger: "human" });
  });

  it("filters the distiller queue", () => {
    const handle = freshDb();
    db.upsertExchange(handle, exchange({ id: ID_A }));
    db.upsertExchange(handle, exchange({ id: ID_B, distilled: T2 }));
    expect(db.listExchanges(handle, { distilled: false }).map((e) => e.id)).toEqual([ID_A]);
  });

  it("filters by time", () => {
    const handle = freshDb();
    db.upsertExchange(handle, exchange({ id: ID_A, timestamp: T1 }));
    db.upsertExchange(handle, exchange({ id: ID_B, timestamp: T2 }));
    expect(db.listExchanges(handle, { since: T2 }).map((e) => e.id)).toEqual([ID_B]);
  });

  it("orders newest first", () => {
    const handle = freshDb();
    db.upsertExchange(handle, exchange({ id: ID_A, timestamp: T1 }));
    db.upsertExchange(handle, exchange({ id: ID_B, timestamp: T2 }));
    expect(db.listExchanges(handle).map((e) => e.id)).toEqual([ID_B, ID_A]);
  });

  it("marks one exchange distilled and says so", () => {
    const handle = freshDb();
    db.upsertExchange(handle, exchange());
    expect(db.setDistilled(handle, ID_A, T2)).toBe(true);
    expect(db.getExchange(handle, ID_A)?.distilled).toBe(T2);
  });

  it("says nothing was marked when the exchange is not there", () => {
    expect(db.setDistilled(freshDb(), ID_A, T2)).toBe(false);
  });

  it("re-writing an exchange does not clear distilled", () => {
    const handle = freshDb();
    db.upsertExchange(handle, exchange());
    db.setDistilled(handle, ID_A, T2);
    db.upsertExchange(handle, exchange());
    expect(db.getExchange(handle, ID_A)?.distilled).toBe(T2);
  });

  it("refuses a body whose exchange does not exist", () => {
    expect(() => db.upsertContents(freshDb(), { exchange_id: ID_A, input: "a", output: "b" })).toThrow();
  });

  it("rejects a row the validator refuses", () => {
    expect(() => db.upsertExchange(freshDb(), exchange({ timestamp: "nope" }))).toThrow("upsertExchange");
  });
});

// ─── API ──────────────────────────────────────────────────────────────────────

describe("api", () => {
  const post = (app: ReturnType<typeof createApp>, path: string, body: unknown) =>
    app.request(path, { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });

  it("writes an array of exchanges in one request", async () => {
    const app = createApp(freshDb());
    const res = await post(app, "/exchanges", [exchange({ id: ID_A }), exchange({ id: ID_B })]);
    expect(await res.json()).toEqual({ written: 2 });
  });

  it("refuses the whole batch when one row is invalid, and writes nothing", async () => {
    const handle = freshDb();
    const app = createApp(handle);
    const res = await post(app, "/exchanges", [exchange({ id: ID_A }), exchange({ id: "bad" })]);
    expect(res.status).toBe(400);
    expect(db.listExchanges(handle)).toEqual([]);
  });

  it("answers 400 on a body that is not JSON", async () => {
    const app = createApp(freshDb());
    const res = await app.request("/exchanges", { method: "POST", body: "{", headers: { "Content-Type": "application/json" } });
    expect(res.status).toBe(400);
  });

  it("answers 404 for an exchange that is not there", async () => {
    expect((await createApp(freshDb()).request(`/exchanges/${ID_A}`)).status).toBe(404);
  });

  it("filters exchanges by kind", async () => {
    const app = createApp(freshDb());
    await post(app, "/exchanges", [exchange({ id: ID_A }), exchange({ id: ID_B, kind: "subtask", parent: ID_A })]);
    const res = await app.request("/exchanges?kind=subtask");
    expect((await res.json() as Exchange[]).map((e) => e.id)).toEqual([ID_B]);
  });

  it("refuses a kind that is not one of the two", async () => {
    expect((await createApp(freshDb()).request("/exchanges?kind=cron")).status).toBe(400);
  });

  it("sets distilled through PATCH", async () => {
    const app = createApp(freshDb());
    await post(app, "/exchanges", exchange());
    const res = await app.request(`/exchanges/${ID_A}`, {
      method: "PATCH", body: JSON.stringify({ distilled: T2 }), headers: { "Content-Type": "application/json" },
    });
    expect(await res.json()).toEqual({ id: ID_A, distilled: T2 });
  });

  it("refuses a distilled that is not a timestamp", async () => {
    const app = createApp(freshDb());
    await post(app, "/exchanges", exchange());
    const res = await app.request(`/exchanges/${ID_A}`, {
      method: "PATCH", body: JSON.stringify({ distilled: "today" }), headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(400);
  });

  it("counts what it holds", async () => {
    const app = createApp(freshDb());
    await post(app, "/exchanges", exchange());
    expect(await (await app.request("/health")).json()).toEqual({ ok: true, sessions: 1, exchanges: 1, contents: 0 });
  });
});
