// The one definition of a row and of what makes it valid. Shared by both sides:
// the CLI checks before it sends, the API checks before it writes.

import { createHash } from "node:crypto";

import { assert } from "../../contract/contract.js";

// ─── Enum constants ───────────────────────────────────────────────────────────

export const EXCHANGE_KINDS = ["chat", "subtask"] as const;

export type ExchangeKind = (typeof EXCHANGE_KINDS)[number];

/**
 * The harness is the loop that runs the model: it reads the output, executes the
 * tool calls and feeds the results back. `th` is not one of these — it configures
 * pi's loop and calls it, so a delegated run is a `pi` row that `kind` marks as a
 * subtask. A name outside this list is far more likely a typo than a new tool, so
 * the store refuses it.
 */
export const HARNESSES = ["claude", "pi"] as const;

export type Harness = (typeof HARNESSES)[number];

/** UUID-shaped, 8-4-4-4-12 lowercase hex. Both transcripts and `tb` ids match it. */
export const ID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * ISO-8601 UTC at fixed width, milliseconds and the `Z`.
 * SQLite validates nothing: a row written any other way sorts in the wrong place
 * and never raises an error, so the format is checked on write and on read.
 */
export const TIMESTAMP_SHAPE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

/**
 * A UUID-shaped id from a session and a message id, the same way `tb` builds a note
 * id. One harness numbers its messages with UUIDs and another with eight hex
 * characters: deriving keeps one shape in the archive, and keeps it deterministic,
 * which is what makes writing the same exchange twice a no-op.
 */
export function exchangeId(session: string, message: string): string {
  const hash = createHash("sha256").update(`${session}:${message}`).digest("hex");
  const id = [hash.slice(0, 8), hash.slice(8, 12), hash.slice(12, 16), hash.slice(16, 20), hash.slice(20, 32)].join("-");
  assert(ID_SHAPE.test(id), "exchangeId: derived id has the right shape");
  return id;
}

// ─── Rows ─────────────────────────────────────────────────────────────────────

export interface Session {
  /** The harness session id */
  id: string;
  /** ISO 8601 — first record of the session */
  started: string;
  /** The tool that ran the session. Constant for its whole life, so it lives here */
  harness?: Harness;
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
  /** What the assistant said, text only */
  output: string;
  tools?: string;
}

export const CANDIDATE_KINDS = ["note", "rule"] as const;

export type CandidateKind = (typeof CANDIDATE_KINDS)[number];

export const DROP_PREFIXES = ["check:", "critic:"] as const;

export const NEAR_IDENTICAL = "near_identical";

export interface Extractor {
  id: number;
  parent: number | null;
  why: string;
  active: boolean;
  config: string;
  created: string;
}

export type NewExtractor = Omit<Extractor, "id" | "active">;

export interface Extraction {
  id: number;
  extractor_id: number;
  run: string;
  exchange_id: string;
  kind: CandidateKind;
  body: string;
  quote: string;
  dropped_by: string | null;
  probabilities: string | null;
  verdict: string | null;
  of: string | null;
  saved_id: string | null;
  created: string;
}

export type NewExtraction = Omit<Extraction, "id">;

export interface ExtractionFilters {
  extractor_id?: number;
  run?: string;
  exchange_id?: string;
  kept?: boolean;
}

// ─── Validation ───────────────────────────────────────────────────────────────

/** Returns the first message describing why the row cannot be written, or null. */
export function validateSession(session: Session): string | null {
  if (!isFilled(session.id)) return "session.id is required";
  if (!TIMESTAMP_SHAPE.test(session.started)) return `session.started is not ISO-8601 UTC: ${session.started}`;
  if (session.harness !== undefined && !isHarness(session.harness)) return `session.harness is not ${HARNESSES.join(" or ")}: ${session.harness}`;
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
  if (contents.tools !== undefined && !isFilled(contents.tools)) return "contents.tools is not a non-empty string";
  return null;
}

export function validateNewExtractor(row: NewExtractor): string | null {
  const result = firstFailure([
    [!isFilled(row.why), "why is required"],
    [!isJson(row.config), "config must be JSON"],
    [!TIMESTAMP_SHAPE.test(row.created), `created is not ISO-8601 UTC: ${row.created}`],
    [row.parent !== null && !isRowId(row.parent), `parent is not a row id: ${row.parent}`],
  ]);
  assert(result === null || result.length > 0, "validateNewExtractor: the result is null or a message");
  assert(result !== null || isFilled(row.why), "validateNewExtractor: null means why is filled");
  assert(result !== null || isJson(row.config), "validateNewExtractor: null means config is JSON");
  assert(result !== null || TIMESTAMP_SHAPE.test(row.created), "validateNewExtractor: null means created is ISO-8601 UTC");
  assert(result !== null || row.parent === null || isRowId(row.parent), "validateNewExtractor: null means parent is empty or a row id");
  return result;
}

export function validateNewExtraction(row: NewExtraction): string | null {
  const result = validateExtractionIdentity(row) ?? validateExtractionPayload(row) ?? validateExtractionOutcome(row);
  assert(result === null || result.length > 0, "validateNewExtraction: the result is null or a message");
  return result;
}

export function validateNewExtractions(rows: NewExtraction[]): string | null {
  let result: string | null = null;
  for (const row of rows) {
    result = validateNewExtraction(row);
    if (result !== null) break;
  }
  assert(result === null || result.length > 0, "validateNewExtractions: the result is null or a message");
  return result;
}

function validateExtractionIdentity(row: NewExtraction): string | null {
  const result = firstFailure([
    [!isRowId(row.extractor_id), `extractor_id is not a row id: ${row.extractor_id}`],
    [!isFilled(row.run), "run is required"],
    [!ID_SHAPE.test(row.exchange_id), `exchange_id is not an id: ${row.exchange_id}`],
    [!isCandidateKind(row.kind), `kind is not ${CANDIDATE_KINDS.join(" or ")}: ${row.kind}`],
  ]);
  assert(result !== null || isRowId(row.extractor_id), "validateExtractionIdentity: null means extractor_id is a row id");
  assert(result !== null || isFilled(row.run), "validateExtractionIdentity: null means run is filled");
  assert(result !== null || ID_SHAPE.test(row.exchange_id), "validateExtractionIdentity: null means exchange_id is an id");
  assert(result !== null || isCandidateKind(row.kind), "validateExtractionIdentity: null means kind is a candidate kind");
  return result;
}

function validateExtractionPayload(row: NewExtraction): string | null {
  const result = firstFailure([
    [!isFilled(row.quote), "quote is required"],
    [!isJson(row.body), "body must be JSON"],
    [row.probabilities !== null && !isJson(row.probabilities), "probabilities must be JSON"],
    [!TIMESTAMP_SHAPE.test(row.created), `created is not ISO-8601 UTC: ${row.created}`],
  ]);
  assert(result !== null || isFilled(row.quote), "validateExtractionPayload: null means quote is filled");
  assert(result !== null || isJson(row.body), "validateExtractionPayload: null means body is JSON");
  assert(result !== null || row.probabilities === null || isJson(row.probabilities), "validateExtractionPayload: null means probabilities are empty or JSON");
  assert(result !== null || TIMESTAMP_SHAPE.test(row.created), "validateExtractionPayload: null means created is ISO-8601 UTC");
  return result;
}

function validateExtractionOutcome(row: NewExtraction): string | null {
  const dropped = row.dropped_by !== null;
  const result = firstFailure([
    [dropped && !isDropReason(row.dropped_by), `dropped_by is not a known reason: ${row.dropped_by}`],
    [dropped && row.verdict !== null, "a dropped candidate has no verdict"],
    [row.saved_id !== null && row.verdict === null, "a saved candidate has a verdict"],
    [row.of !== null && row.verdict === null, "a pointer comes with a verdict"],
    [dropped && String(row.dropped_by).startsWith("check:") && row.probabilities !== null, "a check drop has no probabilities"],
  ]);
  assert(result !== null || row.dropped_by === null || isDropReason(row.dropped_by), "validateExtractionOutcome: null means dropped_by is empty or a known reason");
  assert(result !== null || row.dropped_by === null || row.verdict === null, "validateExtractionOutcome: null means a dropped candidate has no verdict");
  assert(result !== null || row.saved_id === null || row.verdict !== null, "validateExtractionOutcome: null means a saved candidate has a verdict");
  assert(result !== null || row.of === null || row.verdict !== null, "validateExtractionOutcome: null means a pointer comes with a verdict");
  assert(result !== null || row.dropped_by === null || !row.dropped_by.startsWith("check:") || row.probabilities === null, "validateExtractionOutcome: null means a check drop has no probabilities");
  return result;
}

function firstFailure(checks: Array<[boolean, string]>): string | null {
  const failed = checks.find(([bad]) => bad);
  const result = failed === undefined ? null : failed[1];
  assert(result === null || result.length > 0, "firstFailure: the result is null or a message");
  return result;
}

export function isRowId(value: unknown): boolean {
  const result = Number.isInteger(value) && (value as number) > 0;
  assert(!result || typeof value === "number", "isRowId: a row id is a number");
  return result;
}

function isJson(text: unknown): boolean {
  let result = typeof text === "string";
  if (result) {
    try {
      JSON.parse(text as string);
    } catch {
      result = false;
    }
  }
  assert(!result || typeof text === "string", "isJson: JSON text is a string");
  return result;
}

function isDropReason(text: unknown): boolean {
  const reason = typeof text === "string" ? text : "";
  const result = reason === NEAR_IDENTICAL || DROP_PREFIXES.some((p) => reason.length > p.length && reason.startsWith(p));
  assert(!result || isFilled(text), "isDropReason: a reason is not empty");
  return result;
}

function isCandidateKind(value: unknown): boolean {
  const result = typeof value === "string" && (CANDIDATE_KINDS as readonly string[]).includes(value);
  assert(!result || typeof value === "string", "isCandidateKind: a kind is a string");
  return result;
}

const TOKEN_FIELDS = ["tokens_in", "tokens_out", "tokens_cache_read", "tokens_cache_write"] as const;

function isFilled(value: unknown): boolean {
  return typeof value === "string" && value.length > 0;
}

function isKind(value: string): value is ExchangeKind {
  return (EXCHANGE_KINDS as readonly string[]).includes(value);
}

function isHarness(value: string): value is Harness {
  return (HARNESSES as readonly string[]).includes(value);
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
