// pendingSessions from tools/td/src/session.ts: the sessions that still hold pending exchanges.

import { test } from "node:test";
import assert from "node:assert/strict";
import { startTlStub } from "./helpers/td_stubs.ts";
import { upsertExchange, upsertSession } from "../tools/tl/src/db.ts";
import { exchangeId } from "../tools/tl/src/types.ts";
import type { Exchange } from "../tools/tl/src/types.ts";

type TlStub = Awaited<ReturnType<typeof startTlStub>>;

type Row = {
  readonly session: string;
  readonly message: string;
  readonly timestamp: string;
  readonly distilled?: string;
};

const BASE = Date.parse("2026-10-01T10:00:00.000Z");

// An ISO-8601 UTC timestamp, `minutes` after the base.
const stamp = (minutes: number): string => new Date(BASE + minutes * 60_000).toISOString();

const DISTILLED = stamp(24 * 60);

function exchange(session: string, message: string, timestamp: string, distilled?: string): Exchange {
  const result: Exchange = { id: exchangeId(session, message), session, timestamp, kind: "chat", actor: "alfredo" };
  return distilled === undefined ? result : { ...result, distilled };
}

// A session row the first time a session shows up, then every exchange in the order given.
async function seed(handle: TlStub["handle"], rows: readonly Row[]): Promise<void> {
  const sessions = new Set<string>();
  for (const row of rows) {
    if (!sessions.has(row.session)) {
      sessions.add(row.session);
      await upsertSession(handle, { id: row.session, started: row.timestamp });
    }
    await upsertExchange(handle, exchange(row.session, row.message, row.timestamp, row.distilled));
  }
}

// A fresh in-memory tl store per test, stopped on the way out.
async function withStore(run: (handle: TlStub["handle"]) => Promise<void>): Promise<void> {
  const tl = await startTlStub();
  try {
    await run(tl.handle);
  } finally {
    await tl.stop();
  }
}

test("pendingSessions: no session twice", async () => {
  await withStore(async (handle) => {
    await seed(handle, [
      { session: "zeta", message: "message-1", timestamp: stamp(0) },
      { session: "alpha", message: "message-1", timestamp: stamp(1) },
      { session: "zeta", message: "message-2", timestamp: stamp(2) },
      { session: "alpha", message: "message-2", timestamp: stamp(3) },
    ]);
    const { pendingSessions } = await import("../tools/td/src/session.ts");
    await pendingSessions();
  });
});

test("pendingSessions: every session id is not blank", async () => {
  await withStore(async (handle) => {
    await seed(handle, [
      { session: "2026-10-01-evening", message: "message-1", timestamp: stamp(0) },
      { session: "2026-10-02-morning", message: "message-1", timestamp: stamp(1) },
    ]);
    const { pendingSessions } = await import("../tools/td/src/session.ts");
    await pendingSessions();
  });
});

test("an empty store has no pending session", async () => {
  await withStore(async () => {
    const { pendingSessions } = await import("../tools/td/src/session.ts");
    assert.deepStrictEqual(await pendingSessions(), []);
  });
});

test("one pending exchange carries its session", async () => {
  await withStore(async (handle) => {
    await seed(handle, [{ session: "solo", message: "message-1", timestamp: stamp(0) }]);
    const { pendingSessions } = await import("../tools/td/src/session.ts");
    assert.deepStrictEqual(await pendingSessions(), ["solo"]);
  });
});

test("the sessions are distinct, in order of first appearance", async () => {
  await withStore(async (handle) => {
    await seed(handle, [
      { session: "zeta", message: "message-1", timestamp: stamp(0) },
      { session: "alpha", message: "message-1", timestamp: stamp(1) },
      { session: "zeta", message: "message-2", timestamp: stamp(2) },
      { session: "mid", message: "message-1", timestamp: stamp(3) },
      { session: "alpha", message: "message-2", timestamp: stamp(4) },
    ]);
    await upsertSession(handle, { id: "hollow", started: stamp(0) });
    const { pendingSessions } = await import("../tools/td/src/session.ts");
    assert.deepStrictEqual(await pendingSessions(), ["zeta", "alpha", "mid"]);
  });
});

test("only pending exchanges carry their session", async () => {
  await withStore(async (handle) => {
    await seed(handle, [
      { session: "closed", message: "message-1", timestamp: stamp(0), distilled: DISTILLED },
      { session: "mixed", message: "message-1", timestamp: stamp(1), distilled: DISTILLED },
      { session: "fresh", message: "message-1", timestamp: stamp(2) },
      { session: "mixed", message: "message-2", timestamp: stamp(3) },
    ]);
    const { pendingSessions } = await import("../tools/td/src/session.ts");
    assert.deepStrictEqual(await pendingSessions(), ["fresh", "mixed"]);
  });
});

test("a session past a thousand pending exchanges is still listed", async () => {
  await withStore(async (handle) => {
    const rows: Row[] = [];
    for (let i = 0; i < 1000; i += 1) {
      rows.push({ session: "bulk", message: `message-${i}`, timestamp: stamp(i) });
    }
    rows.push({ session: "tail", message: "message-1", timestamp: stamp(1000) });
    await seed(handle, rows);
    const { pendingSessions } = await import("../tools/td/src/session.ts");
    assert.deepStrictEqual(await pendingSessions(), ["bulk", "tail"]);
  });
});

test("a broken store makes the call fail", async () => {
  process.env.TL_API_URL = "http://127.0.0.1:9";
  const { pendingSessions } = await import("../tools/td/src/session.ts");
  await assert.rejects(pendingSessions());
});