// SQLite, on the machine that holds the file. No business logic: rows in, rows out.

import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

import { assert } from "../../tb/src/types.js";
import type {
  CandidateKind, Contents, Exchange, ExchangeKind, Extraction, ExtractionFilters, Extractor, Harness,
  NewExtraction, NewExtractor, Session,
} from "./types.js";
import {
  isRowId, validateContents, validateExchange, validateNewExtraction, validateNewExtractor, validateSession,
} from "./types.js";

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
  output      TEXT NOT NULL,
  tools       TEXT
);
CREATE TABLE IF NOT EXISTS extractor (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  parent  INTEGER REFERENCES extractor(id),
  why     TEXT NOT NULL,
  active  INTEGER NOT NULL DEFAULT 0 CHECK (active IN (0, 1)),
  config  TEXT NOT NULL CHECK (json_valid(config)),
  created TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS extractor_one_active ON extractor(active) WHERE active = 1;
CREATE TABLE IF NOT EXISTS extractions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  extractor_id  INTEGER NOT NULL REFERENCES extractor(id),
  run           TEXT NOT NULL,
  exchange_id   TEXT NOT NULL REFERENCES exchanges(id),
  kind          TEXT NOT NULL CHECK (kind IN ('note', 'rule')),
  body          TEXT NOT NULL CHECK (json_valid(body)),
  quote         TEXT NOT NULL,
  dropped_by    TEXT,
  probabilities TEXT CHECK (probabilities IS NULL OR json_valid(probabilities)),
  verdict       TEXT,
  of            TEXT,
  saved_id      TEXT,
  created       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS extractions_by_run ON extractions(extractor_id, run);
`;


/** Opens the archive, creating the file and the tables when they are missing. */
export function open(path: string = DB_PATH): Database {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path, { create: true });
  db.run("PRAGMA journal_mode = WAL");
  db.run("PRAGMA foreign_keys = ON");
  db.run(SCHEMA);
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
    db.run("ALTER TABLE sessions ADD COLUMN harness TEXT");
  }
  assert(hasColumn(db, "sessions", "harness"), "migrate: sessions carries harness");

  if (!hasColumn(db, "contents", "tools")) {
    db.run("ALTER TABLE contents ADD COLUMN tools TEXT");
  }
  assert(hasColumn(db, "contents", "tools"), "migrate: contents carries tools");
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
    `INSERT INTO contents (exchange_id, input, output, tools) VALUES ($id, $input, $output, $tools)
     ON CONFLICT(exchange_id) DO UPDATE SET input = $input, output = $output, tools = $tools`,
  ).run({ $id: contents.exchange_id, $input: contents.input, $output: contents.output, $tools: contents.tools ?? null });
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

export function getContents(db: Database, id: string, withTools: boolean): Contents | null {
  assert(typeof withTools === "boolean", "getContents: withTools is a boolean");
  const toolsColumn = withTools ? "tools" : "NULL AS tools";
  const row = db.query(`SELECT exchange_id, input, output, ${toolsColumn} FROM contents WHERE exchange_id = $id`)
    .get({ $id: id }) as RawContents | null;
  if (row === null) return null;

  const contents = toContents(row);
  assert(withTools || !("tools" in contents), "getContents: tools stay out unless asked");
  return contents;
}

type RawContents = { exchange_id: string; input: string; output: string; tools: string | null };

function toContents(row: RawContents): Contents {
  assert(typeof row.exchange_id === "string", "toContents: row carries its exchange id");
  const contents: Contents = {
    exchange_id: row.exchange_id,
    input: row.input,
    output: row.output,
    ...(row.tools !== null && { tools: row.tools }),
  };
  assert(validateContents(contents) === null, `toContents: ${validateContents(contents)}`);
  return contents;
}

export function insertExtractor(db: Database, row: NewExtractor): number {
  assert(validateNewExtractor(row) === null, `insertExtractor: ${validateNewExtractor(row)}`);
  const result = db.prepare(
    `INSERT INTO extractor (parent, why, config, created) VALUES ($parent, $why, $config, $created)`,
  ).run({
    $parent: row.parent ?? null,
    $why: row.why,
    $config: row.config,
    $created: row.created,
  });
  const id = Number(result.lastInsertRowid);
  assert(isRowId(id), "insertExtractor: the new id is a row id");
  assert(getExtractor(db, id)?.config === row.config, "insertExtractor: the stored config is the one given");
  assert(getExtractor(db, id)?.active === false, "insertExtractor: a new extractor is inactive");
  return id;
}

export function getExtractor(db: Database, id: number): Extractor | null {
  assert(isRowId(id), `getExtractor: id is a row id, id=${id}`);
  const row = db.prepare(`SELECT * FROM extractor WHERE id = $id`).get({ $id: id }) as RawExtractor | null;
  const result = row ? toExtractor(row) : null;
  assert(result === null || result.id === id, "getExtractor: the row found is the one asked for");
  return result;
}

export function getActiveExtractor(db: Database): Extractor | null {
  const row = db.prepare(`SELECT * FROM extractor WHERE active = 1`).get() as RawExtractor | null;
  const result = row ? toExtractor(row) : null;
  assert(result === null || result.active, "getActiveExtractor: the row found is active");
  return result;
}

export function setActiveExtractor(db: Database, id: number): boolean {
  assert(isRowId(id), `setActiveExtractor: id is a row id, id=${id}`);
  const success = getExtractor(db, id) !== null;
  if (success) {
    db.transaction(() => {
      db.prepare(`UPDATE extractor SET active = 0 WHERE active = 1`).run();
      db.prepare(`UPDATE extractor SET active = 1 WHERE id = $id`).run({ $id: id });
    })();
  }
  assert(!success || isOnlyActive(db, id), "setActiveExtractor: after a change the extractor is the only active one");
  assert(success || getExtractor(db, id) === null, "setActiveExtractor: false means the extractor does not exist");
  return success;
}

export function insertExtraction(db: Database, row: NewExtraction): number {
  assert(validateNewExtraction(row) === null, `insertExtraction: ${validateNewExtraction(row)}`);
  const result = db.prepare(
    `INSERT INTO extractions (extractor_id, run, exchange_id, kind, body, quote, dropped_by, probabilities, verdict, of, saved_id, created)
     VALUES ($extractor_id, $run, $exchange_id, $kind, $body, $quote, $dropped_by, $probabilities, $verdict, $of, $saved_id, $created)`,
  ).run({
    $extractor_id: row.extractor_id,
    $run: row.run,
    $exchange_id: row.exchange_id,
    $kind: row.kind,
    $body: row.body,
    $quote: row.quote,
    $dropped_by: row.dropped_by ?? null,
    $probabilities: row.probabilities ?? null,
    $verdict: row.verdict ?? null,
    $of: row.of ?? null,
    $saved_id: row.saved_id ?? null,
    $created: row.created,
  });
  const id = Number(result.lastInsertRowid);
  assert(isRowId(id), "insertExtraction: the new id is a row id");
  assert(extractionExists(db, id), "insertExtraction: the row is stored");
  return id;
}

export function listExtractions(db: Database, filters: ExtractionFilters = {}): Extraction[] {
  assert(filters.extractor_id === undefined || isRowId(filters.extractor_id), `listExtractions: extractor_id is a row id, extractor_id=${filters.extractor_id}`);
  const where: string[] = [];
  const params: Record<string, string | number> = {};

  if (filters.extractor_id !== undefined) { where.push("extractor_id = $extractor_id"); params.$extractor_id = filters.extractor_id; }
  if (filters.run !== undefined) { where.push("run = $run"); params.$run = filters.run; }
  if (filters.exchange_id !== undefined) { where.push("exchange_id = $exchange_id"); params.$exchange_id = filters.exchange_id; }
  if (filters.kept === true) where.push("dropped_by IS NULL");
  if (filters.kept === false) where.push("dropped_by IS NOT NULL");

  const clause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  const rows = db.prepare(`SELECT * FROM extractions ${clause} ORDER BY id ASC`).all(params) as RawExtraction[];
  const result = rows.map(toExtraction);
  assert(matchAll(result, filters), "listExtractions: every row matches the filters");
  assert(isAscending(result), "listExtractions: rows come in id order");
  return result;
}

function isOnlyActive(db: Database, id: number): boolean {
  assert(isRowId(id), `isOnlyActive: id is a row id, id=${id}`);
  const row = db.prepare(`SELECT id FROM extractor WHERE active = 1`).get() as { id: number } | null;
  return row !== null && row.id === id;
}

function extractionExists(db: Database, id: number): boolean {
  assert(isRowId(id), `extractionExists: id is a row id, id=${id}`);
  return db.prepare(`SELECT 1 FROM extractions WHERE id = $id`).get({ $id: id }) !== null;
}

function matchAll(rows: Extraction[], filters: ExtractionFilters): boolean {
  assert(Array.isArray(rows), "matchAll: rows is an array");
  for (const row of rows) {
    if (filters.extractor_id !== undefined && row.extractor_id !== filters.extractor_id) return false;
    if (filters.run !== undefined && row.run !== filters.run) return false;
    if (filters.exchange_id !== undefined && row.exchange_id !== filters.exchange_id) return false;
    if (filters.kept === true && row.dropped_by !== null) return false;
    if (filters.kept === false && row.dropped_by === null) return false;
  }
  return true;
}

function isAscending(rows: Extraction[]): boolean {
  assert(Array.isArray(rows), "isAscending: rows is an array");
  for (let i = 0; i < rows.length - 1; i++) {
    if (rows[i].id >= rows[i + 1].id) return false;
  }
  return true;
}

type RawExtractor = {
  id: number; parent: number | null; why: string; active: number; config: string; created: string;
};

type RawExtraction = {
  id: number; extractor_id: number; run: string; exchange_id: string; kind: string; body: string;
  quote: string; dropped_by: string | null; probabilities: string | null; verdict: string | null;
  of: string | null; saved_id: string | null; created: string;
};

function toExtractor(row: RawExtractor): Extractor {
  assert(row.active === 0 || row.active === 1, `toExtractor: active is 0 or 1, active=${row.active}`);
  const result: Extractor = {
    id: row.id,
    parent: row.parent,
    why: row.why,
    active: row.active === 1,
    config: row.config,
    created: row.created,
  };
  assert(validateNewExtractor(result) === null, `toExtractor: ${validateNewExtractor(result)}`);
  assert(result.id === row.id, "toExtractor: the id is kept");
  assert(result.active === (row.active === 1), "toExtractor: active is the flag as a boolean");
  return result;
}

function toExtraction(row: RawExtraction): Extraction {
  assert(isRowId(row.id), `toExtraction: id is a row id, id=${row.id}`);
  const result: Extraction = {
    id: row.id,
    extractor_id: row.extractor_id,
    run: row.run,
    exchange_id: row.exchange_id,
    kind: row.kind as CandidateKind,
    body: row.body,
    quote: row.quote,
    dropped_by: row.dropped_by,
    probabilities: row.probabilities,
    verdict: row.verdict,
    of: row.of,
    saved_id: row.saved_id,
    created: row.created,
  };
  assert(validateNewExtraction(result) === null, `toExtraction: ${validateNewExtraction(result)}`);
  assert(result.id === row.id, "toExtraction: the id is kept");
  return result;
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
