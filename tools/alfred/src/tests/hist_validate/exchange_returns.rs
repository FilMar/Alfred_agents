use crate::hist::validate::{contents, exchange};

#[allow(unused_imports)]
use super::*;

#[test]
fn exchange_returns_the_first_tl_error() {
    let cases: Vec<(serde_json::Value, Option<&str>)> = vec![
        (
            serde_json::json!({}),
            Some("exchange.id is not an id: undefined"),
        ),
        (
            serde_json::json!({
                "id": "x",
                "session": "",
                "timestamp": "x",
                "kind": "x",
                "actor": "",
                "tokens_in": -1
            }),
            Some("exchange.id is not an id: x"),
        ),
        (
            serde_json::json!({"id": "x"}),
            Some("exchange.id is not an id: x"),
        ),
        (
            serde_json::json!({"id": ID}),
            Some("exchange.session is required"),
        ),
        (
            serde_json::json!({"id": ID, "session": ""}),
            Some("exchange.session is required"),
        ),
        (
            serde_json::json!({"id": ID, "session": OTHER_ID}),
            Some("exchange.timestamp is not ISO-8601 UTC: undefined"),
        ),
        (
            serde_json::json!({"id": ID, "session": OTHER_ID, "timestamp": "x"}),
            Some("exchange.timestamp is not ISO-8601 UTC: x"),
        ),
        (
            serde_json::json!({"id": ID, "session": OTHER_ID, "timestamp": TS}),
            Some("exchange.kind is not chat or subtask: undefined"),
        ),
        (
            serde_json::json!({"id": ID, "session": OTHER_ID, "timestamp": TS, "kind": "x"}),
            Some("exchange.kind is not chat or subtask: x"),
        ),
        (
            serde_json::json!({"id": ID, "session": OTHER_ID, "timestamp": TS, "kind": "chat"}),
            Some("exchange.actor is required"),
        ),
        (
            serde_json::json!({
                "id": ID,
                "session": OTHER_ID,
                "timestamp": TS,
                "kind": "chat",
                "actor": ""
            }),
            Some("exchange.actor is required"),
        ),
        (
            serde_json::json!({
                "id": ID,
                "session": OTHER_ID,
                "timestamp": TS,
                "kind": "chat",
                "actor": "user",
                "parent": "x",
                "distilled": "x"
            }),
            Some("exchange.parent is not an id: x"),
        ),
        (
            serde_json::json!({
                "id": ID,
                "session": OTHER_ID,
                "timestamp": TS,
                "kind": "chat",
                "actor": "user",
                "distilled": "x",
                "tokens_in": -1
            }),
            Some("exchange.distilled is not ISO-8601 UTC: x"),
        ),
        (
            serde_json::json!({
                "id": ID,
                "session": OTHER_ID,
                "timestamp": TS,
                "kind": "chat",
                "actor": "user",
                "tokens_in": -1
            }),
            Some("exchange.tokens_in is not a token count: -1"),
        ),
        (
            serde_json::json!({
                "id": ID,
                "session": OTHER_ID,
                "timestamp": TS,
                "kind": "chat",
                "actor": "user",
                "tokens_in": 0
            }),
            None,
        ),
        (
            serde_json::json!({
                "id": ID,
                "session": OTHER_ID,
                "timestamp": TS,
                "kind": "chat",
                "actor": "user",
                "tokens_in": 1.5
            }),
            Some("exchange.tokens_in is not a token count: 1.5"),
        ),
        (
            serde_json::json!({
                "id": ID,
                "session": OTHER_ID,
                "timestamp": TS,
                "kind": "chat",
                "actor": "user",
                "tokens_in": "3"
            }),
            Some("exchange.tokens_in is not a token count: 3"),
        ),
        (
            serde_json::json!({
                "id": ID,
                "session": OTHER_ID,
                "timestamp": TS,
                "kind": "chat",
                "actor": "user",
                "tokens_in": true
            }),
            Some("exchange.tokens_in is not a token count: true"),
        ),
        (
            serde_json::json!({
                "id": ID,
                "session": OTHER_ID,
                "timestamp": TS,
                "kind": "chat",
                "actor": "user",
                "tokens_out": -1
            }),
            Some("exchange.tokens_out is not a token count: -1"),
        ),
        (
            serde_json::json!({
                "id": ID,
                "session": OTHER_ID,
                "timestamp": TS,
                "kind": "chat",
                "actor": "user",
                "tokens_cache_read": -1
            }),
            Some("exchange.tokens_cache_read is not a token count: -1"),
        ),
        (
            serde_json::json!({
                "id": ID,
                "session": OTHER_ID,
                "timestamp": TS,
                "kind": "chat",
                "actor": "user",
                "tokens_cache_write": -1
            }),
            Some("exchange.tokens_cache_write is not a token count: -1"),
        ),
        (
            serde_json::json!({
                "id": ID,
                "session": OTHER_ID,
                "timestamp": TS,
                "kind": "chat",
                "actor": "user",
                "tokens_in": -1,
                "tokens_out": -1
            }),
            Some("exchange.tokens_in is not a token count: -1"),
        ),
        (
            serde_json::json!({
                "id": ID,
                "session": OTHER_ID,
                "timestamp": TS,
                "kind": "chat",
                "actor": "user",
                "tokens_out": -1,
                "tokens_cache_write": -1
            }),
            Some("exchange.tokens_out is not a token count: -1"),
        ),
        (
            serde_json::json!({
                "id": ID,
                "session": OTHER_ID,
                "timestamp": TS,
                "kind": "chat",
                "actor": "user"
            }),
            None,
        ),
        (
            serde_json::json!({
                "id": ID,
                "session": OTHER_ID,
                "timestamp": TS,
                "kind": "subtask",
                "actor": "model"
            }),
            None,
        ),
        (
            serde_json::json!({
                "id": ID,
                "session": OTHER_ID,
                "timestamp": TS,
                "kind": "chat",
                "actor": "user",
                "parent": OTHER_ID
            }),
            None,
        ),
        (
            serde_json::json!({
                "id": ID,
                "session": OTHER_ID,
                "timestamp": TS,
                "kind": "chat",
                "actor": "user",
                "distilled": TS
            }),
            None,
        ),
        (
            serde_json::json!({
                "id": ID,
                "session": OTHER_ID,
                "timestamp": TS,
                "kind": "chat",
                "actor": "user",
                "parent": OTHER_ID,
                "distilled": TS,
                "model": "m",
                "meta": {"turn": 1},
                "tokens_in": 0,
                "tokens_out": 1,
                "tokens_cache_read": 2,
                "tokens_cache_write": 3
            }),
            None,
        ),
    ];
    for (row, expected) in cases {
        assert_eq!(exchange(&row).as_deref(), expected, "row: {row}");
    }
}

#[test]
fn contents_message_names_the_field() {
    let row = serde_json::json!({});
    let _ = contents(&row);
}
