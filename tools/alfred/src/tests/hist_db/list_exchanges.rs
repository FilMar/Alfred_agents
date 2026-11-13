#[allow(unused_imports)]
use super::*;

#[test]
fn list_exchanges_orders_by_timestamp_desc() {
    let db = chats("list_exchanges_orders_by_timestamp_desc");
    assert_eq!(
        listed(&db, &exchange_query(None, None, None, None), None),
        [XID3, XID2, XID1]
    );
}

#[test]
fn list_exchanges_filters_by_session() {
    let db = db("list_exchanges_filters_by_session");
    write_session(&db, SID1, T1);
    write_session(&db, SID2, T1);
    write_exchange(&db, XID1, SID1, T1, "chat");
    write_exchange(&db, XID2, SID2, T2, "chat");
    assert_eq!(
        listed(&db, &exchange_query(Some(SID2), None, None, None), None),
        [XID2]
    );
}

#[test]
fn list_exchanges_filters_by_kind() {
    let db = db("list_exchanges_filters_by_kind");
    write_session(&db, SID1, T1);
    write_exchange(&db, XID1, SID1, T1, "chat");
    write_exchange(&db, XID2, SID1, T2, "subtask");
    write_exchange(&db, XID3, SID1, T3, "chat");
    assert_eq!(
        listed(
            &db,
            &exchange_query(None, Some("subtask"), None, None),
            None
        ),
        [XID2]
    );
}

#[test]
fn list_exchanges_filters_by_since_and_until() {
    let db = chats("list_exchanges_filters_by_since_and_until");
    assert_eq!(
        listed(&db, &exchange_query(None, None, Some(T2), None), None),
        [XID3, XID2]
    );
    assert_eq!(
        listed(&db, &exchange_query(None, None, None, Some(T2)), None),
        [XID2, XID1]
    );
}

#[test]
fn list_exchanges_filters_by_distilled() {
    let db = db("list_exchanges_filters_by_distilled");
    write_session(&db, SID1, T1);
    let mut marked = exchange_row(XID1, SID1, T1, "chat");
    marked.distilled = Some(T3.into());
    db.upsert_exchanges(&[marked]).unwrap();
    write_exchange(&db, XID2, SID1, T2, "chat");
    write_exchange(&db, XID3, SID1, T3, "chat");
    assert_eq!(
        listed(&db, &exchange_query(None, None, None, None), Some(true)),
        [XID1]
    );
    assert_eq!(
        listed(&db, &exchange_query(None, None, None, None), Some(false)),
        [XID3, XID2]
    );
    assert_eq!(
        listed(&db, &exchange_query(None, None, None, None), None),
        [XID3, XID2, XID1]
    );
}

#[test]
fn list_exchanges_returns_at_most_limit_rows() {
    let db = chats("list_exchanges_returns_at_most_limit_rows");
    db.list_exchanges(&exchange_query(None, None, None, None), None, 2)
        .unwrap();
}

#[test]
fn list_exchanges_accepts_a_negative_limit() {
    let db = chats("list_exchanges_accepts_a_negative_limit");
    db.list_exchanges(&exchange_query(None, None, None, None), None, -1)
        .unwrap();
}

#[test]
fn upsert_contents_updates_the_row() {
    let db = db("upsert_contents_updates_the_row");
    write_session(&db, SID1, T1);
    write_exchange(&db, XID1, SID1, T1, "chat");
    db.upsert_contents(&[contents_row(
        XID1,
        "first question",
        "first answer",
        Some("first tool"),
    )])
    .unwrap();
    db.upsert_contents(&[contents_row(
        XID1,
        "second question",
        "second answer",
        Some("second tool"),
    )])
    .unwrap();
    let row = db.get_contents(XID1, true).unwrap().expect("the contents");
    assert_eq!(row.input, "second question");
    assert_eq!(row.output, "second answer");
    assert_eq!(row.tools.as_deref(), Some("second tool"));
}

#[test]
fn get_contents_hides_tools_unless_asked() {
    let db = db("get_contents_hides_tools_unless_asked");
    write_session(&db, SID1, T1);
    write_exchange(&db, XID1, SID1, T1, "chat");
    db.upsert_contents(&[contents_row(XID1, "in", "out", Some("a tool"))])
        .unwrap();
    db.get_contents(XID1, false).unwrap();
}

#[test]
fn get_contents_missing_is_none() {
    let db = db("get_contents_missing_is_none");
    assert_eq!(db.get_contents(MISSING, true).unwrap(), None);
}

#[test]
fn a_new_extractor_is_not_active() {
    let db = db("a_new_extractor_is_not_active");
    let id = db
        .insert_extractor(&extractor_row("the first extractor"))
        .unwrap();
    let row = db.get_extractor(Some(id)).unwrap().expect("the extractor");
    assert_eq!(row.id, id);
    assert!(!row.active);
}

#[test]
fn get_extractor_without_id_returns_the_active_row() {
    let db = db("get_extractor_without_id_returns_the_active_row");
    let first = db
        .insert_extractor(&extractor_row("the first extractor"))
        .unwrap();
    let second = db
        .insert_extractor(&extractor_row("the second extractor"))
        .unwrap();
    db.set_active_extractor(second).unwrap();
    let row = db
        .get_extractor(None)
        .unwrap()
        .expect("the active extractor");
    assert_eq!(row.id, second);
    assert!(row.active);
    let row = db
        .get_extractor(Some(first))
        .unwrap()
        .expect("the first extractor");
    assert!(!row.active);
}

#[test]
fn get_extractor_missing_is_none() {
    let db = db("get_extractor_missing_is_none");
    db.insert_extractor(&extractor_row("the first extractor"))
        .unwrap();
    assert_eq!(db.get_extractor(Some(999)).unwrap(), None);
    assert_eq!(db.get_extractor(None).unwrap(), None);
}

#[test]
fn set_active_extractor_reports_a_missing_row() {
    let db = db("set_active_extractor_reports_a_missing_row");
    assert!(!db.set_active_extractor(999).unwrap());
}

#[test]
fn set_active_extractor_switches_the_active_row() {
    let db = db("set_active_extractor_switches_the_active_row");
    let first = db
        .insert_extractor(&extractor_row("the first extractor"))
        .unwrap();
    let second = db
        .insert_extractor(&extractor_row("the second extractor"))
        .unwrap();
    assert!(db.set_active_extractor(first).unwrap());
    assert!(db.set_active_extractor(second).unwrap());
    assert_eq!(
        db.get_extractor(None).unwrap().map(|row| row.id),
        Some(second)
    );
}

#[test]
fn list_extractions_lists_every_row_in_id_order() {
    let db = db("list_extractions_lists_every_row_in_id_order");
    let extractor_id = db
        .insert_extractor(&extractor_row("the first extractor"))
        .unwrap();
    write_session(&db, SID1, T1);
    write_exchange(&db, XID1, SID1, T1, "chat");
    db.insert_extractions(&[
        extraction_row(extractor_id, "run one", XID1, None),
        extraction_row(extractor_id, "run one", XID1, Some("check:off-topic")),
        extraction_row(extractor_id, "run two", XID1, None),
    ])
    .unwrap();
    let rows = db
        .list_extractions(&extraction_query(None, None, None, None))
        .unwrap();
    assert_eq!(rows.len(), 3);
}
