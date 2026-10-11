// Reads transcripts and fills the archive. Writing is idempotent, because an
// exchange id comes from the transcript: a missed exchange is late, never lost.
//
// Two harnesses write two formats in the same directory-per-project layout. A file
// says which one it is: pi opens with a `session` record, Claude Code does not.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { hostname, homedir } from "node:os";
import { join } from "node:path";

import * as claude from "./claude.js";
import * as client from "./client.js";
import * as pi from "./pi.js";
import { parseLines } from "./transcript.js";
import type { ParsedExchange, ParsedTranscript } from "./transcript.js";

export const CLAUDE_ROOT = process.env.TL_TRANSCRIPTS ?? join(homedir(), ".claude", "projects");
export const PI_ROOT = process.env.TL_PI_SESSIONS ?? join(homedir(), ".pi", "agent", "sessions");

export interface IngestSummary {
  transcripts: number;
  sessions: number;
  exchanges: number;
  /** Already in the archive, so not sent again. */
  known: number;
  orphans: number;
}

const EMPTY: IngestSummary = { transcripts: 0, sessions: 0, exchanges: 0, known: 0, orphans: 0 };

const MAX_KNOWN = 5_000;

/** True when the file was written by pi: its first record declares the session. */
export function looksLikePi(text: string): boolean {
  const first = text.split("\n").find((l) => l.trim().length > 0);
  if (first === undefined) return false;
  try {
    return (JSON.parse(first) as { type?: string }).type === "session";
  } catch {
    return false;
  }
}

function read(path: string, host: string): ParsedTranscript {
  const text = readFileSync(path, "utf8");
  return looksLikePi(text)
    ? pi.parse(parseLines<pi.Line>(text), { host })
    : claude.parse(parseLines<claude.Line>(text), { host });
}

/**
 * Reads one transcript file. A Claude subagent's own file is not read: its task
 * call and its report are already inside the output of the exchange that asked.
 *
 * `refresh` sends every exchange again instead of only the missing ones. The rows
 * are the same by id, so a re-send overwrites them with whatever the parser makes
 * of the transcript today — which is how a better parser reaches old rows.
 */
export async function ingestTranscript(path: string, refresh = false): Promise<IngestSummary> {
  const parsed = read(path, hostname());
  if (parsed.session === null) return { ...EMPTY, transcripts: 1 };

  const known = refresh
    ? new Set<string>()
    : new Set((await client.fetchExchanges({ session: parsed.session.id, limit: MAX_KNOWN })).map((e) => e.id));

  await client.putSessions([parsed.session]);
  const fresh = parsed.exchanges.filter((p) => !known.has(p.exchange.id));
  await sendExchanges(fresh);

  return {
    transcripts: 1,
    sessions: 1,
    exchanges: fresh.length,
    known: parsed.exchanges.length - fresh.length,
    orphans: parsed.orphans,
  };
}

/**
 * Exchanges first and bodies after: `contents` points at `exchanges`, and a
 * foreign key is not a suggestion.
 */
async function sendExchanges(parsed: ParsedExchange[]): Promise<void> {
  if (parsed.length === 0) return;
  await client.putExchanges(parsed.map((p) => p.exchange));
  await client.putContents(parsed.map((p) => p.contents));
}

/** Finds a transcript by session id, in either harness. pi prefixes the file with a date. */
function findTranscript(sessionId: string): string | null {
  for (const path of allTranscripts()) {
    const name = path.slice(path.lastIndexOf("/") + 1);
    if (name === `${sessionId}.jsonl` || name.endsWith(`_${sessionId}.jsonl`)) return path;
  }
  return null;
}

export async function ingestSession(sessionId: string, refresh = false): Promise<IngestSummary> {
  const path = findTranscript(sessionId);
  if (path === null) throw new Error(`No transcript for session ${sessionId} under ${CLAUDE_ROOT} or ${PI_ROOT}`);
  return ingestTranscript(path, refresh);
}

/** Every transcript of every harness here. Run once to backfill, then to fill gaps. */
export async function ingestAll(since?: string, refresh = false): Promise<IngestSummary> {
  let total = { ...EMPTY };
  for (const path of allTranscripts()) {
    if (since !== undefined && modifiedAt(path) < since) continue;
    total = add(total, await ingestTranscript(path, refresh));
  }
  return total;
}

function allTranscripts(): string[] {
  return [CLAUDE_ROOT, PI_ROOT].flatMap((root) =>
    projectDirs(root).flatMap((project) =>
      readdirSync(project).filter((f) => f.endsWith(".jsonl")).map((f) => join(project, f)),
    ),
  );
}

function projectDirs(root: string): string[] {
  try {
    return readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(root, entry.name));
  } catch {
    return [];
  }
}

function modifiedAt(path: string): string {
  return statSync(path).mtime.toISOString();
}

function add(a: IngestSummary, b: IngestSummary): IngestSummary {
  return {
    transcripts: a.transcripts + b.transcripts,
    sessions: a.sessions + b.sessions,
    exchanges: a.exchanges + b.exchanges,
    known: a.known + b.known,
    orphans: a.orphans + b.orphans,
  };
}
