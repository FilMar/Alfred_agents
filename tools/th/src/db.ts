import { Database } from "bun:sqlite";
import { homedir } from "node:os";
import { join } from "node:path";
import { mkdirSync } from "node:fs";

const DB_PATH = process.env.TH_DB_PATH ?? join(homedir(), ".pi", "th.db");

function open(): Database {
  mkdirSync(join(DB_PATH, ".."), { recursive: true });
  const db = new Database(DB_PATH, { create: true });
  db.run("PRAGMA journal_mode = WAL");
  migrate(db);
  return db;
}

function migrate(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS runs (
      id            TEXT PRIMARY KEY,
      member        TEXT NOT NULL,
      task          TEXT NOT NULL,
      started_at    TEXT NOT NULL,
      finished_at   TEXT,
      status        TEXT NOT NULL DEFAULT 'running',
      out_path      TEXT,
      log_path      TEXT,
      input_tokens  INTEGER,
      output_tokens INTEGER,
      cost_usd      REAL
    )
  `);
  // Add token columns to pre-existing databases created before this migration.
  const cols = new Set((db.query("PRAGMA table_info(runs)").all() as { name: string }[]).map((c) => c.name));
  if (!cols.has("input_tokens")) db.run("ALTER TABLE runs ADD COLUMN input_tokens INTEGER");
  if (!cols.has("output_tokens")) db.run("ALTER TABLE runs ADD COLUMN output_tokens INTEGER");
  if (!cols.has("cost_usd")) db.run("ALTER TABLE runs ADD COLUMN cost_usd REAL");
  db.run("CREATE INDEX IF NOT EXISTS idx_runs_member ON runs(member)");
  db.run("CREATE INDEX IF NOT EXISTS idx_runs_started ON runs(started_at)");
}

const db = open();

export interface Run {
  id: string;
  member: string;
  task: string;
  started_at: string;
  finished_at?: string;
  status: "running" | "done" | "error" | "timeout";
  out_path?: string;
  log_path?: string;
  input_tokens?: number;
  output_tokens?: number;
  cost_usd?: number;
}

/** Billed usage aggregated over every API call in a run. */
export interface RunUsage {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export function insertRun(r: Omit<Run, "finished_at"> & { finished_at?: string }): void {
  db.run(
    "INSERT INTO runs (id, member, task, started_at, status, out_path, log_path) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [r.id, r.member, r.task, r.started_at, r.status, r.out_path ?? null, r.log_path ?? null]
  );
}

export function finishRun(id: string, status: Run["status"], usage?: RunUsage): void {
  db.run(
    "UPDATE runs SET finished_at = ?, status = ?, input_tokens = ?, output_tokens = ?, cost_usd = ? WHERE id = ?",
    [new Date().toISOString(), status, usage?.inputTokens ?? null, usage?.outputTokens ?? null, usage?.costUsd ?? null, id]
  );
}

export function getRun(id: string): Run | null {
  const row = db.query("SELECT * FROM runs WHERE id = ? OR id LIKE ?").get(id, `${id}%`) as Record<string, unknown> | null;
  return row ? rowToRun(row) : null;
}

export function listRuns(opts: { member?: string; limit?: number } = {}): Run[] {
  const conditions: string[] = [];
  const params: (string | number)[] = [];
  if (opts.member) { conditions.push("member = ?"); params.push(opts.member); }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  params.push(opts.limit ?? 20);
  return (db.query(`SELECT * FROM runs ${where} ORDER BY started_at DESC LIMIT ?`).all(...params) as Record<string, unknown>[]).map(rowToRun);
}

function rowToRun(row: Record<string, unknown>): Run {
  return {
    id: row.id as string,
    member: row.member as string,
    task: row.task as string,
    started_at: row.started_at as string,
    finished_at: row.finished_at as string | undefined,
    status: row.status as Run["status"],
    out_path: row.out_path as string | undefined,
    log_path: row.log_path as string | undefined,
    input_tokens: (row.input_tokens as number | null) ?? undefined,
    output_tokens: (row.output_tokens as number | null) ?? undefined,
    cost_usd: (row.cost_usd as number | null) ?? undefined,
  };
}
