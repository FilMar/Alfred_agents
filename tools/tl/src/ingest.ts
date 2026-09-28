// Reads transcripts and fills the archive. Writing is idempotent, because an
// exchange id comes from the transcript: a missed exchange is late, never lost.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { hostname } from "node:os";
import { join } from "node:path";
import { homedir } from "node:os";

import * as client from "./client.js";
import { parseLines, parseTranscript } from "./transcript.js";
import type { ParsedExchange } from "./transcript.js";

export const TRANSCRIPTS_ROOT = process.env.TL_TRANSCRIPTS ?? join(homedir(), ".claude", "projects");

export interface IngestSummary {
  transcripts: number;
  sessions: number;
  exchanges: number;
  /** Already in the archive, so not sent again. */
  known: number;
  orphans: number;
}

const EMPTY: IngestSummary = { transcripts: 0, sessions: 0, exchanges: 0, known: 0, orphans: 0 };

/**
 * Reads one transcript file. A subagent's own file is not read: its task call and
 * its report are already inside the output of the exchange that asked for it.
 */
export async function ingestTranscript(path: string): Promise<IngestSummary> {
  const main = parseTranscript(parseLines(readFileSync(path, "utf8")), { host: hostname() });
  if (main.session === null) return { ...EMPTY, transcripts: 1 };

  const known = new Set((await client.fetchExchanges({ session: main.session.id, limit: MAX_KNOWN })).map((e) => e.id));

  await client.putSessions([main.session]);
  const fresh = main.exchanges.filter((p) => !known.has(p.exchange.id));
  await sendExchanges(fresh);

  return {
    transcripts: 1,
    sessions: 1,
    exchanges: fresh.length,
    known: main.exchanges.length - fresh.length,
    orphans: main.orphans,
  };
}

const MAX_KNOWN = 5_000;

/**
 * Exchanges first and bodies after: `contents` points at `exchanges`, and a
 * foreign key is not a suggestion.
 */
async function sendExchanges(parsed: ParsedExchange[]): Promise<void> {
  if (parsed.length === 0) return;
  await client.putExchanges(parsed.map((p) => p.exchange));
  await client.putContents(parsed.map((p) => p.contents));
}

/** Finds the transcript of a session by its id, anywhere under the root. */
function findTranscript(sessionId: string): string | null {
  for (const project of projectDirs()) {
    const candidate = join(project, `${sessionId}.jsonl`);
    try {
      statSync(candidate);
      return candidate;
    } catch {
      continue;
    }
  }
  return null;
}

export async function ingestSession(sessionId: string): Promise<IngestSummary> {
  const path = findTranscript(sessionId);
  if (path === null) throw new Error(`No transcript for session ${sessionId} under ${TRANSCRIPTS_ROOT}`);
  return ingestTranscript(path);
}

/** Every transcript on this machine. Run it once for the backfill, then to fill gaps. */
export async function ingestAll(since?: string): Promise<IngestSummary> {
  let total = { ...EMPTY };
  for (const path of allTranscripts()) {
    if (since !== undefined && modifiedAt(path) < since) continue;
    total = add(total, await ingestTranscript(path));
  }
  return total;
}

function allTranscripts(): string[] {
  return projectDirs().flatMap((project) =>
    readdirSync(project)
      .filter((f) => f.endsWith(".jsonl"))
      .map((f) => join(project, f)),
  );
}

function projectDirs(): string[] {
  try {
    return readdirSync(TRANSCRIPTS_ROOT, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(TRANSCRIPTS_ROOT, entry.name));
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

