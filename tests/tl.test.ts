import { describe, it, expect } from "bun:test";

import {
  dayOf, sumBy, validateContents, validateExchange, validateSession,
} from "../tools/tl/src/types.ts";
import type { Exchange } from "../tools/tl/src/types.ts";
import { parseLines, spans } from "../tools/tl/src/transcript.ts";
import * as claude from "../tools/tl/src/claude.ts";
import * as pi from "../tools/tl/src/pi.ts";
import { exchangeId } from "../tools/tl/src/types.ts";
import { looksLikePi } from "../tools/tl/src/ingest.ts";
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

const prompt = (id: string, timestamp: string, text: string): claude.Line => ({
  type: "user", uuid: id, sessionId: "s1", timestamp, cwd: "/work",
  origin: { kind: "human" }, message: { role: "user", content: text },
});

const answer = (usage: Record<string, number>, model = "claude-opus-5"): claude.Line => ({
  type: "assistant", message: { role: "assistant", model, content: [{ type: "text", text: "ok" }], usage },
});

const toolResult = (): claude.Line => ({
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

  it("accepts the two harnesses that write transcripts", () => {
    expect(validateSession({ id: "s1", started: T1, harness: "pi" })).toBeNull();
    expect(validateSession({ id: "s1", started: T1, harness: "claude" })).toBeNull();
  });

  it("rejects a harness nobody writes: more likely a typo than a new tool", () => {
    expect(validateSession({ id: "s1", started: T1, harness: "codex" as "pi" })).toContain("harness");
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

// ─── Claude transcripts ─────────────────────────────────────────────────────────

describe("claude.isOpener", () => {
  it("a human prompt opens an exchange", () => {
    expect(claude.isOpener(prompt(ID_A, T1, "ciao"))).toBe(true);
  });

  it("a tool result never opens one", () => {
    expect(claude.isOpener(toolResult())).toBe(false);
  });

  it("a user line without origin does not open one: it is command bookkeeping", () => {
    expect(claude.isOpener({ type: "user", uuid: ID_A, message: { content: "/compact" } })).toBe(false);
  });

  it("an assistant line never opens one", () => {
    expect(claude.isOpener(answer({}))).toBe(false);
  });
});

describe("spans", () => {
  const split = (lines: claude.Line[]) => spans(lines, claude.isOpener, claude.isAnswer);

  it("everything after an opener belongs to it", () => {
    const result = split([prompt(ID_A, T1, "a"), answer({}), toolResult()]);
    expect(result.spans).toHaveLength(1);
    expect(result.spans[0].body).toHaveLength(2);
  });

  it("a second opener starts a second span", () => {
    const result = split([prompt(ID_A, T1, "a"), answer({}), prompt(ID_B, T2, "b")]);
    expect(result.spans.map((sp) => sp.opener.uuid)).toEqual([ID_A, ID_B]);
  });

  it("answers before the first opener are counted, not attached", () => {
    const result = split([answer({}), prompt(ID_A, T1, "a")]);
    expect(result.orphans).toBe(1);
    expect(result.spans[0].body).toHaveLength(0);
  });

  it("no opener means no span", () => {
    expect(split([answer({}), toolResult()]).spans).toEqual([]);
  });
});

describe("claude.sumTokens", () => {
  it("adds up every answer in the span", () => {
    const body = [
      answer({ input_tokens: 10, output_tokens: 2, cache_read_input_tokens: 100 }),
      answer({ input_tokens: 5, output_tokens: 3, cache_creation_input_tokens: 7 }),
    ];
    expect(claude.sumTokens(body)).toEqual({
      tokens_in: 15, tokens_out: 5, tokens_cache_read: 100, tokens_cache_write: 7,
    });
  });

  it("ignores a line that is not an answer, even when it carries usage", () => {
    const user: claude.Line = { type: "user", message: { role: "user", content: "x", usage: { input_tokens: 99 } } };
    expect(claude.sumTokens([user, toolResult()]).tokens_in).toBe(0);
  });

  it("a span with no answer costs zero", () => {
    expect(claude.sumTokens([])).toEqual({ tokens_in: 0, tokens_out: 0, tokens_cache_read: 0, tokens_cache_write: 0 });
  });
});

describe("claude.modelOf", () => {
  it("takes the last model that answered", () => {
    expect(claude.modelOf([answer({}, "claude-sonnet-5"), answer({}, "claude-opus-5")])).toBe("claude-opus-5");
  });

  it("ignores a synthetic model", () => {
    expect(claude.modelOf([answer({}, "claude-opus-5"), answer({}, "<synthetic>")])).toBe("claude-opus-5");
  });

  it("returns nothing when nobody answered", () => {
    expect(claude.modelOf([])).toBeUndefined();
  });
});

describe("claude.lineText", () => {
  it("reads a plain string", () => {
    expect(claude.lineText(prompt(ID_A, T1, "ciao"))).toBe("ciao");
  });

  it("keeps a tool call, with its name", () => {
    const line: claude.Line = { type: "assistant", message: { content: [{ type: "tool_use", name: "Bash", input: { cmd: "ls" } }] } };
    expect(claude.lineText(line)).toBe('[tool Bash] {"cmd":"ls"}');
  });

  it("keeps a tool result", () => {
    expect(claude.lineText(toolResult())).toBe("[result] 42");
  });

  it("is empty when there is no content", () => {
    expect(claude.lineText({ type: "system" })).toBe("");
  });
});

describe("parseLines", () => {
  it("skips a line that is not JSON", () => {
    expect(parseLines('{"type":"user"}\nnot json\n\n{"type":"assistant"}')).toHaveLength(2);
  });
});

describe("claude.parse", () => {
  const lines = [
    prompt(ID_A, T1, "prima domanda"),
    answer({ input_tokens: 10, output_tokens: 20 }),
    prompt(ID_B, T2, "seconda domanda"),
    answer({ input_tokens: 5, output_tokens: 6 }),
  ];

  it("reads the session from the first line that carries one", () => {
    expect(claude.parse(lines, { host: "desktop" }).session)
      .toEqual({ id: "s1", started: T1, harness: "claude", host: "desktop", path: "/work" });
  });

  it("makes one exchange per prompt", () => {
    expect(claude.parse(lines).exchanges).toHaveLength(2);
  });

  it("gives every exchange a valid row", () => {
    const rows = claude.parse(lines).exchanges.map((p) => validateExchange(p.exchange));
    expect(rows).toEqual([null, null]);
  });

  it("puts the prompt in input and the answer in output", () => {
    const first = claude.parse(lines).exchanges[0].contents;
    expect(first.input).toBe("prima domanda");
    expect(first.output).toBe("ok");
  });

  it("names the trigger in meta, and nothing else it does not have", () => {
    expect(claude.parse(lines).exchanges[0].exchange.meta).toEqual({ trigger: "human" });
  });

  it("every row a transcript yields is a chat: subtask belongs to a th run", () => {
    expect(claude.parse(lines).exchanges.map((p) => p.exchange.kind)).toEqual(["chat", "chat"]);
  });

  it("the actor is always alfredo: a hat never writes a transcript", () => {
    expect(claude.parse(lines).exchanges[0].exchange.actor).toBe("alfredo");
  });

  it("keeps the transcript's own id, which is already UUID-shaped", () => {
    expect(claude.parse(lines).exchanges[0].exchange.id).toBe(ID_A);
  });

  it("drops a prompt with no id: an exchange without an id cannot be written twice", () => {
    const broken: claude.Line[] = [{ type: "user", timestamp: T1, sessionId: "s1", origin: { kind: "human" }, message: { content: "x" } }];
    expect(claude.parse(broken).exchanges).toEqual([]);
  });
});

// ─── pi transcripts ────────────────────────────────────────────────────────────

const piSession = (): pi.Line => ({ type: "session", id: "01a0e953-81b2-776a-8497-a9dadd86438d", timestamp: T1, cwd: "/work" });
const piPrompt = (id: string, timestamp: string, text: string): pi.Line =>
  ({ type: "message", id, timestamp, message: { role: "user", content: [{ type: "text", text }] } });
const piAnswer = (usage: Record<string, unknown>, model = "glm-5.3-flash:cloud"): pi.Line =>
  ({ type: "message", id: "a1", timestamp: T2, message: { role: "assistant", model, provider: "ollama", content: [{ type: "text", text: "ok" }], usage } });
const piToolResult = (): pi.Line =>
  ({ type: "message", id: "t1", message: { role: "toolResult", content: [{ type: "text", text: "42" }] } });

describe("pi.isOpener", () => {
  it("a user message opens an exchange", () => {
    expect(pi.isOpener(piPrompt("m1", T1, "ciao"))).toBe(true);
  });

  it("a tool result has a role of its own, so it never opens one", () => {
    expect(pi.isOpener(piToolResult())).toBe(false);
  });

  it("an assistant message never opens one", () => {
    expect(pi.isOpener(piAnswer({}))).toBe(false);
  });

  it("a record that is not a message never opens one", () => {
    expect(pi.isOpener(piSession())).toBe(false);
  });
});

describe("pi.lineText", () => {
  it("reads the text parts", () => {
    expect(pi.lineText(piPrompt("m1", T1, "ciao"))).toBe("ciao");
  });

  it("keeps a tool call with its arguments", () => {
    const line: pi.Line = { type: "message", message: { role: "assistant", content: [{ type: "toolCall", name: "bash", arguments: { cmd: "ls" } }] } };
    expect(pi.lineText(line)).toBe('[tool bash] {"cmd":"ls"}');
  });

  it("marks a tool result, which pi writes as plain text", () => {
    expect(pi.lineText(piToolResult())).toBe("[result] 42");
  });

  it("drops the thinking parts", () => {
    const line: pi.Line = { type: "message", message: { role: "assistant", content: [{ type: "thinking", text: "hmm" }] } };
    expect(pi.lineText(line)).toBe("");
  });
});

describe("pi.sumTokens", () => {
  it("reads pi's own key names", () => {
    const body = [piAnswer({ input: 10, output: 2, cacheRead: 100, cacheWrite: 7 })];
    expect(pi.sumTokens(body)).toEqual({ tokens_in: 10, tokens_out: 2, tokens_cache_read: 100, tokens_cache_write: 7 });
  });

  it("counts a compaction: it is a model call the exchange paid for", () => {
    const body: pi.Line[] = [{ type: "compaction", usage: { input: 5, output: 1 } }];
    expect(pi.sumTokens(body).tokens_in).toBe(5);
  });

  it("does not count a tool result", () => {
    expect(pi.sumTokens([piToolResult()]).tokens_in).toBe(0);
  });
});

describe("pi.sumCost", () => {
  it("adds up what pi says the span cost", () => {
    const body = [piAnswer({ input: 1, cost: { total: 0.02 } }), piAnswer({ input: 1, cost: { total: 0.03 } })];
    expect(pi.sumCost(body)).toBeCloseTo(0.05, 6);
  });

  it("is zero when nothing carries a cost", () => {
    expect(pi.sumCost([piAnswer({ input: 1 })])).toBe(0);
  });
});

describe("pi.parse", () => {
  const lines = [piSession(), piPrompt("df9441cf", T1, "ciao"), piAnswer({ input: 10, output: 5, cost: { total: 0.01 } })];

  it("reads the session from the session record", () => {
    expect(pi.parse(lines, { host: "desktop" }).session)
      .toEqual({ id: "01a0e953-81b2-776a-8497-a9dadd86438d", started: T1, harness: "pi", host: "desktop", path: "/work" });
  });

  it("yields nothing without a session record: no row can name its session", () => {
    expect(pi.parse([piPrompt("m1", T1, "ciao")]).exchanges).toEqual([]);
  });

  it("derives a UUID-shaped id from pi's short message id", () => {
    const row = pi.parse(lines).exchanges[0].exchange;
    expect(row.id).toBe(exchangeId("01a0e953-81b2-776a-8497-a9dadd86438d", "df9441cf"));
    expect(validateExchange(row)).toBeNull();
  });

  it("keeps the original id in meta, so a row can be traced back", () => {
    expect(pi.parse(lines).exchanges[0].exchange.meta).toMatchObject({ source_id: "df9441cf" });
  });

  it("does not repeat the harness on every row: the session says it once", () => {
    expect(pi.parse(lines).exchanges[0].exchange.meta).not.toHaveProperty("harness");
  });

  it("records the model, the provider and the cost", () => {
    const row = pi.parse(lines).exchanges[0].exchange;
    expect(row.model).toBe("glm-5.3-flash:cloud");
    expect(row.meta).toMatchObject({ provider: "ollama", cost_usd: 0.01 });
  });

  it("sums the tokens onto the exchange", () => {
    expect(pi.parse(lines).exchanges[0].exchange.tokens_out).toBe(5);
  });
});

describe("exchangeId", () => {
  it("is deterministic", () => {
    expect(exchangeId("s", "m")).toBe(exchangeId("s", "m"));
  });

  it("separates the same message id in two sessions", () => {
    expect(exchangeId("s1", "m")).not.toBe(exchangeId("s2", "m"));
  });

  it("produces the shape the archive validates", () => {
    expect(validateExchange(exchange({ id: exchangeId("s", "m") }))).toBeNull();
  });
});

describe("looksLikePi", () => {
  it("a pi transcript opens with a session record", () => {
    expect(looksLikePi('{"type":"session","id":"x"}\n{"type":"message"}')).toBe(true);
  });

  it("a Claude transcript does not", () => {
    expect(looksLikePi('{"type":"user","uuid":"x"}')).toBe(false);
  });

  it("an empty file is not pi", () => {
    expect(looksLikePi("")).toBe(false);
  });

  it("a first line that is not JSON is not pi", () => {
    expect(looksLikePi("garbage")).toBe(false);
  });
});

// ─── Store ────────────────────────────────────────────────────────────────────

function freshDb() {
  const handle = db.open(":memory:");
  db.upsertSession(handle, { id: "s1", started: T1, harness: "claude", host: "desktop" });
  return handle;
}

describe("db", () => {
  it("writes a session and reads it back", () => {
    expect(db.listSessions(freshDb())).toEqual([{ id: "s1", started: T1, harness: "claude", host: "desktop" }]);
  });

  it("filters sessions by harness", () => {
    const handle = freshDb();
    db.upsertSession(handle, { id: "s2", started: T2, harness: "pi" });
    expect(db.listSessions(handle, { harness: "pi" }).map((x) => x.id)).toEqual(["s2"]);
  });

  it("adds the harness column to an archive that predates it, keeping its rows", () => {
    const handle = db.open(":memory:");
    handle.exec("DROP TABLE sessions");
    handle.exec("CREATE TABLE sessions (id TEXT PRIMARY KEY, started TEXT NOT NULL, host TEXT, path TEXT)");
    handle.exec(`INSERT INTO sessions (id, started) VALUES ('old', '${T1}')`);

    db.migrate(handle);

    expect(db.listSessions(handle)).toEqual([{ id: "old", started: T1 }]);
  });

  it("a session that predates the column reads back without a harness, not with a null", () => {
    const handle = db.open(":memory:");
    handle.exec("DROP TABLE sessions");
    handle.exec("CREATE TABLE sessions (id TEXT PRIMARY KEY, started TEXT NOT NULL, host TEXT, path TEXT)");
    handle.exec(`INSERT INTO sessions (id, started) VALUES ('old', '${T1}')`);
    db.migrate(handle);
    expect(db.listSessions(handle)[0]).not.toHaveProperty("harness");
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
