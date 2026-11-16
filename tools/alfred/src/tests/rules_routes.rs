use crate::rules::routes::{NearQuery, TagsQuery, router, status_of};

#[test]
fn router_wires_the_rules_routes() {
    let _: axum::Router<crate::serve::Shared> = router();
}

#[test]
fn tags_query_takes_tags_or_nothing() {
    let empty: TagsQuery = serde_json::from_str("{}").unwrap();
    assert_eq!(empty.tags, None);
    let tagged: TagsQuery = serde_json::from_str(r#"{"tags":"one, two"}"#).unwrap();
    assert_eq!(tagged.tags.as_deref(), Some("one, two"));
}

#[test]
fn near_query_takes_min_and_optional_limit() {
    let bare: NearQuery = serde_json::from_str(r#"{"min": 0.5}"#).unwrap();
    assert_eq!(bare.min, 0.5);
    assert_eq!(bare.limit, None);
    let full: NearQuery = serde_json::from_str(r#"{"min": 0.5, "limit": 3}"#).unwrap();
    assert_eq!(full.min, 0.5);
    assert_eq!(full.limit, Some(3));
}

#[test]
fn near_query_holds_the_edges_of_its_inputs() {
    let bottom: NearQuery = serde_json::from_str(r#"{"min": -1}"#).unwrap();
    assert_eq!(bottom.min, -1.0);
    let top: NearQuery = serde_json::from_str(r#"{"min": 1}"#).unwrap();
    assert_eq!(top.min, 1.0);
    serde_json::from_str::<NearQuery>(r#"{"min": -1.1}"#).unwrap();
    serde_json::from_str::<NearQuery>(r#"{"min": 1.1}"#).unwrap();
    let first: NearQuery = serde_json::from_str(r#"{"min": 0, "limit": 1}"#).unwrap();
    assert_eq!(first.limit, Some(1));
    let zero: NearQuery = serde_json::from_str(r#"{"min": 0, "limit": 0}"#).unwrap();
    assert_eq!(zero.limit, Some(0));
}

#[test]
fn near_query_rejects_a_missing_min() {
    serde_json::from_str::<NearQuery>("{}").unwrap_err();
}

#[test]
fn near_query_rejects_a_text_min() {
    serde_json::from_str::<NearQuery>(r#"{"min": "zero"}"#).unwrap_err();
}

#[test]
fn status_of_marks_an_ambiguous_prefix_as_conflict() {
    let error = crate::rules::RulesError::Ambiguous {
        prefix: "ab".to_string(),
        count: 2,
        ids: vec![
            "ab12cd34-0000-0000-0000-000000000001".to_string(),
            "ab12cd34-0000-0000-0000-000000000002".to_string(),
        ],
    };
    assert_eq!(status_of(&error), axum::http::StatusCode::CONFLICT);
}

#[test]
fn an_ambiguous_prefix_carries_the_candidates_in_paths() {
    let ids = vec![
        "ab12cd34-0000-0000-0000-000000000001".to_string(),
        "ab12cd34-0000-0000-0000-000000000002".to_string(),
        "ab12cd34-0000-0000-0000-000000000003".to_string(),
    ];
    let error = crate::rules::RulesError::Ambiguous {
        prefix: "ab".to_string(),
        count: 3,
        ids: ids.clone(),
    };
    let message = error.to_string();
    let api = crate::serve::ApiError::from(error);
    assert_eq!(api.status, axum::http::StatusCode::CONFLICT);
    assert_eq!(api.reply.paths, ids);
    assert_eq!(api.reply.error, message);
}
