use crate::hist::validate::injection;

const EXCHANGE_ID: &str = "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d";
const REF: &str = "9d3685f9";

#[test]
fn accepts_a_valid_row() {
    let row = serde_json::json!({
        "exchange_id": EXCHANGE_ID,
        "kind": "rule",
        "ref": REF,
        "text": "prima azione\nseconda azione",
    });
    assert!(injection(&row).is_none());
}

#[test]
fn accepts_a_row_with_other_fields() {
    let row = serde_json::json!({
        "exchange_id": EXCHANGE_ID,
        "kind": "rule",
        "ref": REF,
        "text": "prima azione",
        "hook": "UserPromptSubmit",
    });
    assert!(injection(&row).is_none());
}

#[test]
fn accepts_a_whitespace_text() {
    let row = serde_json::json!({
        "exchange_id": EXCHANGE_ID,
        "kind": "rule",
        "ref": REF,
        "text": " ",
    });
    assert!(injection(&row).is_none());
}

#[test]
fn accepts_an_all_digit_ref() {
    let row = serde_json::json!({
        "exchange_id": EXCHANGE_ID,
        "kind": "rule",
        "ref": "00000000",
        "text": "prima azione",
    });
    assert!(injection(&row).is_none());
}

#[test]
fn rejects_a_missing_exchange_id() {
    let row = serde_json::json!({
        "kind": "rule",
        "ref": REF,
        "text": "prima azione",
    });
    assert!(
        injection(&row)
            .is_some_and(|message| message.starts_with("injection.exchange_id is not an id: "))
    );
}

#[test]
fn rejects_a_short_exchange_id() {
    let row = serde_json::json!({
        "exchange_id": "11111111-1111-1111-1111-11111111111",
        "kind": "rule",
        "ref": REF,
        "text": "prima azione",
    });
    assert!(
        injection(&row)
            .is_some_and(|message| message.starts_with("injection.exchange_id is not an id: "))
    );
}

#[test]
fn rejects_a_null_exchange_id() {
    let row = serde_json::json!({
        "exchange_id": null,
        "kind": "rule",
        "ref": REF,
        "text": "prima azione",
    });
    assert!(
        injection(&row)
            .is_some_and(|message| message.starts_with("injection.exchange_id is not an id: "))
    );
}

#[test]
fn rejects_a_missing_kind() {
    let row = serde_json::json!({
        "exchange_id": EXCHANGE_ID,
        "ref": REF,
        "text": "prima azione",
    });
    assert!(
        injection(&row).is_some_and(|message| message.starts_with("injection.kind is not rule: "))
    );
}

#[test]
fn rejects_a_note_kind() {
    let row = serde_json::json!({
        "exchange_id": EXCHANGE_ID,
        "kind": "note",
        "ref": REF,
        "text": "prima azione",
    });
    assert!(
        injection(&row).is_some_and(|message| message.starts_with("injection.kind is not rule: "))
    );
}

#[test]
fn rejects_a_capitalised_kind() {
    let row = serde_json::json!({
        "exchange_id": EXCHANGE_ID,
        "kind": "Rule",
        "ref": REF,
        "text": "prima azione",
    });
    assert!(
        injection(&row).is_some_and(|message| message.starts_with("injection.kind is not rule: "))
    );
}

#[test]
fn rejects_a_number_kind() {
    let row = serde_json::json!({
        "exchange_id": EXCHANGE_ID,
        "kind": 42,
        "ref": REF,
        "text": "prima azione",
    });
    assert!(
        injection(&row).is_some_and(|message| message.starts_with("injection.kind is not rule: "))
    );
}

#[test]
fn rejects_a_missing_ref() {
    let row = serde_json::json!({
        "exchange_id": EXCHANGE_ID,
        "kind": "rule",
        "text": "prima azione",
    });
    assert!(
        injection(&row)
            .is_some_and(|message| message.starts_with("injection.ref is not a short id: "))
    );
}

#[test]
fn rejects_a_seven_char_ref() {
    let row = serde_json::json!({
        "exchange_id": EXCHANGE_ID,
        "kind": "rule",
        "ref": "9d3685f",
        "text": "prima azione",
    });
    assert!(
        injection(&row)
            .is_some_and(|message| message.starts_with("injection.ref is not a short id: "))
    );
}

#[test]
fn rejects_a_nine_char_ref() {
    let row = serde_json::json!({
        "exchange_id": EXCHANGE_ID,
        "kind": "rule",
        "ref": "9d3685f99",
        "text": "prima azione",
    });
    assert!(
        injection(&row)
            .is_some_and(|message| message.starts_with("injection.ref is not a short id: "))
    );
}

#[test]
fn rejects_an_uppercase_ref() {
    let row = serde_json::json!({
        "exchange_id": EXCHANGE_ID,
        "kind": "rule",
        "ref": "9D3685F9",
        "text": "prima azione",
    });
    assert!(
        injection(&row)
            .is_some_and(|message| message.starts_with("injection.ref is not a short id: "))
    );
}

#[test]
fn rejects_a_non_hex_ref() {
    let row = serde_json::json!({
        "exchange_id": EXCHANGE_ID,
        "kind": "rule",
        "ref": "9d3685g9",
        "text": "prima azione",
    });
    assert!(
        injection(&row)
            .is_some_and(|message| message.starts_with("injection.ref is not a short id: "))
    );
}

#[test]
fn rejects_a_null_ref() {
    let row = serde_json::json!({
        "exchange_id": EXCHANGE_ID,
        "kind": "rule",
        "ref": null,
        "text": "prima azione",
    });
    assert!(
        injection(&row)
            .is_some_and(|message| message.starts_with("injection.ref is not a short id: "))
    );
}

#[test]
fn rejects_a_missing_text() {
    let row = serde_json::json!({
        "exchange_id": EXCHANGE_ID,
        "kind": "rule",
        "ref": REF,
    });
    assert_eq!(
        injection(&row).as_deref(),
        Some("injection.text is required")
    );
}

#[test]
fn rejects_an_empty_text() {
    let row = serde_json::json!({
        "exchange_id": EXCHANGE_ID,
        "kind": "rule",
        "ref": REF,
        "text": "",
    });
    assert_eq!(
        injection(&row).as_deref(),
        Some("injection.text is required")
    );
}

#[test]
fn rejects_a_null_text() {
    let row = serde_json::json!({
        "exchange_id": EXCHANGE_ID,
        "kind": "rule",
        "ref": REF,
        "text": null,
    });
    assert_eq!(
        injection(&row).as_deref(),
        Some("injection.text is required")
    );
}

#[test]
fn rejects_a_number_text() {
    let row = serde_json::json!({
        "exchange_id": EXCHANGE_ID,
        "kind": "rule",
        "ref": REF,
        "text": 7,
    });
    assert_eq!(
        injection(&row).as_deref(),
        Some("injection.text is required")
    );
}

#[test]
fn reports_exchange_id_before_kind() {
    let row = serde_json::json!({
        "exchange_id": "nope",
        "kind": "note",
        "ref": REF,
        "text": "prima azione",
    });
    assert!(
        injection(&row)
            .is_some_and(|message| message.starts_with("injection.exchange_id is not an id: "))
    );
}

#[test]
fn reports_kind_before_ref() {
    let row = serde_json::json!({
        "exchange_id": EXCHANGE_ID,
        "kind": "note",
        "ref": "nope",
        "text": "prima azione",
    });
    assert!(
        injection(&row).is_some_and(|message| message.starts_with("injection.kind is not rule: "))
    );
}

#[test]
fn reports_ref_before_text() {
    let row = serde_json::json!({
        "exchange_id": EXCHANGE_ID,
        "kind": "rule",
        "ref": "nope",
        "text": "",
    });
    assert!(
        injection(&row)
            .is_some_and(|message| message.starts_with("injection.ref is not a short id: "))
    );
}

#[test]
fn reports_the_first_broken_rule() {
    let row = serde_json::json!({
        "exchange_id": "nope",
        "kind": "note",
        "ref": "nope",
        "text": "",
    });
    assert!(
        injection(&row)
            .is_some_and(|message| message.starts_with("injection.exchange_id is not an id: "))
    );
}
