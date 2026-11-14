use super::known;
use crate::distill::novelty::{settle, verdicts_check};
#[test]
#[should_panic(expected = "verdicts_check: at least one candidate")]
fn verdicts_check_rejects_zero_candidate() {
    verdicts_check(&serde_json::json!({}), 0, 0);
}

#[test]
fn verdicts_check_needs_a_verdicts_list() {
    assert_eq!(
        verdicts_check(&serde_json::json!({}), 1, 1),
        Some("need list `verdicts`".to_string())
    );
    assert_eq!(
        verdicts_check(&serde_json::json!({ "verdicts": "none" }), 1, 1),
        Some("need list `verdicts`".to_string())
    );
}

#[test]
fn verdicts_check_needs_one_verdict_per_candidate() {
    assert_eq!(
        verdicts_check(&serde_json::json!({ "verdicts": [] }), 3, 1),
        Some("need exactly one verdict per cand 0..2".to_string())
    );
    assert_eq!(
        verdicts_check(
            &serde_json::json!({ "verdicts": [
                { "cand": 0, "verdict": "new" },
                { "cand": 1, "verdict": "new" }
            ] }),
            1,
            0
        ),
        Some("need exactly one verdict per cand 0..0".to_string())
    );
}

#[test]
fn verdicts_check_needs_a_known_verdict_name() {
    assert_eq!(
        verdicts_check(
            &serde_json::json!({ "verdicts": [{ "cand": 0, "verdict": "maybe" }] }),
            1,
            1
        ),
        Some("cand 0: verdict must be one of append, duplicate, new".to_string())
    );
    assert_eq!(
        verdicts_check(&serde_json::json!({ "verdicts": [{ "cand": 0 }] }), 1, 1),
        Some("cand 0: verdict must be one of append, duplicate, new".to_string())
    );
    assert_eq!(
        verdicts_check(
            &serde_json::json!({ "verdicts": [
                { "cand": 0, "verdict": "new" },
                { "cand": 1, "verdict": "perhaps" }
            ] }),
            2,
            1
        ),
        Some("cand 1: verdict must be one of append, duplicate, new".to_string())
    );
}

#[test]
fn verdicts_check_needs_a_neighbour_id_for_of() {
    assert_eq!(
        verdicts_check(
            &serde_json::json!({ "verdicts": [{ "cand": 0, "verdict": "duplicate" }] }),
            1,
            1
        ),
        Some("cand 0: `of` must be a neighbour id 0..0".to_string())
    );
    assert_eq!(
        verdicts_check(
            &serde_json::json!({ "verdicts": [{ "cand": 0, "verdict": "duplicate", "of": 3 }] }),
            1,
            3
        ),
        Some("cand 0: `of` must be a neighbour id 0..2".to_string())
    );
}

#[test]
fn verdicts_check_accepts_of_in_range() {
    assert_eq!(
        verdicts_check(
            &serde_json::json!({ "verdicts": [{ "cand": 0, "verdict": "duplicate", "of": 2 }] }),
            1,
            3
        ),
        None
    );
    assert_eq!(
        verdicts_check(
            &serde_json::json!({ "verdicts": [{ "cand": 0, "verdict": "append", "of": 0, "do": "more" }] }),
            1,
            3
        ),
        None
    );
}

#[test]
fn verdicts_check_accepts_a_full_valid_answer() {
    assert_eq!(
        verdicts_check(
            &serde_json::json!({ "verdicts": [
                { "cand": 0, "verdict": "new", "reason": "fresh" },
                { "cand": 1, "verdict": "duplicate", "of": 1 },
                { "cand": 2, "verdict": "append", "of": 0, "do": "more" }
            ] }),
            3,
            2
        ),
        None
    );
}

#[test]
fn verdicts_check_accepts_a_new_verdict_without_neighbours() {
    assert_eq!(
        verdicts_check(
            &serde_json::json!({ "verdicts": [{ "cand": 0, "verdict": "new" }] }),
            1,
            0
        ),
        None
    );
}

#[test]
#[should_panic(expected = "settle: the json passes the check")]
fn settle_rejects_a_json_that_fails_the_check() {
    settle(&serde_json::json!({}), 1, &[]);
}

#[test]
fn settle_keeps_one_ruling_per_candidate_in_order() {
    settle(
        &serde_json::json!({ "verdicts": [
            { "cand": 0, "verdict": "new" },
            { "cand": 1, "verdict": "new" },
            { "cand": 2, "verdict": "new" }
        ] }),
        3,
        &[],
    );
}

#[test]
fn settle_keys_every_ruling_that_is_not_new() {
    settle(
        &serde_json::json!({ "verdicts": [
            { "cand": 0, "verdict": "duplicate", "of": 0 },
            { "cand": 1, "verdict": "append", "of": 1, "do": "more" }
        ] }),
        2,
        &[known("r1", "SE a ALLORA b"), known("r2", "SE c ALLORA d")],
    );
}

#[test]
fn settle_gives_the_append_its_do() {
    settle(
        &serde_json::json!({ "verdicts": [{ "cand": 0, "verdict": "append", "of": 0, "do": "more" }] }),
        1,
        &[known("r1", "SE a ALLORA b")],
    );
}

#[test]
fn settle_maps_each_verdict_to_its_ruling() {
    let rulings = settle(
        &serde_json::json!({ "verdicts": [
            { "cand": 0, "verdict": "new", "reason": "fresh" },
            { "cand": 1, "verdict": "duplicate", "of": 0, "reason": "same" },
            { "cand": 2, "verdict": "append", "of": 1, "do": "more", "reason": "adds" }
        ] }),
        3,
        &[known("r1", "SE a ALLORA b"), known("r2", "SE c ALLORA d")],
    );
    assert_eq!(rulings.len(), 3);
    assert_eq!(rulings[0].verdict(), crate::distill::record::Verdict::New);
    assert_eq!(rulings[0].of(), None);
    assert_eq!(rulings[0].do_(), None);
    assert_eq!(rulings[0].reason(), Some("fresh"));
    assert_eq!(
        rulings[1].verdict(),
        crate::distill::record::Verdict::Duplicate
    );
    assert_eq!(rulings[1].of(), Some("r1"));
    assert_eq!(rulings[1].do_(), None);
    assert_eq!(rulings[1].reason(), Some("same"));
    assert_eq!(
        rulings[2].verdict(),
        crate::distill::record::Verdict::Append
    );
    assert_eq!(rulings[2].of(), Some("r2"));
    assert_eq!(rulings[2].do_(), Some("more"));
    assert_eq!(rulings[2].reason(), Some("adds"));
}

#[test]
fn settle_turns_an_append_without_do_into_a_duplicate() {
    let rulings = settle(
        &serde_json::json!({ "verdicts": [{ "cand": 0, "verdict": "append", "of": 0 }] }),
        1,
        &[known("r1", "SE a ALLORA b")],
    );
    assert_eq!(
        rulings[0].verdict(),
        crate::distill::record::Verdict::Duplicate
    );
    assert_eq!(rulings[0].of(), Some("r1"));
    assert_eq!(rulings[0].do_(), None);
}

#[test]
fn settle_turns_an_append_with_a_blank_do_into_a_duplicate() {
    let rulings = settle(
        &serde_json::json!({ "verdicts": [{ "cand": 0, "verdict": "append", "of": 0, "do": "   " }] }),
        1,
        &[known("r1", "SE a ALLORA b")],
    );
    assert_eq!(
        rulings[0].verdict(),
        crate::distill::record::Verdict::Duplicate
    );
    assert_eq!(rulings[0].of(), Some("r1"));
    assert_eq!(rulings[0].do_(), None);
}

#[test]
fn settle_drops_a_blank_reason() {
    let rulings = settle(
        &serde_json::json!({ "verdicts": [{ "cand": 0, "verdict": "new", "reason": "   " }] }),
        1,
        &[],
    );
    assert_eq!(rulings[0].reason(), None);
}

#[test]
fn settle_drops_a_missing_reason() {
    let rulings = settle(
        &serde_json::json!({ "verdicts": [{ "cand": 0, "verdict": "new" }] }),
        1,
        &[],
    );
    assert_eq!(rulings[0].reason(), None);
    assert_eq!(rulings[0].do_(), None);
}

#[test]
fn settle_follows_cand_not_the_list_order() {
    let json = serde_json::json!({"verdicts": [
        {"cand": 1, "verdict": "duplicate", "of": 0},
        {"cand": 0, "verdict": "new"}
    ]});
    let rulings = settle(&json, 2, &[known("r1", "SE a ALLORA b")]);
    let verdicts: Vec<_> = rulings
        .iter()
        .map(crate::distill::novelty::Ruling::verdict)
        .collect();
    assert_eq!(
        verdicts,
        [
            crate::distill::record::Verdict::New,
            crate::distill::record::Verdict::Duplicate
        ]
    );
}

#[test]
fn verdicts_check_needs_each_cand_once() {
    let twice = serde_json::json!({"verdicts": [
        {"cand": 0, "verdict": "new"},
        {"cand": 0, "verdict": "new"}
    ]});
    assert_eq!(
        verdicts_check(&twice, 2, 0),
        Some("need exactly one verdict per cand 0..1".to_string())
    );
}
