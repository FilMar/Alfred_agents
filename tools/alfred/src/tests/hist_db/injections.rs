fn an_injections_archive(name: &str) -> crate::hist::db::HistDb {
    let path = std::env::temp_dir().join(format!("hist_inj_{}_{}.db", std::process::id(), name));
    let _ = std::fs::remove_file(&path);
    crate::hist::db::HistDb::open(&path).unwrap()
}

fn an_injections_archive_with_exchanges(
    name: &str,
    exchange_ids: &[&str],
) -> crate::hist::db::HistDb {
    let db = an_injections_archive(name);
    let session = "11111111-1111-1111-1111-111111111111";
    db.upsert_sessions(&[crate::hist::Session {
        id: session.to_string(),
        started: "2026-01-02T03:04:05.678Z".to_string(),
        harness: None,
        host: None,
        path: None,
    }])
    .unwrap();
    let exchanges: Vec<crate::hist::Exchange> = exchange_ids
        .iter()
        .map(|id| crate::hist::Exchange {
            id: id.to_string(),
            session: session.to_string(),
            parent: None,
            timestamp: "2026-01-02T03:04:05.678Z".to_string(),
            kind: "chat".into(),
            actor: "alfredo".into(),
            model: None,
            tokens_in: None,
            tokens_out: None,
            tokens_cache_read: None,
            tokens_cache_write: None,
            distilled: None,
            meta: None,
        })
        .collect();
    db.upsert_exchanges(&exchanges).unwrap();
    db
}

#[test]
fn upsert_injections_writes_one_row_per_row() {
    let exchange = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    let db = an_injections_archive_with_exchanges(
        "upsert_injections_writes_one_row_per_row",
        &[exchange],
    );
    let _ = db.upsert_injections(&[
        crate::hist::Injection {
            exchange_id: exchange.to_string(),
            kind: "rule".into(),
            reference: "9d3685f9".into(),
            text: "prima azione\nseconda azione".into(),
        },
        crate::hist::Injection {
            exchange_id: exchange.to_string(),
            kind: "rule".into(),
            reference: "58708950".into(),
            text: "altra azione".into(),
        },
    ]);
}

#[test]
fn upsert_injections_puts_every_row_in_the_table() {
    let first = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    let second = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
    let db = an_injections_archive_with_exchanges(
        "upsert_injections_puts_every_row_in_the_table",
        &[first, second],
    );
    let _ = db.upsert_injections(&[
        crate::hist::Injection {
            exchange_id: first.to_string(),
            kind: "rule".into(),
            reference: "9d3685f9".into(),
            text: "prima azione\nseconda azione".into(),
        },
        crate::hist::Injection {
            exchange_id: second.to_string(),
            kind: "rule".into(),
            reference: "9d3685f9".into(),
            text: "altra azione".into(),
        },
    ]);
}

#[test]
fn upsert_injections_with_no_rows_writes_nothing() {
    let db = an_injections_archive("upsert_injections_with_no_rows_writes_nothing");
    let _ = db.upsert_injections(&[]);
}

#[test]
fn upsert_injections_with_a_missing_exchange_returns_an_error() {
    let db = an_injections_archive("upsert_injections_with_a_missing_exchange_returns_an_error");
    let _ = db.upsert_injections(&[crate::hist::Injection {
        exchange_id: "cccccccc-cccc-cccc-cccc-cccccccccccc".to_string(),
        kind: "rule".into(),
        reference: "9d3685f9".into(),
        text: "prima azione\nseconda azione".into(),
    }]);
}

#[test]
fn upsert_injections_replaces_the_text_on_a_second_write() {
    let exchange = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    let db = an_injections_archive_with_exchanges(
        "upsert_injections_replaces_the_text_on_a_second_write",
        &[exchange],
    );
    let _ = db.upsert_injections(&[crate::hist::Injection {
        exchange_id: exchange.to_string(),
        kind: "rule".into(),
        reference: "9d3685f9".into(),
        text: "prima azione".into(),
    }]);
    let _ = db.upsert_injections(&[crate::hist::Injection {
        exchange_id: exchange.to_string(),
        kind: "rule".into(),
        reference: "9d3685f9".into(),
        text: "seconda azione".into(),
    }]);
    assert!(!db.has_injection(&crate::hist::Injection {
        exchange_id: exchange.to_string(),
        kind: "rule".into(),
        reference: "9d3685f9".into(),
        text: "prima azione".into(),
    }));
    assert!(db.has_injection(&crate::hist::Injection {
        exchange_id: exchange.to_string(),
        kind: "rule".into(),
        reference: "9d3685f9".into(),
        text: "seconda azione".into(),
    }));
}

#[test]
fn has_injection_matches_the_whole_key_and_the_text() {
    let first = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    let second = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
    let db = an_injections_archive_with_exchanges(
        "has_injection_matches_the_whole_key_and_the_text",
        &[first, second],
    );
    let _ = db.upsert_injections(&[crate::hist::Injection {
        exchange_id: first.to_string(),
        kind: "rule".into(),
        reference: "9d3685f9".into(),
        text: "prima azione\nseconda azione".into(),
    }]);
    assert!(db.has_injection(&crate::hist::Injection {
        exchange_id: first.to_string(),
        kind: "rule".into(),
        reference: "9d3685f9".into(),
        text: "prima azione\nseconda azione".into(),
    }));
    assert!(!db.has_injection(&crate::hist::Injection {
        exchange_id: first.to_string(),
        kind: "rule".into(),
        reference: "9d3685f9".into(),
        text: "altra azione".into(),
    }));
    assert!(!db.has_injection(&crate::hist::Injection {
        exchange_id: first.to_string(),
        kind: "rule".into(),
        reference: "58708950".into(),
        text: "prima azione\nseconda azione".into(),
    }));
    assert!(!db.has_injection(&crate::hist::Injection {
        exchange_id: first.to_string(),
        kind: "note".into(),
        reference: "9d3685f9".into(),
        text: "prima azione\nseconda azione".into(),
    }));
    assert!(!db.has_injection(&crate::hist::Injection {
        exchange_id: second.to_string(),
        kind: "rule".into(),
        reference: "9d3685f9".into(),
        text: "prima azione\nseconda azione".into(),
    }));
}
