use crate::hist::db::HistDb;

#[allow(unused_imports)]
use super::*;

#[test]
fn open_creates_the_archive() {
    let path = fresh_path("open_creates_the_archive");
    let archive = HistDb::open(&path).unwrap();
    drop(archive);
    HistDb::open(&path).unwrap();
}

#[test]
fn open_returns_a_world_error_as_a_value() {
    let dir = format!("hist_db_{}_missing_directory", std::process::id());
    HistDb::open(&std::env::temp_dir().join(dir).join("tl.db")).unwrap_err();
}

#[test]
fn open_keeps_tl_schema() {
    let path = fresh_path("open_keeps_tl_schema");
    let archive = HistDb::open(&path).unwrap();
    drop(archive);
    let conn = rusqlite::Connection::open(&path).unwrap();
    let mode: String = conn
        .query_row("PRAGMA journal_mode", [], |row| row.get(0))
        .unwrap();
    assert_eq!(mode, "wal");
    let mut stmt = conn
        .prepare("SELECT type, name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name")
        .unwrap();
    let actual = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?.replace("IF NOT EXISTS ", ""),
            ))
        })
        .unwrap()
        .map(|row| row.unwrap())
        .collect::<Vec<(String, String, String)>>();
    let expected: Vec<(String, String, String)> = [
        (
            "index",
            "extractions_by_run",
            "CREATE INDEX extractions_by_run ON extractions(extractor_id, run)",
        ),
        (
            "index",
            "extractor_one_active",
            "CREATE UNIQUE INDEX extractor_one_active ON extractor(active) WHERE active = 1",
        ),
        (
            "table",
            "contents",
            "CREATE TABLE contents (\n  exchange_id TEXT PRIMARY KEY REFERENCES exchanges(id),\n  input       TEXT NOT NULL,\n  output      TEXT NOT NULL,\n  tools       TEXT\n)",
        ),
        (
            "table",
            "exchanges",
            "CREATE TABLE exchanges (\n  id        TEXT PRIMARY KEY,\n  session   TEXT REFERENCES sessions(id),\n  parent    TEXT REFERENCES exchanges(id),\n  timestamp TEXT NOT NULL,\n  kind      TEXT NOT NULL,\n  actor     TEXT NOT NULL,\n  model     TEXT,\n  tokens_in          INTEGER,\n  tokens_out         INTEGER,\n  tokens_cache_read  INTEGER,\n  tokens_cache_write INTEGER,\n  distilled TEXT,\n  meta      TEXT\n)",
        ),
        (
            "table",
            "extractions",
            "CREATE TABLE extractions (\n  id            INTEGER PRIMARY KEY AUTOINCREMENT,\n  extractor_id  INTEGER NOT NULL REFERENCES extractor(id),\n  run           TEXT NOT NULL,\n  exchange_id   TEXT NOT NULL REFERENCES exchanges(id),\n  kind          TEXT NOT NULL CHECK (kind IN ('note', 'rule')),\n  body          TEXT NOT NULL CHECK (json_valid(body)),\n  quote         TEXT NOT NULL,\n  dropped_by    TEXT,\n  probabilities TEXT CHECK (probabilities IS NULL OR json_valid(probabilities)),\n  verdict       TEXT,\n  of            TEXT,\n  saved_id      TEXT,\n  created       TEXT NOT NULL\n)",
        ),
        (
            "table",
            "extractor",
            "CREATE TABLE extractor (\n  id      INTEGER PRIMARY KEY AUTOINCREMENT,\n  parent  INTEGER REFERENCES extractor(id),\n  why     TEXT NOT NULL,\n  active  INTEGER NOT NULL DEFAULT 0 CHECK (active IN (0, 1)),\n  config  TEXT NOT NULL CHECK (json_valid(config)),\n  created TEXT NOT NULL\n)",
        ),
        (
            "table",
            "sessions",
            "CREATE TABLE sessions (\n  id        TEXT PRIMARY KEY,\n  started   TEXT NOT NULL,\n  harness   TEXT,\n  host      TEXT,\n  path      TEXT\n)",
        ),
    ]
    .into_iter()
    .map(|entry| (entry.0.to_string(), entry.1.to_string(), entry.2.to_string()))
    .collect();
    assert_eq!(actual, expected);
}

#[test]
fn open_adds_the_new_columns_to_an_old_archive() {
    let path = fresh_path("open_adds_the_new_columns_to_an_old_archive");
    {
        let conn = rusqlite::Connection::open(&path).unwrap();
        conn.execute_batch(
            "CREATE TABLE sessions (
  id        TEXT PRIMARY KEY,
  started   TEXT NOT NULL,
  host      TEXT,
  path      TEXT
);
CREATE TABLE contents (
  exchange_id TEXT PRIMARY KEY,
  input       TEXT NOT NULL,
  output      TEXT NOT NULL
);",
        )
        .unwrap();
    }
    let db = HistDb::open(&path).unwrap();
    db.upsert_sessions(&[session_row(SID1, T1, Some("claude"))])
        .unwrap();
    write_exchange(&db, XID1, SID1, T1, "chat");
    db.upsert_contents(&[contents_row(XID1, "in", "out", Some("a tool"))])
        .unwrap();
    let ids: Vec<String> = db
        .list_sessions(Some("claude"), 100)
        .unwrap()
        .into_iter()
        .map(|row| row.id)
        .collect();
    assert_eq!(ids, [SID1]);
    let row = db.get_contents(XID1, true).unwrap().expect("the contents");
    assert_eq!(row.tools.as_deref(), Some("a tool"));
}

#[test]
#[should_panic(expected = "HistDb.count: a known table")]
fn count_rejects_a_table_it_does_not_know() {
    let db = db("count_rejects_a_table_it_does_not_know");
    let _ = db.count("extractor");
}

#[test]
fn count_counts_every_table() {
    let db = db("count_counts_every_table");
    write_session(&db, SID1, T1);
    write_session(&db, SID2, T2);
    write_exchange(&db, XID1, SID1, T1, "chat");
    write_exchange(&db, XID2, SID1, T2, "subtask");
    write_exchange(&db, XID3, SID2, T3, "chat");
    db.upsert_contents(&[
        contents_row(XID1, "in", "out", None),
        contents_row(XID2, "in", "out", None),
    ])
    .unwrap();
    assert_eq!(db.count("sessions").unwrap(), 2);
    assert_eq!(db.count("exchanges").unwrap(), 3);
    assert_eq!(db.count("contents").unwrap(), 2);
}

#[test]
fn upsert_sessions_updates_the_row() {
    let db = db("upsert_sessions_updates_the_row");
    write_session(&db, SID1, T1);
    db.upsert_sessions(&[crate::hist::Session {
        id: SID1.into(),
        started: T3.into(),
        harness: Some("pi".into()),
        host: Some("box".into()),
        path: Some("/tmp/work".into()),
    }])
    .unwrap();
    let rows = db.list_sessions(None, 100).unwrap();
    assert_eq!(rows.len(), 1);
    let row = &rows[0];
    assert_eq!(row.id, SID1);
    assert_eq!(row.started, T3);
    assert_eq!(row.harness.as_deref(), Some("pi"));
    assert_eq!(row.host.as_deref(), Some("box"));
    assert_eq!(row.path.as_deref(), Some("/tmp/work"));
}

#[test]
fn list_sessions_orders_by_started_desc() {
    let db = sessions("list_sessions_orders_by_started_desc");
    let ids: Vec<String> = db
        .list_sessions(None, 100)
        .unwrap()
        .into_iter()
        .map(|row| row.id)
        .collect();
    assert_eq!(ids, [SID3, SID2, SID1]);
}

#[test]
fn list_sessions_filters_by_harness() {
    let db = db("list_sessions_filters_by_harness");
    db.upsert_sessions(&[
        session_row(SID1, T1, Some("claude")),
        session_row(SID2, T2, Some("pi")),
        session_row(SID3, T3, Some("claude")),
    ])
    .unwrap();
    let ids: Vec<String> = db
        .list_sessions(Some("claude"), 100)
        .unwrap()
        .into_iter()
        .map(|row| row.id)
        .collect();
    assert_eq!(ids, [SID3, SID1]);
}

#[test]
fn list_sessions_returns_at_most_limit_rows() {
    let db = sessions("list_sessions_returns_at_most_limit_rows");
    db.list_sessions(None, 2).unwrap();
}

#[test]
fn list_sessions_accepts_a_negative_limit() {
    let db = sessions("list_sessions_accepts_a_negative_limit");
    db.list_sessions(None, -1).unwrap();
}

#[test]
fn upsert_exchanges_updates_the_row_but_never_distilled() {
    let db = db("upsert_exchanges_updates_the_row_but_never_distilled");
    write_session(&db, SID1, T1);
    let first = crate::hist::Exchange {
        distilled: Some(T2.into()),
        meta: Some(serde_json::json!({"step": 1})),
        ..exchange_row(XID1, SID1, T1, "chat")
    };
    db.upsert_exchanges(&[first]).unwrap();
    let second = crate::hist::Exchange {
        model: Some("llama".into()),
        meta: Some(serde_json::json!({"step": 2})),
        distilled: Some(T3.into()),
        ..exchange_row(XID1, SID1, T3, "subtask")
    };
    db.upsert_exchanges(&[second]).unwrap();
    let row = db.get_exchange(XID1).unwrap().expect("the exchange");
    assert_eq!(row.distilled.as_deref(), Some(T2));
    assert_eq!(row.timestamp, T3);
    assert_eq!(row.kind, "subtask");
    assert_eq!(row.model.as_deref(), Some("llama"));
    assert_eq!(row.meta, Some(serde_json::json!({"step": 2})));
}

#[test]
fn a_failed_batch_writes_nothing() {
    let db = db("a_failed_batch_writes_nothing");
    write_session(&db, SID1, T1);
    let good = exchange_row(XID1, SID1, T1, "chat");
    let orphan = exchange_row(XID2, MISSING, T2, "chat");
    db.upsert_exchanges(&[good, orphan]).unwrap_err();
    assert_eq!(db.count("exchanges").unwrap(), 0);
}

#[test]
fn set_distilled_marks_and_clears_the_exchange() {
    let db = db("set_distilled_marks_and_clears_the_exchange");
    write_session(&db, SID1, T1);
    write_exchange(&db, XID1, SID1, T1, "chat");
    assert!(db.set_distilled(XID1, Some(T2)).unwrap());
    let row = db.get_exchange(XID1).unwrap().expect("the exchange");
    assert_eq!(row.distilled.as_deref(), Some(T2));
    assert!(db.set_distilled(XID1, None).unwrap());
    let row = db.get_exchange(XID1).unwrap().expect("the exchange");
    assert_eq!(row.distilled, None);
    assert!(!db.set_distilled(MISSING, Some(T2)).unwrap());
}

#[test]
fn get_exchange_missing_is_none() {
    let db = db("get_exchange_missing_is_none");
    assert_eq!(db.get_exchange(MISSING).unwrap(), None);
}
