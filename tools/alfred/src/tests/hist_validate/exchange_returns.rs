use crate::hist::validate::exchange;

#[allow(unused_imports)]
use super::*;

#[test]
fn exchange_returns_the_first_tl_error() {
    let cases = [
        (json!({}), Some("exchange.id is not an id: undefined")),
        (
            json!({"id": "x", "session": "", "timestamp": "x", "kind": "x", "actor": "", "tokens_in": -1}),
            Some("exchange.id is not an id: x"),
        ),
        (json!({"id": "x"}), Some("exchange.id is not an id: x")),
        (json!({"id": ID}), Some("exchange.session is required")),
        (
            json!({"id": ID, "session": ""}),
            Some("exchange.session is required"),
        ),
        (
            json!({"id": ID, "session": OTHER_ID}),
            Some("exchange.timestamp is not ISO-8601 UTC: undefined"),
        ),
        (
            json!({"id": ID, "session": OTHER_ID, "timestamp": "x"}),
            Some("exchange.timestamp is not ISO-8601 UTC: x"),
        ),
        (
            json!({"id": ID, "session": OTHER_ID, "timestamp": TS}),
            Some("exchange.kind is not chat or subtask: undefined"),
        ),
        (
            json!({"id": ID, "session": OTHER_ID, "timestamp": TS, "kind": "x"}),
            Some("exchange.kind is not chat or subtask: x"),
        ),
        (
            json!({"id": ID, "session": OTHER_ID, "timestamp": TS, "kind": "chat"}),
            Some("exchange.actor is required"),
        ),
        (
            json!({"id": ID, "session": OTHER_ID, "timestamp": TS, "kind": "chat", "actor": ""}),
            Some("exchange.actor is required"),
        ),
        (
            exchange_row(json!({"parent": "x", "distilled": "x"})),
            Some("exchange.parent is not an id: x"),
        ),
        (
            exchange_row(json!({"distilled": "x", "tokens_in": -1})),
            Some("exchange.distilled is not ISO-8601 UTC: x"),
        ),
        (
            exchange_row(json!({"tokens_in": -1})),
            Some("exchange.tokens_in is not a token count: -1"),
        ),
        (exchange_row(json!({"tokens_in": 0})), None),
        (
            exchange_row(json!({"tokens_in": 1.5})),
            Some("exchange.tokens_in is not a token count: 1.5"),
        ),
        (
            exchange_row(json!({"tokens_in": "3"})),
            Some("exchange.tokens_in is not a token count: 3"),
        ),
        (
            exchange_row(json!({"tokens_in": true})),
            Some("exchange.tokens_in is not a token count: true"),
        ),
        (
            exchange_row(json!({"tokens_out": -1})),
            Some("exchange.tokens_out is not a token count: -1"),
        ),
        (
            exchange_row(json!({"tokens_cache_read": -1})),
            Some("exchange.tokens_cache_read is not a token count: -1"),
        ),
        (
            exchange_row(json!({"tokens_cache_write": -1})),
            Some("exchange.tokens_cache_write is not a token count: -1"),
        ),
        (
            exchange_row(json!({"tokens_in": -1, "tokens_out": -1})),
            Some("exchange.tokens_in is not a token count: -1"),
        ),
        (
            exchange_row(json!({"tokens_out": -1, "tokens_cache_write": -1})),
            Some("exchange.tokens_out is not a token count: -1"),
        ),
        (exchange_row(json!({})), None),
        (
            json!({"id": ID, "session": OTHER_ID, "timestamp": TS, "kind": "subtask", "actor": "model"}),
            None,
        ),
        (exchange_row(json!({"parent": OTHER_ID})), None),
        (exchange_row(json!({"distilled": TS})), None),
        (
            exchange_row(
                json!({"parent": OTHER_ID, "distilled": TS, "model": "m", "meta": {"turn": 1}, "tokens_in": 0, "tokens_out": 1, "tokens_cache_read": 2, "tokens_cache_write": 3}),
            ),
            None,
        ),
    ];
    for (row, expected) in cases {
        assert_eq!(exchange(&row).as_deref(), expected, "row: {row}");
    }
}
