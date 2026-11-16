mod map;

use crate::distill::episodes::{SessionMap, cut};

#[test]
#[should_panic(expected = "cut: chars is positive")]
fn cut_needs_positive_chars() {
    let _ = cut("hello", 0);
}

#[test]
fn cut_keeps_at_most_chars_characters() {
    let _ = cut("a rather long session text", 8);
}

#[test]
fn cut_takes_the_first_chars_characters_not_bytes() {
    assert_eq!(cut("", 1), "");
    assert_eq!(cut("hello", 1), "h");
    assert_eq!(cut("hello", 4), "hell");
    assert_eq!(cut("hello", 5), "hello");
    assert_eq!(cut("hello", 6), "hello");
    assert_eq!(cut("héllo", 2), "hé");
    assert_eq!(cut("héllo", 3), "hél");
    assert_eq!(cut("a🙂b", 2), "a🙂");
    assert_eq!(cut("a🙂b", 3), "a🙂b");
}

#[test]
#[should_panic(expected = "SessionMap.listing: there are turns")]
fn listing_needs_turns() {
    let _ = SessionMap::listing(&[], 100);
}

#[test]
#[should_panic(expected = "SessionMap.check: turn_count is positive")]
fn check_needs_a_positive_turn_count() {
    let _ = SessionMap::check(
        &serde_json::json!({"episodes": [{"from": 0, "to": 0, "summary": "a"}]}),
        0,
    );
}

#[test]
fn check_needs_an_episodes_list() {
    assert_eq!(
        SessionMap::check(&serde_json::json!({}), 3).as_deref(),
        Some("need list `episodes`")
    );
    assert_eq!(
        SessionMap::check(&serde_json::json!(null), 3).as_deref(),
        Some("need list `episodes`")
    );
    assert_eq!(
        SessionMap::check(&serde_json::json!([]), 3).as_deref(),
        Some("need list `episodes`")
    );
    assert_eq!(
        SessionMap::check(&serde_json::json!({"episodes": []}), 3).as_deref(),
        Some("need list `episodes`")
    );
    assert_eq!(
        SessionMap::check(&serde_json::json!({"episodes": null}), 3).as_deref(),
        Some("need list `episodes`")
    );
    assert_eq!(
        SessionMap::check(&serde_json::json!({"episodes": {}}), 3).as_deref(),
        Some("need list `episodes`")
    );
    assert_eq!(
        SessionMap::check(&serde_json::json!({"episodes": "one"}), 3).as_deref(),
        Some("need list `episodes`")
    );
}

#[test]
fn check_rejects_an_episode_that_breaks_the_cover() {
    assert_eq!(
        SessionMap::check(&serde_json::json!({"episodes": [1]}), 3).as_deref(),
        Some("episodes must cover 0..2 in order with no gap: expected from=0")
    );
    assert_eq!(
        SessionMap::check(&serde_json::json!({"episodes": [null]}), 3).as_deref(),
        Some("episodes must cover 0..2 in order with no gap: expected from=0")
    );
    assert_eq!(
        SessionMap::check(
            &serde_json::json!({"episodes": [{"to": 2, "summary": "a"}]}),
            3
        )
        .as_deref(),
        Some("episodes must cover 0..2 in order with no gap: expected from=0")
    );
    assert_eq!(
        SessionMap::check(
            &serde_json::json!({"episodes": [{"from": 1, "to": 2, "summary": "a"}]}),
            3
        )
        .as_deref(),
        Some("episodes must cover 0..2 in order with no gap: expected from=0")
    );
    assert_eq!(
        SessionMap::check(
            &serde_json::json!({"episodes": [{"from": -1, "to": 2, "summary": "a"}]}),
            3
        )
        .as_deref(),
        Some("episodes must cover 0..2 in order with no gap: expected from=0")
    );
    assert_eq!(
        SessionMap::check(
            &serde_json::json!({"episodes": [{"from": 0.5, "to": 2, "summary": "a"}]}),
            3
        )
        .as_deref(),
        Some("episodes must cover 0..2 in order with no gap: expected from=0")
    );
    assert_eq!(
        SessionMap::check(
            &serde_json::json!({"episodes": [{"from": "0", "to": 2, "summary": "a"}]}),
            3
        )
        .as_deref(),
        Some("episodes must cover 0..2 in order with no gap: expected from=0")
    );
    assert_eq!(
        SessionMap::check(
            &serde_json::json!({"episodes": [{"from": 0, "summary": "a"}]}),
            3
        )
        .as_deref(),
        Some("episodes must cover 0..2 in order with no gap: expected from=0")
    );
    assert_eq!(
        SessionMap::check(
            &serde_json::json!({"episodes": [{"from": 0, "to": "2", "summary": "a"}]}),
            3
        )
        .as_deref(),
        Some("episodes must cover 0..2 in order with no gap: expected from=0")
    );
    assert_eq!(
        SessionMap::check(
            &serde_json::json!({"episodes": [{"from": 0, "to": 2.5, "summary": "a"}]}),
            3
        )
        .as_deref(),
        Some("episodes must cover 0..2 in order with no gap: expected from=0")
    );
    assert_eq!(
        SessionMap::check(
            &serde_json::json!({"episodes": [{"from": 0, "to": -1, "summary": "a"}]}),
            3
        )
        .as_deref(),
        Some("episodes must cover 0..2 in order with no gap: expected from=0")
    );
    assert_eq!(SessionMap::check(&serde_json::json!({"episodes": [{"from": 0, "to": 0, "summary": "a"}, {"from": 2, "to": 2, "summary": "b"}]}), 3).as_deref(), Some("episodes must cover 0..2 in order with no gap: expected from=1"));
    assert_eq!(SessionMap::check(&serde_json::json!({"episodes": [{"from": 0, "to": 1, "summary": "a"}, {"from": 2, "to": 1, "summary": "b"}]}), 3).as_deref(), Some("episodes must cover 0..2 in order with no gap: expected from=2"));
}

#[test]
fn check_rejects_an_episode_without_a_summary() {
    let summaries = [
        None,
        Some(serde_json::json!("")),
        Some(serde_json::json!("  ")),
        Some(serde_json::json!(7)),
        Some(serde_json::Value::Null),
        Some(serde_json::json!(["a"])),
    ];
    for summary in summaries {
        let episode = match &summary {
            None => serde_json::json!({"from": 0, "to": 2}),
            Some(value) => serde_json::json!({"from": 0, "to": 2, "summary": value}),
        };
        let json = serde_json::json!({ "episodes": [episode] });
        assert_eq!(
            SessionMap::check(&json, 3).as_deref(),
            Some("every episode needs a summary"),
            "{summary:?}"
        );
    }
}

#[test]
fn check_reports_a_broken_cover_before_a_missing_summary() {
    assert_eq!(
        SessionMap::check(
            &serde_json::json!({"episodes": [{"from": 1, "to": 2, "summary": ""}]}),
            3
        )
        .as_deref(),
        Some("episodes must cover 0..2 in order with no gap: expected from=0")
    );
}

#[test]
fn check_rejects_a_cover_that_does_not_end_at_the_last_turn() {
    assert_eq!(
        SessionMap::check(
            &serde_json::json!({"episodes": [{"from": 0, "to": 1, "summary": "a"}]}),
            3
        )
        .as_deref(),
        Some("the last episode must end at 2")
    );
    assert_eq!(
        SessionMap::check(
            &serde_json::json!({"episodes": [{"from": 0, "to": 5, "summary": "a"}]}),
            3
        )
        .as_deref(),
        Some("the last episode must end at 2")
    );
    assert_eq!(
        SessionMap::check(
            &serde_json::json!({"episodes": [{"from": 0, "to": 2, "summary": "a"}]}),
            1
        )
        .as_deref(),
        Some("the last episode must end at 0")
    );
}

#[test]
fn check_accepts_a_cover_of_every_turn_in_order() {
    assert_eq!(
        SessionMap::check(
            &serde_json::json!({"episodes": [{"from": 0, "to": 2, "summary": "a"}]}),
            3
        )
        .as_deref(),
        None
    );
    assert_eq!(SessionMap::check(&serde_json::json!({"episodes": [{"from": 0, "to": 0, "summary": "a"}, {"from": 1, "to": 2, "summary": "b"}]}), 3).as_deref(), None);
    assert_eq!(SessionMap::check(&serde_json::json!({"episodes": [{"from": 0, "to": 0, "summary": "a"}, {"from": 1, "to": 1, "summary": "b"}, {"from": 2, "to": 2, "summary": "c"}]}), 3).as_deref(), None);
    assert_eq!(
        SessionMap::check(
            &serde_json::json!({"episodes": [{"from": 0, "to": 0, "summary": "a"}]}),
            1
        )
        .as_deref(),
        None
    );
    assert_eq!(
        SessionMap::check(
            &serde_json::json!({"episodes": [{"from": 0, "to": 2, "summary": "a"}], "extra": 1}),
            3
        )
        .as_deref(),
        None
    );
}
