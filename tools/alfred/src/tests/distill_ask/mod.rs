use crate::chat::Tokens;
use crate::distill::ask::{Answer, MAX_TRIES, correction, extract_json};

mod fake;

#[test]
#[should_panic(expected = "Answer.accepted: tries is from 1 to MAX_TRIES")]
fn accepted_with_zero_tries_panics() {
    Answer::accepted(serde_json::json!({}), 0, Tokens::default());
}

#[test]
#[should_panic(expected = "Answer.accepted: tries is from 1 to MAX_TRIES")]
fn accepted_with_more_than_max_tries_panics() {
    Answer::accepted(serde_json::json!({}), MAX_TRIES + 1, Tokens::default());
}

#[test]
#[should_panic(expected = "Answer.rejected: tries is from 1 to MAX_TRIES")]
fn rejected_with_zero_tries_panics() {
    Answer::rejected(String::from("reason"), 0, Tokens::default());
}

#[test]
#[should_panic(expected = "Answer.rejected: tries is from 1 to MAX_TRIES")]
fn rejected_with_more_than_max_tries_panics() {
    Answer::rejected(String::from("reason"), MAX_TRIES + 1, Tokens::default());
}

#[test]
#[should_panic(expected = "Answer.rejected: the failure is not blank")]
fn rejected_with_an_empty_failure_panics() {
    Answer::rejected(String::new(), 1, Tokens::default());
}

#[test]
#[should_panic(expected = "Answer.rejected: the failure is not blank")]
fn rejected_with_a_blank_failure_panics() {
    Answer::rejected(String::from("   "), 1, Tokens::default());
}

#[test]
#[should_panic(expected = "Answer.json: only an ok answer has json")]
fn json_of_a_rejected_answer_panics() {
    Answer::rejected(String::from("reason"), 1, Tokens::default()).json();
}

#[test]
#[should_panic(expected = "correction: the error is not blank")]
fn correction_with_an_empty_error_panics() {
    correction("");
}

#[test]
#[should_panic(expected = "correction: the error is not blank")]
fn correction_with_a_blank_error_panics() {
    correction("   ");
}

#[test]
fn correction_wraps_the_error() {
    assert_eq!(
        correction("no JSON object or array in the answer"),
        "Your JSON is wrong: no JSON object or array in the answer. Answer again with only the corrected JSON."
    );
    assert_eq!(
        correction("the JSON is still wrong after 2 tries: no JSON object or array in the answer"),
        "Your JSON is wrong: the JSON is still wrong after 2 tries: no JSON object or array in the answer. Answer again with only the corrected JSON."
    );
}

#[test]
fn extract_json_reads_an_object_from_the_text() {
    assert_eq!(
        extract_json(r#"{"a": 1}"#),
        Some(serde_json::json!({"a": 1}))
    );
    assert_eq!(
        extract_json(r#"the answer is {"a": 1} as asked"#),
        Some(serde_json::json!({"a": 1}))
    );
    assert_eq!(
        extract_json(r#"{"a": [1]} plus text"#),
        Some(serde_json::json!({"a": [1]}))
    );
}

#[test]
fn extract_json_reads_an_array_from_the_text() {
    assert_eq!(extract_json(r"[1, 2]"), Some(serde_json::json!([1, 2])));
    assert_eq!(
        extract_json(r"the answer is [1, 2] as asked"),
        Some(serde_json::json!([1, 2]))
    );
    assert_eq!(
        extract_json(r#"[{"a": 1}]"#),
        Some(serde_json::json!([{"a": 1}]))
    );
}

#[test]
fn extract_json_reads_the_body_of_the_first_fence() {
    assert_eq!(
        extract_json("```json\n{\"a\": 1}\n```"),
        Some(serde_json::json!({"a": 1}))
    );
    assert_eq!(
        extract_json("```\n{\"a\": 1}\n```"),
        Some(serde_json::json!({"a": 1}))
    );
    assert_eq!(
        extract_json("Here:\n```json\n{\"a\": 1}\n```\nBye."),
        Some(serde_json::json!({"a": 1}))
    );
    assert_eq!(
        extract_json("```json\n{\"a\": 1}\n```\ntext\n```json\n{\"b\": 2}\n```"),
        Some(serde_json::json!({"a": 1}))
    );
    assert_eq!(
        extract_json("```\n{\"a\": 1}\n```\n```json\n{\"b\": 2}\n```"),
        Some(serde_json::json!({"a": 1}))
    );
    assert_eq!(
        extract_json("{\"pre\": 0}\n```json\n{\"a\": 1}\n```"),
        Some(serde_json::json!({"a": 1}))
    );
    assert_eq!(
        extract_json("```json\n{\"a\": 1}\n```\nnoise { } noise"),
        Some(serde_json::json!({"a": 1}))
    );
}

#[test]
fn extract_json_reads_nothing_outside_the_fence_body() {
    assert_eq!(extract_json("```\nplain\n```\nand {\"a\": 1}"), None);
    assert_eq!(extract_json("```json\nplain\n```\nand {\"a\": 1}"), None);
}

#[test]
fn extract_json_is_none_without_a_json() {
    assert_eq!(extract_json("no json here"), None);
    assert_eq!(extract_json(""), None);
    assert_eq!(extract_json("42"), None);
    assert_eq!(extract_json(r#""a scalar string""#), None);
    assert_eq!(extract_json("{ broken json }"), None);
    assert_eq!(extract_json(r#"{"a": 1"#), None);
    assert_eq!(extract_json(r#"{"a": 1} then {"b": 2}"#), None);
}

#[test]
fn extract_json_reaches_an_object_an_array_or_none() {
    extract_json("```json\n[1, 2]\n```");
    extract_json(r#"{"a": {"b": [1]}}"#);
    extract_json("here } is a stray closer");
}
