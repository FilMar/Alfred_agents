// SQLite, on the machine that holds the file. No business logic: rows in, rows out.

import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

import { assert } from "../../tb/src/types.js";
import type { Contents, Exchange, ExchangeKind, Harness, Session } from "./types.js";
import { validateContents, validateExchange, validateSession } from "./types.js";

export const DB_PATH = process.env.TL_DB ?? join(homedir(), ".tl", "tl.db");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS sessions (
  id        TEXT PRIMARY KEY,
  started   TEXT NOT NULL,
  harness   TEXT,
  host      TEXT,
  path      TEXT
);
CREATE TABLE IF NOT EXISTS exchanges (
  id        TEXT PRIMARY KEY,
  session   TEXT REFERENCES sessions(id),
  parent    TEXT REFERENCES exchanges(id),
  timestamp TEXT NOT NULL,
  kind      TEXT NOT NULL,
  actor     TEXT NOT NULL,
  model     TEXT,
  tokens_in          INTEGER,
  tokens_out         INTEGER,
  tokens_cache_read  INTEGER,
  tokens_cache_write INTEGER,
  distilled TEXT,
  meta      TEXT
);
CREATE TABLE IF NOT EXISTS contents (
  exchange_id TEXT PRIMARY KEY REFERENCES exchanges(id),
  input       TEXT NOT NULL,
  output      TEXT NOT NULL
);
`;

/** Opens the archive, creating the file and the tables when they are missing. */
export function open(path: string = DB_PATH): Database {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path, { create: true });
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(SCHEMA);
  migrate(db);
  return db;
}

/**
 * Adds a column an older archive does not have yet. `CREATE TABLE IF NOT EXISTS`
 * leaves an existing table alone, so a new column needs saying out loud.
 */
export function migrate(db: Database): void {
  const columns = db.query("PRAGMA table_info(sessions)").all() as Array<{ name: string }>;
  if (!columns.some((c) => c.name === "harness")) {
    db.exec("ALTER TABLE sessions ADD COLUMN harness TEXT");
  }
  assert(hasColumn(db, "sessions", "harness"), "migrate: sessions carries harness");
}

function hasColumn(db: Database, table: string, column: string): boolean {
  const columns = db.query(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return columns.some((c) => c.name === column);
}

// ─── Write ────────────────────────────────────────────────────────────────────

/** Writes a session. Writing the same session twice changes nothing. */
export function upsertSession(db: Database, session: Session): void {
  assert(validateSession(session) === null, `upsertSession: ${validateSession(session)}`);
  db.query(
    `INSERT INTO sessions (id, started, harness, host, path)
     VALUES ($id, $started, $harness, $host, $path)
     ON CONFLICT(id) DO UPDATE SET
       started = $started, harness = $harness, host = $host, path = $path`,
  ).run({
    $id: session.id,
    $started: session.started,
    $harness: session.harness ?? null,
    $host: session.host ?? null,
    $path: session.path ?? null,
  });
}

/** Writes an exchange. `distilled` is never overwritten: only PATCH sets it. */
export function upsertExchange(db: Database, exchange: Exchange): void {
  assert(validateExchange(exchange) === null, `upsertExchange: ${validateExchange(exchange)}`);
  db.query(
    `INSERT INTO exchanges (id, session, parent, timestamp, kind, actor, model,
       tokens_in, tokens_out, tokens_cache_read, tokens_cache_write, distilled, meta)
     VALUES ($id, $session, $parent, $timestamp, $kind, $actor, $model,
       $tokens_in, $tokens_out, $tokens_cache_read, $tokens_cache_write, $distilled, $meta)
     ON CONFLICT(id) DO UPDATE SET
       session = $session, parent = $parent, timestamp = $timestamp, kind = $kind,
       actor = $actor, model = $model, tokens_in = $tokens_in, tokens_out = $tokens_out,
       tokens_cache_read = $tokens_cache_read, tokens_cache_write = $tokens_cache_write,
       meta = $meta`,
  ).run({
    $id: exchange.id,
    $session: exchange.session,
    $parent: exchange.parent ?? null,
    $timestamp: exchange.timestamp,
    $kind: exchange.kind,
    $actor: exchange.actor,
    $model: exchange.model ?? null,
    $tokens_in: exchange.tokens_in ?? null,
    $tokens_out: exchange.tokens_out ?? null,
    $tokens_cache_read: exchange.tokens_cache_read ?? null,
    $tokens_cache_write: exchange.tokens_cache_write ?? null,
    $distilled: exchange.distilled ?? null,
    $meta: exchange.meta === undefined ? null : JSON.stringify(exchange.meta),
  });
}

/** Writes the body of an exchange. */
export function upsertContents(db: Database, contents: Contents): void {
  assert(validateContents(contents) === null, `upsertContents: ${validateContents(contents)}`);
  db.query(
    `INSERT INTO contents (exchange_id, input, output) VALUES ($id, $input, $output)
     ON CONFLICT(exchange_id) DO UPDATE SET input = $input, output = $output`,
  ).run({ $id: contents.exchange_id, $input: contents.input, $output: contents.output });
}

/** Marks an exchange as distilled. The one mutable field in the archive. */
export function setDistilled(db: Database, id: string, distilled: string | null): boolean {
  const changes = db.query(`UPDATE exchanges SET distilled = $distilled WHERE id = $id`)
    .run({ $id: id, $distilled: distilled });
  return changes.changes > 0;
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export interface ExchangeFilters {
  session?: string;
  kind?: ExchangeKind;
  since?: string;
  until?: string;
  /** `true` keeps only the distilled ones, `false` only the queue. */
  distilled?: boolean;
  limit?: number;
}

const DEFAULT_LIMIT = 100;

export interface SessionFilters {
  harness?: Harness;
  limit?: number;
}

export function listSessions(db: Database, filters: SessionFilters = {}): Session[] {
  const params: Record<string, string | number> = { $limit: filters.limit ?? DEFAULT_LIMIT };
  let clause = "";
  if (filters.harness !== undefined) {
    clause = "WHERE harness = $harness";
    params.$harness = filters.harness;
  }
  const rows = db.query(`SELECT * FROM sessions ${clause} ORDER BY started DESC LIMIT $limit`)
    .all(params) as RawSession[];
  return rows.map(toSession);
}

export function listExchanges(db: Database, filters: ExchangeFilters = {}): Exchange[] {
  const where: string[] = [];
  const params: Record<string, string | number> = { $limit: filters.limit ?? DEFAULT_LIMIT };

  if (filters.session !== undefined) { where.push("session = $session"); params.$session = filters.session; }
  if (filters.kind !== undefined) { where.push("kind = $kind"); params.$kind = filters.kind; }
  if (filters.since !== undefined) { where.push("timestamp >= $since"); params.$since = filters.since; }
  if (filters.until !== undefined) { where.push("timestamp <= $until"); params.$until = filters.until; }
  if (filters.distilled === true) where.push("distilled IS NOT NULL");
  if (filters.distilled === false) where.push("distilled IS NULL");

  const clause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  const rows = db.query(`SELECT * FROM exchanges ${clause} ORDER BY timestamp DESC LIMIT $limit`)
    .all(params) as RawExchange[];
  return rows.map(toExchange);
}

export function getExchange(db: Database, id: string): Exchange | null {
  const row = db.query(`SELECT * FROM exchanges WHERE id = $id`).get({ $id: id }) as RawExchange | null;
  return row ? toExchange(row) : null;
}

export function getContents(db: Database, id: string): Contents | null {
  const row = db.query(`SELECT * FROM contents WHERE exchange_id = $id`).get({ $id: id }) as Contents | null;
  return row ?? null;
}

/** Ids already in the archive, so the ingester knows what it can skip. */
export function knownExchangeIds(db: Database, session: string): Set<string> {
  const rows = db.query(`SELECT id FROM exchanges WHERE session = $session`)
    .all({ $session: session }) as Array<{ id: string }>;
  return new Set(rows.map((r) => r.id));
}

// ─── Row mapping ──────────────────────────────────────────────────────────────

type RawSession = { id: string; started: string; harness: string | null; host: string | null; path: string | null };

type RawExchange = {
  id: string; session: string; parent: string | null; timestamp: string; kind: string;
  actor: string; model: string | null; tokens_in: number | null; tokens_out: number | null;
  tokens_cache_read: number | null; tokens_cache_write: number | null;
  distilled: string | null; meta: string | null;
};

function toSession(row: RawSession): Session {
  return {
    id: row.id,
    started: row.started,
    ...(row.harness !== null && { harness: row.harness as Harness }),
    ...(row.host !== null && { host: row.host }),
    ...(row.path !== null && { path: row.path }),
  };
}

function toExchange(row: RawExchange): Exchange {
  const exchange: Exchange = {
    id: row.id,
    session: row.session,
    timestamp: row.timestamp,
    kind: row.kind as ExchangeKind,
    actor: row.actor,
    ...(row.parent !== null && { parent: row.parent }),
    ...(row.model !== null && { model: row.model }),
    ...(row.tokens_in !== null && { tokens_in: row.tokens_in }),
    ...(row.tokens_out !== null && { tokens_out: row.tokens_out }),
    ...(row.tokens_cache_read !== null && { tokens_cache_read: row.tokens_cache_read }),
    ...(row.tokens_cache_write !== null && { tokens_cache_write: row.tokens_cache_write }),
    ...(row.distilled !== null && { distilled: row.distilled }),
    ...(row.meta !== null && { meta: JSON.parse(row.meta) as Record<string, unknown> }),
  };
  assert(validateExchange(exchange) === null, `toExchange: ${validateExchange(exchange)}`);
  return exchange;
}
