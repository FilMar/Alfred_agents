import { test, expect } from "bun:test";
import * as db from "../tools/tl/src/db.ts";
import { createApp } from "../tools/tl/src/api.ts";
import { putSessions, putExchanges, putContents, markDistilled } from "../tools/tl/src/client.ts";
import type { Contents, Exchange } from "../tools/tl/src/types.ts";

// The url is set before the import.
const server = Bun.serve({ port: 0, fetch: createApp(db.open(":memory:")).fetch });
process.env.TL_API_URL = `http://localhost:${server.port}`;
const { Turn, SessionRead, PENDING_CAP } = await import("../tools/td/src/session.ts");


type Row = { exchange: Exchange; contents: Contents };

interface RowOptions {
  session?: string;
  timestamp?: string;
  kind?: Exchange["kind"];
  meta?: Exchange["meta"];
  input?: string;
  output?: string;
}

let seq = 0;
const nextId = (): string => `00000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;

function row(options: RowOptions = {}): Row {
  const exchange: Exchange = {
    id: nextId(),
    session: options.session ?? "s-1",
    timestamp: options.timestamp ?? "2026-10-09T10:00:00.000Z",
    kind: options.kind ?? "chat",
    actor: "alfredo",
  };
  if (options.meta !== undefined) exchange.meta = options.meta;
  return {
    exchange,
    contents: { exchange_id: exchange.id, input: options.input ?? "vai", output: options.output ?? "Fatto." },
  };
}

const turnOf = (r: Row) => Turn.of(r.exchange, r.contents);

function capRows(session: string, count: number): Row[] {
  const rows: Row[] = [];
  for (let i = 0; i < count; i += 1) {
    rows.push(row({ session, timestamp: new Date(Date.UTC(2026, 0, 1) + i * 1000).toISOString() }));
  }
  return rows;
}

async function seed(session: string, rows: readonly Row[]): Promise<void> {
  await putSessions([{ id: session, started: "2026-01-01T00:00:00.000Z" }]);
  await putExchanges(rows.map((r) => r.exchange));
  await putContents(rows.map((r) => r.contents));
}


test("Turn.of rejects the contents of another exchange", () => {
  const r = row();
  const stranger = nextId();
  const contents: Contents = { exchange_id: stranger, input: r.contents.input, output: r.contents.output };
  expect(() => Turn.of(r.exchange, contents)).toThrow(
    `Turn.of: the contents belong to the exchange, id=${r.exchange.id}, contents=${stranger}`,
  );
});

test("Turn.of rejects a timestamp that is not ISO-8601 UTC", () => {
  const r = row({ timestamp: "2026-10-09T10:00:00" });
  expect(() => Turn.of(r.exchange, r.contents)).toThrow(
    "Turn.of: the timestamp is ISO-8601 UTC, got=2026-10-09T10:00:00",
  );
});

test("Turn.of: the turn carries the exchange id", () => {
  const r = row({ meta: { trigger: "human" } });
  Turn.of(r.exchange, r.contents);
});

test("Turn.of: the turn carries the contents", () => {
  const r = row({ kind: "subtask", timestamp: "2026-10-09T10:00:07.000Z", output: "The subtask ran." });
  Turn.of(r.exchange, r.contents);
});


const outcomeTable: ReadonlyArray<{
  name: string;
  options: RowOptions;
  expected: "task-notification" | "harness-error" | null;
}> = [
  { name: "a task notification", options: { meta: { trigger: "task-notification" }, output: "Task completed." }, expected: "task-notification" },
  { name: "a task notification wins over a harness error output", options: { meta: { trigger: "task-notification" }, output: "API Error: 500" }, expected: "task-notification" },
  { name: "an output that starts with API Error:", options: { output: "API Error: overloaded" }, expected: "harness-error" },
  { name: "leading whitespace before API Error:", options: { output: "  API Error: overloaded" }, expected: "harness-error" },
  { name: "a human trigger with a harness error output", options: { meta: { trigger: "human" }, output: "API Error: overloaded" }, expected: "harness-error" },
  { name: "a short consent as input: vai", options: { input: "vai" }, expected: null },
  { name: "a short consent as input: procedi", options: { input: "procedi" }, expected: null },
  { name: "a short consent as input: ok", options: { input: "ok" }, expected: null },
  { name: "an empty output", options: { output: "" }, expected: null },
  { name: "an interrupted request", options: { output: "[Request interrupted by user]" }, expected: null },
  { name: "API Error: held but not at the start", options: { output: "I tried and then API Error: 500 appeared." }, expected: null },
  { name: "a human trigger", options: { meta: { trigger: "human" } }, expected: null },
  { name: "a peer trigger", options: { meta: { trigger: "peer" }, output: "A peer note." }, expected: null },
  { name: "no meta at all", options: {}, expected: null },
  { name: "a subtask kind", options: { kind: "subtask", output: "The subtask ran." }, expected: null },
];

for (const { name, options, expected } of outcomeTable) {
  test(`Turn.noise: ${name}`, () => {
    const r = row(options);
    expect(turnOf(r).noise()).toBe(expected);
  });
}


test("SessionRead.of rejects a turn of another session", () => {
  const good = row({ session: "s-1" });
  const foreign = row({ session: "s-2" });
  expect(() => SessionRead.of("s-1", [turnOf(good), turnOf(foreign)])).toThrow(
    "SessionRead.of: every turn belongs to the session, session=s-1",
  );
});

test("SessionRead.of rejects duplicate turn ids", () => {
  const turn = turnOf(row({ session: "s-1" }));
  expect(() => SessionRead.of("s-1", [turn, turn])).toThrow("SessionRead.of: turn ids are unique");
});

test("SessionRead.of: each turn lands in one list", () => {
  const kept1 = row({ session: "s-1", timestamp: "2026-10-09T10:00:00.000Z" });
  const taskNoise = row({ session: "s-1", timestamp: "2026-10-09T10:00:01.000Z", meta: { trigger: "task-notification" }, output: "Task completed." });
  const kept2 = row({ session: "s-1", timestamp: "2026-10-09T10:00:02.000Z" });
  const errorNoise = row({ session: "s-1", timestamp: "2026-10-09T10:00:03.000Z", output: "API Error: overloaded" });
  SessionRead.of("s-1", [kept1, taskNoise, kept2, errorNoise].map(turnOf));
});

test("SessionRead.of: a kept turn is not noise", () => {
  const a = row({ session: "s-1", timestamp: "2026-10-09T10:00:00.000Z" });
  const b = row({ session: "s-1", timestamp: "2026-10-09T10:00:01.000Z", meta: { trigger: "human" } });
  SessionRead.of("s-1", [a, b].map(turnOf));
});

test("SessionRead.of: a noise turn is noise", () => {
  const task = row({ session: "s-1", timestamp: "2026-10-09T10:00:00.000Z", meta: { trigger: "task-notification" }, output: "Task completed." });
  const failure = row({ session: "s-1", timestamp: "2026-10-09T10:00:01.000Z", output: "API Error: overloaded" });
  SessionRead.of("s-1", [task, failure].map(turnOf));
});

test("SessionRead.of: the turns are sorted by time", () => {
  const newest = row({ session: "s-1", timestamp: "2026-10-09T10:00:02.000Z" });
  const oldest = row({ session: "s-1", timestamp: "2026-10-09T10:00:00.000Z" });
  const middle = row({ session: "s-1", timestamp: "2026-10-09T10:00:01.000Z" });
  SessionRead.of("s-1", [newest, oldest, middle].map(turnOf));
});

test("SessionRead.of: an empty list of turns", () => {
  SessionRead.of("s-1", []);
});


test("SessionRead.read rejects a blank session", async () => {
  await expect(SessionRead.read("")).rejects.toThrow("SessionRead.read: the session is not blank");
});

test("SessionRead.read: the result is the session asked", async () => {
  const session = "s-flow";
  const rows = [
    row({ session, timestamp: "2026-10-09T10:00:02.000Z" }),
    row({ session, timestamp: "2026-10-09T10:00:00.000Z" }),
    row({ session, timestamp: "2026-10-09T10:00:01.000Z", meta: { trigger: "task-notification" }, output: "Task completed." }),
    row({ session, timestamp: "2026-10-09T10:00:03.000Z", output: "API Error: overloaded" }),
  ];
  await seed(session, rows);
  await SessionRead.read(session);
});

test("SessionRead.read: a session whose exchanges are all distilled", async () => {
  const session = "s-distilled";
  const rows = [row({ session }), row({ session, timestamp: "2026-10-09T10:00:01.000Z" })];
  await seed(session, rows);
  for (const r of rows) {
    await markDistilled(r.exchange.id, "2026-10-09T11:00:00.000Z");
  }
  await SessionRead.read(session);
});

test("SessionRead.read: a session that does not exist", async () => {
  await SessionRead.read("s-never-written");
});

test("SessionRead.read rejects a session at the pending cap", async () => {
  const session = "s-cap-edge";
  await seed(session, capRows(session, PENDING_CAP));
  await expect(SessionRead.read(session)).rejects.toThrow(
    `SessionRead.#pending: the session holds fewer pending exchanges than the cap, got=${PENDING_CAP}`,
  );
});

test("SessionRead.read: a session one under the pending cap", async () => {
  const session = "s-cap-inside";
  await seed(session, capRows(session, PENDING_CAP - 1));
  await SessionRead.read(session);
});

test("SessionRead.read rejects a session over the pending cap", async () => {
  const session = "s-cap-over";
  await seed(session, capRows(session, PENDING_CAP + 1));
  await expect(SessionRead.read(session)).rejects.toThrow(
    "SessionRead.#pending: the session holds fewer pending exchanges than the cap",
  );
});