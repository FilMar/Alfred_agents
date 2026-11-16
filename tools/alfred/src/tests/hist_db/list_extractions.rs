#[allow(unused_imports)]
use super::*;

#[test]
fn list_extractions_kept_means_not_dropped() {
    let db = db("list_extractions_kept_means_not_dropped");
    let extractor_id = db
        .insert_extractor(&extractor_row("the first extractor"))
        .unwrap();
    write_session(&db, SID1, T1);
    write_exchange(&db, XID1, SID1, T1, "chat");
    db.insert_extractions(&[
        extraction_row(extractor_id, "run one", XID1, None),
        extraction_row(extractor_id, "run one", XID1, Some("check:off-topic")),
    ])
    .unwrap();
    let rows = db
        .list_extractions(&extraction_query(None, None, None, Some(true)))
        .unwrap();
    assert_eq!(rows.len(), 1);
    assert_eq!(rows[0].row.dropped_by, None);
    let rows = db
        .list_extractions(&extraction_query(None, None, None, Some(false)))
        .unwrap();
    assert_eq!(rows.len(), 1);
    assert_eq!(rows[0].row.dropped_by.as_deref(), Some("check:off-topic"));
}

#[test]
fn list_extractions_filters_by_extractor_run_and_exchange() {
    let db = db("list_extractions_filters_by_extractor_run_and_exchange");
    let first = db
        .insert_extractor(&extractor_row("the first extractor"))
        .unwrap();
    let second = db
        .insert_extractor(&extractor_row("the second extractor"))
        .unwrap();
    write_session(&db, SID1, T1);
    write_exchange(&db, XID1, SID1, T1, "chat");
    write_exchange(&db, XID2, SID1, T2, "chat");
    db.insert_extractions(&[
        extraction_row(first, "run one", XID1, None),
        extraction_row(first, "run two", XID1, None),
        extraction_row(second, "run one", XID2, None),
    ])
    .unwrap();
    let rows = db
        .list_extractions(&extraction_query(Some(first), None, None, None))
        .unwrap();
    assert_eq!(rows.len(), 2);
    let rows = db
        .list_extractions(&extraction_query(None, Some("run two"), None, None))
        .unwrap();
    assert_eq!(rows.len(), 1);
    assert_eq!(rows[0].row.exchange_id, XID1);
    let rows = db
        .list_extractions(&extraction_query(None, None, Some(XID2), None))
        .unwrap();
    assert_eq!(rows.len(), 1);
    assert_eq!(rows[0].row.extractor_id, second);
}
