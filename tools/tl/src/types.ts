// The one definition of a row and of what makes it valid. Shared by both sides:
// the CLI checks before it sends, the API checks before it writes.

import { assert } from "../../tb/src/types.js";

// ─── Enum constants ───────────────────────────────────────────────────────────

export const EXCHANGE_KINDS = ["chat", "subtask"] as const;

export type ExchangeKind = (typeof EXCHANGE_KINDS)[number];

/** UUID-shaped, 8-4-4-4-12 lowercase hex. Both transcripts and `tb` ids match it. */
export const ID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * ISO-8601 UTC at fixed width, milliseconds and the `Z`.
 * SQLite validates nothing: a row written any other way sorts in the wrong place
 * and never raises an error, so the format is checked on write and on read.
 */
export const TIMESTAMP_SHAPE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

// ─── Rows ─────────────────────────────────────────────────────────────────────

export interface Session {
  /** The harness session id */
  id: string;
  /** ISO 8601 — first record of the session */
  started: string;
  /** Machine the work happened on */
  host?: string;
  /** Working directory */
  path?: string;
}

export interface Exchange {
  /** Id of the message that opened the exchange, taken from the transcript */
  id: string;
  session: string;
  /** The exchange this one was delegated from, for a subtask */
  parent?: string;
  /** ISO 8601 — when it was asked */
  timestamp: string;
  kind: ExchangeKind;
  /** `alfredo`, or the name of what was delegated to */
  actor: string;
  /** Model of the answer. It changes inside a session, so it is not on `sessions` */
  model?: string;
  tokens_in?: number;
  tokens_out?: number;
  tokens_cache_read?: number;
  tokens_cache_write?: number;
  /** ISO 8601 — when it was distilled. Absent until then. The only mutable field */
  distilled?: string;
  /** Trigger, subtask outcome, whatever else varies */
  meta?: Record<string, unknown>;
}

export interface Contents {
  exchange_id: string;
  /** The prompt, or the task a subtask was given */
  input: string;
  /** The whole answer, tool calls included */
  output: string;
}

// ─── Validation ───────────────────────────────────────────────────────────────

/** Returns the first message describing why the row cannot be written, or null. */
export function validateSession(session: Session): string | null {
  if (!isFilled(session.id)) return "session.id is required";
  if (!TIMESTAMP_SHAPE.test(session.started)) return `session.started is not ISO-8601 UTC: ${session.started}`;
  return null;
}

export function validateExchange(exchange: Exchange): string | null {
  if (!ID_SHAPE.test(exchange.id)) return `exchange.id is not an id: ${exchange.id}`;
  if (!isFilled(exchange.session)) return "exchange.session is required";
  if (!TIMESTAMP_SHAPE.test(exchange.timestamp)) return `exchange.timestamp is not ISO-8601 UTC: ${exchange.timestamp}`;
  if (!isKind(exchange.kind)) return `exchange.kind is not ${EXCHANGE_KINDS.join(" or ")}: ${exchange.kind}`;
  if (!isFilled(exchange.actor)) return "exchange.actor is required";
  return validateExchangeOptionals(exchange);
}

function validateExchangeOptionals(exchange: Exchange): string | null {
  if (exchange.parent !== undefined && !ID_SHAPE.test(exchange.parent)) return `exchange.parent is not an id: ${exchange.parent}`;
  if (exchange.distilled !== undefined && !TIMESTAMP_SHAPE.test(exchange.distilled)) return `exchange.distilled is not ISO-8601 UTC: ${exchange.distilled}`;
  const badCounter = TOKEN_FIELDS.find((f) => exchange[f] !== undefined && !isCount(exchange[f]));
  if (badCounter) return `exchange.${badCounter} is not a token count: ${exchange[badCounter]}`;
  return null;
}

export function validateContents(contents: Contents): string | null {
  if (!ID_SHAPE.test(contents.exchange_id)) return `contents.exchange_id is not an id: ${contents.exchange_id}`;
  if (typeof contents.input !== "string") return "contents.input is required";
  if (typeof contents.output !== "string") return "contents.output is required";
  return null;
}

const TOKEN_FIELDS = ["tokens_in", "tokens_out", "tokens_cache_read", "tokens_cache_write"] as const;

function isFilled(value: unknown): boolean {
  return typeof value === "string" && value.length > 0;
}

function isKind(value: string): value is ExchangeKind {
  return (EXCHANGE_KINDS as readonly string[]).includes(value);
}

function isCount(value: number | undefined): boolean {
  return Number.isInteger(value) && (value as number) >= 0;
}

// ─── Cost ─────────────────────────────────────────────────────────────────────

export interface CostRow {
  key: string;
  exchanges: number;
  tokens_in: number;
  tokens_out: number;
  tokens_cache_read: number;
  tokens_cache_write: number;
}

/** The day an exchange belongs to, as it is written in its timestamp. */
export function dayOf(exchange: Exchange): string {
  return exchange.timestamp.slice(0, 10);
}

/**
 * Sums the token counters of the exchanges, grouped by `key`, ordered by key.
 * Aggregation lives here and not in SQL: the whole table is a megabyte a month.
 */
export function sumBy(exchanges: Exchange[], key: (e: Exchange) => string): CostRow[] {
  const groups = new Map<string, CostRow>();
  for (const exchange of exchanges) {
    const row = groups.get(key(exchange)) ?? emptyRow(key(exchange));
    groups.set(row.key, addTo(row, exchange));
  }

  const result = [...groups.values()].sort((a, b) => a.key.localeCompare(b.key));
  assert(countExchanges(result) === exchanges.length, "sumBy: every exchange counted once");
  return result;
}

function emptyRow(key: string): CostRow {
  return { key, exchanges: 0, tokens_in: 0, tokens_out: 0, tokens_cache_read: 0, tokens_cache_write: 0 };
}

function addTo(row: CostRow, exchange: Exchange): CostRow {
  return {
    key: row.key,
    exchanges: row.exchanges + 1,
    tokens_in: row.tokens_in + (exchange.tokens_in ?? 0),
    tokens_out: row.tokens_out + (exchange.tokens_out ?? 0),
    tokens_cache_read: row.tokens_cache_read + (exchange.tokens_cache_read ?? 0),
    tokens_cache_write: row.tokens_cache_write + (exchange.tokens_cache_write ?? 0),
  };
}

function countExchanges(rows: CostRow[]): number {
  return rows.reduce((sum, r) => sum + r.exchanges, 0);
}
