// A finished run becomes one subtask row in the archive. This is the only moment
// the output text exists anywhere: the run's files live in /tmp and are wiped.
//
// The archive is the only home a run's history has — th keeps no database. So a
// failed write is not swallowed and forgotten: the rows are spooled in a state
// directory that survives a reboot, and every `th run` and `th wait` sends what is
// waiting. A run still never fails because of this: the deadline is two seconds.

import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir, hostname } from "node:os";
import { join } from "node:path";

import { HttpClient } from "../../tb/src/infra.js";
import { assert } from "../../contract/contract.js";
import { API_URL } from "../../tl/src/client.js";
import * as pi from "../../tl/src/pi.js";
import { joinBody, joinTools } from "../../tl/src/transcript.js";
import { exchangeId } from "../../tl/src/types.js";
import type { Contents, Exchange, Session } from "../../tl/src/types.js";

const DEADLINE_MS = 2_000;

export const SPOOL_SUFFIX = ".unarchived";

export function spoolDir(): string {
  const state = process.env.XDG_STATE_HOME ?? join(homedir(), ".local", "state");
  const dir = join(state, "th", "spool");
  mkdirSync(dir, { recursive: true });
  assert(existsSync(dir), "spoolDir: the directory exists");
  return dir;
}

const client = new HttpClient({ baseUrl: API_URL, timeout: DEADLINE_MS });

export interface RunRows {
  session: Session;
  exchange: Exchange;
  contents: Contents;
}

export interface FinishedRun {
  id: string;
  /** The way of thinking the run wore */
  hat: string;
  task: string;
  /** done | error | timeout */
  status: string;
  started_at: string;
  finished_at: string;
  /** The cap that was set, so a timeout status says what it hit */
  timeout_s?: number;
  /** Extended thinking level, when one was asked for */
  thinking?: string;
  /** The skill the run was forced to follow, when there was one */
  skill?: string;
}

/**
 * The three rows a finished run becomes. Pure, so the shape is testable without a
 * live archive. A run is its own session: it has a start, an end, a directory and
 * a machine, which is everything `sessions` holds. The hat is the actor.
 */
export function runRows(run: FinishedRun, messages: unknown[], host: string, cwd: string): RunRows {
  // The task is already `input`: a run's own prompt is not part of what it produced.
  const lines = messages
    .map((message) => ({ type: "message", message }) as pi.Line)
    .filter((line) => !pi.isOpener(line));
  const cost = pi.sumCost(lines);
  const model = pi.modelOf(lines);
  const id = exchangeId(run.id, "run");

  return {
    // pi runs the loop; th only configures it. `kind: subtask` is what marks a delegation.
    session: { id: run.id, started: run.started_at, harness: "pi", host, path: cwd },
    exchange: {
      id,
      session: run.id,
      timestamp: run.started_at,
      kind: "subtask",
      actor: run.hat,
      ...(model !== undefined && { model }),
      ...pi.sumTokens(lines),
      meta: {
        status: run.status,
        finished_at: run.finished_at,
        duration_s: durationSeconds(run.started_at, run.finished_at),
        ...(run.timeout_s !== undefined && { timeout_s: run.timeout_s }),
        ...(run.thinking !== undefined && { thinking: run.thinking }),
        ...(run.skill !== undefined && { skill: run.skill }),
        ...(cost > 0 && { cost_usd: cost }),
      },
    },
    contents: { exchange_id: id, input: run.task, output: joinBody(lines.map(pi.lineText)), ...toolsField(lines) },
  };
}

function toolsField(lines: pi.Line[]): { tools?: string } {
  const tools = joinTools(lines.map(pi.lineTools));
  return tools === undefined ? {} : { tools };
}

function durationSeconds(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 1000);
}

/**
 * Files the run in the archive. Never throws. When the archive cannot be reached
 * the rows go to `spoolPath` instead, because nothing else keeps this history.
 */
export async function archiveRun(run: FinishedRun, messages: unknown[], spoolPath?: string): Promise<void> {
  let rows: RunRows;
  try {
    rows = runRows(run, messages, hostname(), process.cwd());
  } catch (err) {
    process.stderr.write(`warn: run rows not built: ${message(err)}\n`);
    return;
  }

  try {
    await send(rows);
  } catch (err) {
    process.stderr.write(`warn: archive unreachable, run spooled: ${message(err)}\n`);
    spool(rows, spoolPath);
  }
}

async function send(rows: RunRows): Promise<void> {
  await client.request("POST", "/sessions", rows.session);
  await client.request("POST", "/exchanges", rows.exchange);
  await client.request("POST", "/contents", rows.contents);
}

function spool(rows: RunRows, spoolPath?: string): void {
  if (spoolPath === undefined) return;
  try {
    writeFileSync(spoolPath, JSON.stringify(rows));
  } catch (err) {
    process.stderr.write(`warn: run not spooled either, history lost: ${message(err)}\n`);
  }
}

export interface PendingResult {
  sent: number;
  failed: number;
}

/** Sends every spooled run the archive never got. Safe to run twice: rows upsert. */
export async function archivePending(dir: string = spoolDir()): Promise<PendingResult> {
  const result: PendingResult = { sent: 0, failed: 0 };

  for (const path of spooledFiles(dir)) {
    try {
      await send(JSON.parse(readFileSync(path, "utf8")) as RunRows);
      unlinkSync(path);
      result.sent += 1;
    } catch (err) {
      process.stderr.write(`warn: ${path} still not archived: ${message(err)}\n`);
      result.failed += 1;
    }
  }
  return result;
}

export function spooledFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.startsWith("th-") && name.endsWith(SPOOL_SUFFIX))
    .map((name) => join(dir, name));
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Sends what is spooled before a run starts or a wait begins. Never throws, never waits past the deadline. */
export async function drainSpool(): Promise<void> {
  try {
    if (spooledFiles(spoolDir()).length === 0) return;
    const deadline = new Promise((resolve) => setTimeout(resolve, DEADLINE_MS).unref());
    await Promise.race([archivePending(), deadline]);
  } catch (err) {
    process.stderr.write(`warn: spool not drained: ${message(err)}\n`);
  }
}
