// Pure parsing of a harness transcript into rows. No I/O: the caller reads the
// file, this turns lines into exchanges, so the grouping rule is testable.

import { assert } from "../../tb/src/types.js";
import type { Contents, Exchange, Session } from "./types.js";

const MAIN_ACTOR = "alfredo";

// ─── What a transcript line looks like ────────────────────────────────────────

export interface Part {
  type?: string;
  text?: string;
  name?: string;
  input?: unknown;
  content?: unknown;
}

export interface Line {
  type?: string;
  uuid?: string;
  parentUuid?: string | null;
  sessionId?: string;
  agentId?: string;
  timestamp?: string;
  cwd?: string;
  isSidechain?: boolean;
  origin?: { kind?: string };
  message?: { role?: string; model?: string; content?: string | Part[]; usage?: Usage };
}

export interface Usage {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
}

export interface ParsedExchange {
  exchange: Exchange;
  contents: Contents;
}

export interface ParsedTranscript {
  session: Session | null;
  exchanges: ParsedExchange[];
  /** Assistant lines that arrived before any opener, so they belong to nothing. */
  orphans: number;
}

// ─── Lines ────────────────────────────────────────────────────────────────────

/** Parses the lines a transcript file holds, skipping the ones that are not JSON. */
export function parseLines(text: string): Line[] {
  const lines: Line[] = [];
  for (const raw of text.split("\n")) {
    if (raw.trim().length === 0) continue;
    try {
      lines.push(JSON.parse(raw) as Line);
    } catch {
      continue;
    }
  }
  return lines;
}

/**
 * True when this line is a question, and not an answer to a tool.
 * `origin` marks it: slash-command bookkeeping, interruption notices and skill
 * injections carry none, and their cost lands on the exchange before them rather
 * than being lost.
 */
export function isOpener(line: Line): boolean {
  if (line.type !== "user") return false;
  return typeof line.origin?.kind === "string";
}

export interface Span {
  opener: Line;
  body: Line[];
}

/** Splits the lines into one span per opener. Lines before the first are dropped. */
export function spans(lines: Line[]): { spans: Span[]; orphans: number } {
  const result: Span[] = [];
  let orphans = 0;

  for (const line of lines) {
    if (isOpener(line)) result.push({ opener: line, body: [] });
    else if (result.length === 0) orphans += line.type === "assistant" ? 1 : 0;
    else result[result.length - 1].body.push(line);
  }

  assert(result.length <= lines.length, "spans: no span invented");
  return { spans: result, orphans };
}

// ─── Text ─────────────────────────────────────────────────────────────────────

/** The text a line carries, tool calls and tool results included, in order. */
export function lineText(line: Line): string {
  const content = line.message?.content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.map(partText).filter((t) => t.length > 0).join("\n");
}

function partText(part: Part): string {
  if (part.type === "text") return part.text ?? "";
  if (part.type === "tool_use") return `[tool ${part.name ?? "?"}] ${stringify(part.input)}`;
  if (part.type === "tool_result") return `[result] ${stringify(part.content)}`;
  return "";
}

function stringify(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

// ─── Tokens ───────────────────────────────────────────────────────────────────

export interface Tokens {
  tokens_in: number;
  tokens_out: number;
  tokens_cache_read: number;
  tokens_cache_write: number;
}

/** Sums the usage of every answer in the span. One exchange holds several calls. */
export function sumTokens(body: Line[]): Tokens {
  const total: Tokens = { tokens_in: 0, tokens_out: 0, tokens_cache_read: 0, tokens_cache_write: 0 };
  for (const line of body) {
    const usage = line.message?.usage;
    if (line.type !== "assistant" || !usage) continue;
    total.tokens_in += usage.input_tokens ?? 0;
    total.tokens_out += usage.output_tokens ?? 0;
    total.tokens_cache_read += usage.cache_read_input_tokens ?? 0;
    total.tokens_cache_write += usage.cache_creation_input_tokens ?? 0;
  }
  return total;
}

/** The model that answered. It can change inside one exchange; the last one wins. */
export function modelOf(body: Line[]): string | undefined {
  const models = body.filter((l) => l.type === "assistant").map((l) => l.message?.model);
  const named = models.filter((m): m is string => typeof m === "string" && !m.startsWith("<"));
  return named.length > 0 ? named[named.length - 1] : undefined;
}

// ─── Exchanges ────────────────────────────────────────────────────────────────

export interface ParseOptions {
  /** Machine the transcript was read on. The transcript does not carry it. */
  host?: string;
}

/**
 * Turns the lines of one transcript file into a session and its exchanges.
 * Every row is a `chat`: `subtask` belongs to a `th` run, which makes its own
 * model calls in its own process and never appears in a transcript.
 */
export function parseTranscript(lines: Line[], options: ParseOptions = {}): ParsedTranscript {
  const split = spans(lines);
  const exchanges = split.spans
    .map((span) => toExchange(span))
    .filter((parsed): parsed is ParsedExchange => parsed !== null);

  assert(exchanges.length <= split.spans.length, "parseTranscript: no exchange invented");
  return { session: sessionOf(lines, options.host), exchanges, orphans: split.orphans };
}

function toExchange(span: Span): ParsedExchange | null {
  const { opener, body } = span;
  if (!opener.uuid || !opener.timestamp || !opener.sessionId) return null;

  const meta: Record<string, unknown> = {};
  if (opener.origin?.kind) meta.trigger = opener.origin.kind;

  const exchange: Exchange = {
    id: opener.uuid,
    session: opener.sessionId,
    timestamp: opener.timestamp,
    kind: "chat",
    actor: MAIN_ACTOR,
    ...modelField(body),
    ...sumTokens(body),
    ...(Object.keys(meta).length > 0 && { meta }),
  };

  return {
    exchange,
    contents: {
      exchange_id: opener.uuid,
      input: lineText(opener),
      output: body.map(lineText).filter((t) => t.length > 0).join("\n\n"),
    },
  };
}

function modelField(body: Line[]): { model?: string } {
  const model = modelOf(body);
  return model === undefined ? {} : { model };
}

function sessionOf(lines: Line[], host?: string): Session | null {
  const first = lines.find((l) => typeof l.sessionId === "string" && typeof l.timestamp === "string");
  if (!first) return null;
  return {
    id: first.sessionId as string,
    started: first.timestamp as string,
    ...(host && { host }),
    ...(first.cwd && { path: first.cwd }),
  };
}
