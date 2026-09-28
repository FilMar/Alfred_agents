// A finished run becomes one subtask row in the archive. This is the only moment
// the output text exists anywhere: the run's files live in /tmp and are wiped.
//
// It must never fail a run. Every error is swallowed, and the deadline is short:
// an unreachable archive delays the end of a run by two seconds, not by ten.

import { hostname } from "node:os";

import { HttpClient } from "../../tb/src/infra.js";
import { API_URL } from "../../tl/src/client.js";
import * as pi from "../../tl/src/pi.js";
import { exchangeId } from "../../tl/src/types.js";
import type { Contents, Exchange, Session } from "../../tl/src/types.js";

const DEADLINE_MS = 2_000;

const client = new HttpClient({ baseUrl: API_URL, timeout: DEADLINE_MS });

export interface RunRows {
  session: Session;
  exchange: Exchange;
  contents: Contents;
}

export interface FinishedRun {
  id: string;
  member: string;
  task: string;
  status: string;
  started_at: string;
  finished_at?: string | null;
}

/**
 * The three rows a finished run becomes. Pure, so the shape is testable without a
 * live archive. A run is its own session: it has a start, an end, a directory and
 * a machine, which is everything `sessions` holds. The hat is the actor.
 */
export function runRows(run: FinishedRun, messages: unknown[], host: string, cwd: string): RunRows {
  const lines = messages.map((message) => ({ type: "message", message }) as pi.Line);
  const cost = pi.sumCost(lines);
  const model = pi.modelOf(lines);

  return {
    session: { id: run.id, started: run.started_at, harness: "th", host, path: cwd },
    exchange: {
      id: exchangeId(run.id, "run"),
      session: run.id,
      timestamp: run.started_at,
      kind: "subtask",
      actor: run.member,
      ...(model !== undefined && { model }),
      ...pi.sumTokens(lines),
      meta: {
        status: run.status,
        ...(run.finished_at && { finished_at: run.finished_at }),
        ...(cost > 0 && { cost_usd: cost }),
      },
    },
    contents: {
      exchange_id: exchangeId(run.id, "run"),
      input: run.task,
      output: lines.map(pi.lineText).filter((t) => t.length > 0).join("\n\n"),
    },
  };
}

/**
 * Files the run in the archive. Never throws, and never delays a run for long.
 * The run row comes from the caller, so this module needs no database at all.
 */
export async function archiveRun(run: FinishedRun, messages: unknown[]): Promise<void> {
  try {
    const rows = runRows(run, messages, hostname(), process.cwd());
    await client.request("POST", "/sessions", rows.session);
    await client.request("POST", "/exchanges", rows.exchange);
    await client.request("POST", "/contents", rows.contents);
  } catch (err) {
    process.stderr.write(`warn: run not archived in tl: ${err instanceof Error ? err.message : String(err)}\n`);
  }
}
