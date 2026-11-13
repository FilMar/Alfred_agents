mod archive;
mod extractors;

use std::path::Path;
use std::sync::{Mutex, MutexGuard, PoisonError};

use rusqlite::{Connection, Row, Statement};

use super::{Exchange, Extraction, Extractor, HistError, NewExtraction, Session};

const SCHEMA: &str = "CREATE TABLE IF NOT EXISTS sessions (
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
CREATE INDEX IF NOT EXISTS extractions_by_run ON extractions(extractor_id, run);";

const SESSION_COLUMNS: &str = "id, started, harness, host, path";
const EXCHANGE_COLUMNS: &str = "id, session, parent, timestamp, kind, actor, model, tokens_in, tokens_out, tokens_cache_read, tokens_cache_write, distilled, meta";
const EXTRACTOR_COLUMNS: &str = "id, parent, why, active, config, created";
const EXTRACTION_COLUMNS: &str = "id, extractor_id, run, exchange_id, kind, body, quote, dropped_by, probabilities, verdict, of, saved_id, created";

#[derive(Debug)]
pub struct HistDb {
    conn: Mutex<Connection>,
}

impl HistDb {
    pub fn open(path: &Path) -> Result<HistDb, HistError> {
        let conn = Connection::open(path)?;
        conn.query_row("PRAGMA journal_mode = WAL", [], |row| {
            row.get::<_, String>(0)
        })?;
        conn.execute_batch("PRAGMA foreign_keys = ON")?;
        conn.execute_batch(SCHEMA)?;
        for (table, column) in [("sessions", "harness"), ("contents", "tools")] {
            if !has_column(&conn, table, column)? {
                conn.execute_batch(&format!("ALTER TABLE {table} ADD COLUMN {column} TEXT"))?;
            }
        }
        Ok(HistDb {
            conn: Mutex::new(conn),
        })
    }

    pub fn count(&self, table: &str) -> Result<i64, HistError> {
        debug_assert!(
            matches!(table, "sessions" | "exchanges" | "contents"),
            "HistDb.count: a known table"
        );
        let sql = format!("SELECT count(*) FROM {table}");
        Ok(self.lock().query_row(&sql, [], |row| row.get(0))?)
    }

    fn lock(&self) -> MutexGuard<'_, Connection> {
        self.conn.lock().unwrap_or_else(PoisonError::into_inner)
    }

    fn write_all<T>(
        &self,
        sql: &str,
        rows: &[T],
        bind: fn(&mut Statement, &T) -> rusqlite::Result<usize>,
    ) -> Result<usize, HistError> {
        let mut conn = self.lock();
        let tx = conn.transaction()?;
        {
            let mut stmt = tx.prepare(sql)?;
            for row in rows {
                bind(&mut stmt, row)?;
            }
        }
        tx.commit()?;
        Ok(rows.len())
    }
}

fn has_column(conn: &Connection, table: &str, column: &str) -> rusqlite::Result<bool> {
    let mut stmt = conn.prepare(&format!("PRAGMA table_info({table})"))?;
    let names = stmt
        .query_map([], |row| row.get::<_, String>(1))?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(names.iter().any(|name| name == column))
}

fn session_of(row: &Row) -> rusqlite::Result<Session> {
    Ok(Session {
        id: row.get(0)?,
        started: row.get(1)?,
        harness: row.get(2)?,
        host: row.get(3)?,
        path: row.get(4)?,
    })
}

fn exchange_of(row: &Row) -> rusqlite::Result<Exchange> {
    let meta = row
        .get::<_, Option<String>>(12)?
        .map(|text| serde_json::from_str(&text))
        .transpose()
        .map_err(|reason| {
            rusqlite::Error::FromSqlConversionFailure(
                12,
                rusqlite::types::Type::Text,
                Box::new(reason),
            )
        })?;
    Ok(Exchange {
        id: row.get(0)?,
        session: row.get(1)?,
        parent: row.get(2)?,
        timestamp: row.get(3)?,
        kind: row.get(4)?,
        actor: row.get(5)?,
        model: row.get(6)?,
        tokens_in: row.get(7)?,
        tokens_out: row.get(8)?,
        tokens_cache_read: row.get(9)?,
        tokens_cache_write: row.get(10)?,
        distilled: row.get(11)?,
        meta,
    })
}

fn extractor_of(row: &Row) -> rusqlite::Result<Extractor> {
    Ok(Extractor {
        id: row.get(0)?,
        parent: row.get(1)?,
        why: row.get(2)?,
        active: row.get::<_, i64>(3)? != 0,
        config: row.get(4)?,
        created: row.get(5)?,
    })
}

fn extraction_of(row: &Row) -> rusqlite::Result<Extraction> {
    Ok(Extraction {
        id: row.get(0)?,
        row: NewExtraction {
            extractor_id: row.get(1)?,
            run: row.get(2)?,
            exchange_id: row.get(3)?,
            kind: row.get(4)?,
            body: row.get(5)?,
            quote: row.get(6)?,
            dropped_by: row.get(7)?,
            probabilities: row.get(8)?,
            verdict: row.get(9)?,
            of: row.get(10)?,
            saved_id: row.get(11)?,
            created: row.get(12)?,
        },
    })
}
