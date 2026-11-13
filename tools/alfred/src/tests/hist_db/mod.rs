#[allow(unused_imports)]
pub(super) use crate::hist::db::HistDb;

pub(super) const SID1: &str = "11111111-1111-1111-1111-111111111111";

pub(super) const SID2: &str = "22222222-2222-2222-2222-222222222222";

pub(super) const SID3: &str = "33333333-3333-3333-3333-333333333333";

pub(super) const XID1: &str = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

pub(super) const XID2: &str = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

pub(super) const XID3: &str = "cccccccc-cccc-cccc-cccc-cccccccccccc";

pub(super) const MISSING: &str = "dddddddd-dddd-dddd-dddd-dddddddddddd";

pub(super) const T1: &str = "2026-01-02T03:04:05.678Z";

pub(super) const T2: &str = "2026-02-03T04:05:06.789Z";

pub(super) const T3: &str = "2026-03-04T05:06:07.890Z";

pub(super) fn fresh_path(name: &str) -> std::path::PathBuf {
    let mut path = std::env::temp_dir();
    path.push(format!("hist_db_{}_{}.db", std::process::id(), name));
    let _ = std::fs::remove_file(&path);
    let _ = std::fs::remove_file(path.with_extension("db-wal"));
    let _ = std::fs::remove_file(path.with_extension("db-shm"));
    path
}

pub(super) fn db(name: &str) -> HistDb {
    HistDb::open(&fresh_path(name)).unwrap()
}

pub(super) fn session_row(id: &str, started: &str, harness: Option<&str>) -> crate::hist::Session {
    crate::hist::Session {
        id: id.into(),
        started: started.into(),
        harness: harness.map(std::string::ToString::to_string),
        host: None,
        path: None,
    }
}

pub(super) fn exchange_row(
    id: &str,
    session: &str,
    timestamp: &str,
    kind: &str,
) -> crate::hist::Exchange {
    crate::hist::Exchange {
        id: id.into(),
        session: session.into(),
        parent: None,
        timestamp: timestamp.into(),
        kind: kind.into(),
        actor: "user".into(),
        model: None,
        tokens_in: None,
        tokens_out: None,
        tokens_cache_read: None,
        tokens_cache_write: None,
        distilled: None,
        meta: None,
    }
}

pub(super) fn contents_row(
    exchange_id: &str,
    input: &str,
    output: &str,
    tools: Option<&str>,
) -> crate::hist::Contents {
    crate::hist::Contents {
        exchange_id: exchange_id.into(),
        input: input.into(),
        output: output.into(),
        tools: tools.map(std::string::ToString::to_string),
    }
}

pub(super) fn extractor_row(why: &str) -> crate::hist::NewExtractor {
    crate::hist::NewExtractor {
        parent: None,
        why: why.into(),
        config: "{\"model\":\"llama\"}".into(),
        created: T1.into(),
    }
}

pub(super) fn extraction_row(
    extractor_id: i64,
    run: &str,
    exchange_id: &str,
    dropped_by: Option<&str>,
) -> crate::hist::NewExtraction {
    crate::hist::NewExtraction {
        extractor_id,
        run: run.into(),
        exchange_id: exchange_id.into(),
        kind: "note".into(),
        body: "{\"note\":true}".into(),
        quote: "a quote".into(),
        dropped_by: dropped_by.map(std::string::ToString::to_string),
        probabilities: None,
        verdict: if dropped_by.is_none() {
            Some("relevant".into())
        } else {
            None
        },
        of: None,
        saved_id: None,
        created: T1.into(),
    }
}

pub(super) fn exchange_query(
    session: Option<&str>,
    kind: Option<&str>,
    since: Option<&str>,
    until: Option<&str>,
) -> crate::hist::ExchangeQuery {
    crate::hist::ExchangeQuery {
        session: session.map(std::string::ToString::to_string),
        kind: kind.map(std::string::ToString::to_string),
        since: since.map(std::string::ToString::to_string),
        until: until.map(std::string::ToString::to_string),
        distilled: None,
        limit: None,
    }
}

pub(super) fn extraction_query(
    extractor_id: Option<i64>,
    run: Option<&str>,
    exchange_id: Option<&str>,
    kept: Option<bool>,
) -> crate::hist::ExtractionQuery {
    crate::hist::ExtractionQuery {
        extractor_id: extractor_id.map(|value| value.to_string()),
        run: run.map(std::string::ToString::to_string),
        exchange_id: exchange_id.map(std::string::ToString::to_string),
        kept: kept.map(|value| value.to_string()),
    }
}

pub(super) fn write_session(db: &HistDb, id: &str, started: &str) {
    db.upsert_sessions(&[session_row(id, started, None)])
        .unwrap();
}

pub(super) fn write_exchange(db: &HistDb, id: &str, session: &str, timestamp: &str, kind: &str) {
    db.upsert_exchanges(&[exchange_row(id, session, timestamp, kind)])
        .unwrap();
}

mod list_exchanges;
mod list_extractions;
mod open_creates;

pub(super) fn chats(name: &str) -> HistDb {
    let db = db(name);
    write_session(&db, SID1, T1);
    for (id, at) in [(XID1, T1), (XID2, T2), (XID3, T3)] {
        write_exchange(&db, id, SID1, at, "chat");
    }
    db
}

pub(super) fn sessions(name: &str) -> HistDb {
    let db = db(name);
    for (id, at) in [(SID1, T1), (SID2, T2), (SID3, T3)] {
        write_session(&db, id, at);
    }
    db
}

pub(super) fn listed(
    db: &HistDb,
    query: &crate::hist::ExchangeQuery,
    distilled: Option<bool>,
) -> Vec<String> {
    let rows = db.list_exchanges(query, distilled, 100).unwrap();
    rows.into_iter().map(|row| row.id).collect()
}
