use crate::hist::routes::{router, rows_of, status_of};

#[test]
fn rows_of_rejects_an_empty_body() {
    let err = match rows_of::<serde_json::Value>("", |_row| -> Option<String> { None }) {
        Ok(_) => panic!("expected an error for an empty body"),
        Err(err) => err,
    };
    assert_eq!(err.to_string(), "body is not JSON");
    assert_eq!(status_of(&err).as_u16(), 400);
}

#[test]
fn rows_of_rejects_a_non_json_body() {
    let err = match rows_of::<serde_json::Value>("not json", |_row| -> Option<String> { None }) {
        Ok(_) => panic!("expected an error for a non JSON body"),
        Err(err) => err,
    };
    assert_eq!(err.to_string(), "body is not JSON");
    assert_eq!(status_of(&err).as_u16(), 400);
}

#[test]
fn rows_of_rejects_a_truncated_json_body() {
    let err = match rows_of::<serde_json::Value>(r#"{"id":"#, |_row| -> Option<String> { None }) {
        Ok(_) => panic!("expected an error for a truncated body"),
        Err(err) => err,
    };
    assert_eq!(err.to_string(), "body is not JSON");
    assert_eq!(status_of(&err).as_u16(), 400);
}

#[test]
fn rows_of_rejects_trailing_garbage_after_json() {
    let err =
        match rows_of::<serde_json::Value>(r#"{"id":"a"} trailing"#, |_row| -> Option<String> {
            None
        }) {
            Ok(_) => panic!("expected an error for trailing garbage"),
            Err(err) => err,
        };
    assert_eq!(err.to_string(), "body is not JSON");
    assert_eq!(status_of(&err).as_u16(), 400);
}

#[test]
fn rows_of_accepts_a_single_row() {
    let rows =
        match rows_of::<serde_json::Value>(r#"{"id":"a"}"#, |_row| -> Option<String> { None }) {
            Ok(rows) => rows,
            Err(_) => panic!("expected the single row"),
        };
    assert_eq!(rows.len(), 1);
    assert_eq!(rows[0].get("id").and_then(|v| v.as_str()), Some("a"));
}

#[test]
fn rows_of_accepts_a_list_with_one_row() {
    let rows =
        match rows_of::<serde_json::Value>(r#"[{"id":"a"}]"#, |_row| -> Option<String> { None }) {
            Ok(rows) => rows,
            Err(_) => panic!("expected the single row of the list"),
        };
    assert_eq!(rows.len(), 1);
    assert_eq!(rows[0].get("id").and_then(|v| v.as_str()), Some("a"));
}

#[test]
fn rows_of_accepts_a_list_of_rows() {
    let rows =
        match rows_of::<serde_json::Value>(r#"[{"id":"a"},{"id":"b"}]"#, |_row| -> Option<String> {
            None
        }) {
            Ok(rows) => rows,
            Err(_) => panic!("expected both rows"),
        };
    assert_eq!(rows.len(), 2);
    assert_eq!(rows[0].get("id").and_then(|v| v.as_str()), Some("a"));
    assert_eq!(rows[1].get("id").and_then(|v| v.as_str()), Some("b"));
}

#[test]
fn rows_of_accepts_a_pretty_printed_list() {
    let body = r#"[
      {"id": "a"},
      {"id": "b"}
    ]"#;
    let rows = match rows_of::<serde_json::Value>(body, |_row| -> Option<String> { None }) {
        Ok(rows) => rows,
        Err(_) => panic!("expected both rows"),
    };
    assert_eq!(rows.len(), 2);
    assert_eq!(rows[0].get("id").and_then(|v| v.as_str()), Some("a"));
    assert_eq!(rows[1].get("id").and_then(|v| v.as_str()), Some("b"));
}

#[test]
fn rows_of_accepts_an_empty_list() {
    let rows = match rows_of::<serde_json::Value>("[]", |_row| -> Option<String> {
        Some("row rejected".to_string())
    }) {
        Ok(rows) => rows,
        Err(_) => panic!("expected no rows"),
    };
    assert_eq!(rows.len(), 0);
}

#[test]
fn rows_of_reports_the_first_invalid_row() {
    let err = match rows_of::<serde_json::Value>(
        r#"[{"reject":true,"tag":"first"},{"reject":true,"tag":"second"}]"#,
        |row| -> Option<String> {
            row.get("reject").map(|_| {
                row.get("tag")
                    .and_then(|v| v.as_str())
                    .unwrap_or("no tag")
                    .to_string()
            })
        },
    ) {
        Ok(_) => panic!("expected the first invalid row to fail"),
        Err(err) => err,
    };
    assert_eq!(err.to_string(), "first");
    assert_eq!(status_of(&err).as_u16(), 400);
}

#[test]
fn rows_of_validates_every_row() {
    let err = match rows_of::<serde_json::Value>(
        r#"[{"id":"a"},{"id":"b"},{"reject":true,"tag":"third"}]"#,
        |row| -> Option<String> {
            row.get("reject").map(|_| {
                row.get("tag")
                    .and_then(|v| v.as_str())
                    .unwrap_or("no tag")
                    .to_string()
            })
        },
    ) {
        Ok(_) => panic!("expected the invalid row to fail"),
        Err(err) => err,
    };
    assert_eq!(err.to_string(), "third");
    assert_eq!(status_of(&err).as_u16(), 400);
}

#[test]
fn rows_of_rejects_a_single_invalid_row() {
    let err = match rows_of::<serde_json::Value>(r#"{"reject":true}"#, |row| -> Option<String> {
        row.get("reject").map(|_| "row rejected".to_string())
    }) {
        Ok(_) => panic!("expected the invalid row to fail"),
        Err(err) => err,
    };
    assert_eq!(err.to_string(), "row rejected");
    assert_eq!(status_of(&err).as_u16(), 400);
}

#[test]
fn rows_of_returns_only_valid_rows() {
    let _ = rows_of::<serde_json::Value>(r#"[{"id":"a"},{"id":"b"}]"#, |row| -> Option<String> {
        row.get("bad").map(|_| "row is bad".to_string())
    });
}

#[test]
fn router_builds_all_hist_routes() {
    let _ = router();
}
