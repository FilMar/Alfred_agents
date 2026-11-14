use crate::distill::twin::{
    Known, SAME_SESSION_CUTOFF, SESSION_KEY, SessionList, is_cutoff, twin_of,
};

#[test]
fn the_spec_pins_the_cutoff_and_the_session_key() {
    assert_eq!(SAME_SESSION_CUTOFF, 0.75);
    assert_eq!(SESSION_KEY, "session:");
}

#[test]
fn is_cutoff_classifies_the_range() {
    let table = [
        (f32::NEG_INFINITY, false),
        (-1.0, false),
        (-0.0, false),
        (0.0, false),
        (f32::MIN_POSITIVE, true),
        (1e-9, true),
        (0.5, true),
        (SAME_SESSION_CUTOFF, true),
        (1.0, true),
        (1.0 + f32::EPSILON, false),
        (1.5, false),
        (f32::INFINITY, false),
        (f32::NAN, false),
    ];
    for (value, expected) in table {
        assert_eq!(is_cutoff(value), expected, "is_cutoff({value})");
    }
}

#[test]
#[should_panic(expected = "Known.neighbour: the key is not blank")]
fn neighbour_rejects_a_blank_key() {
    Known::neighbour("   ".to_string(), "SE a ALLORA b".to_string());
}

#[test]
#[should_panic(expected = "Known.neighbour: the text is not blank")]
fn neighbour_rejects_a_blank_text() {
    Known::neighbour("saved-1".to_string(), "   ".to_string());
}

#[test]
fn neighbour_keeps_the_key_the_text_and_no_vector() {
    let known = Known::neighbour("saved-1".to_string(), "SE a ALLORA b".to_string());
    assert_eq!(known.key(), "saved-1");
    assert_eq!(known.text(), "SE a ALLORA b");
    assert_eq!(known.vector(), None);
}

#[test]
fn is_session_reads_the_key_prefix() {
    let table = [
        ("session:0", true),
        ("session:12", true),
        ("session:", true),
        ("session", false),
        ("asession:1", false),
        ("saved-1", false),
    ];
    for (key, expected) in table {
        let known = Known::neighbour(key.to_string(), "SE a ALLORA b".to_string());
        assert_eq!(known.is_session(), expected, "is_session for the key {key}");
    }
}

#[test]
fn empty_starts_with_no_items() {
    assert!(SessionList::empty().items().is_empty());
}

#[test]
#[should_panic(expected = "SessionList.with: the text is not blank")]
fn with_rejects_a_blank_text() {
    SessionList::empty().with("   ".to_string(), None, None);
}

#[test]
#[should_panic(expected = "SessionList.with: the id is none or not blank")]
fn with_rejects_a_blank_id() {
    SessionList::empty().with("SE a ALLORA b".to_string(), Some("   ".to_string()), None);
}

#[test]
fn with_keeps_the_saved_id_as_the_key() {
    SessionList::empty().with(
        "SE a ALLORA b".to_string(),
        Some("saved-1".to_string()),
        Some(vec![1.0, 0.0]),
    );
}

#[test]
fn with_mints_a_session_key_without_an_id() {
    SessionList::empty().with("SE a ALLORA b".to_string(), None, Some(vec![0.0, 1.0]));
}

#[test]
fn with_numbers_the_session_keys_as_the_list_grows() {
    SessionList::empty()
        .with("SE a ALLORA b".to_string(), None, None)
        .with("SE c ALLORA d".to_string(), None, Some(vec![1.0, 1.0]))
        .with(
            "SE e ALLORA f".to_string(),
            Some("saved-1".to_string()),
            None,
        );
}

#[test]
#[should_panic(expected = "twin_of: the cutoff is above 0 and at most 1")]
fn twin_of_rejects_a_cutoff_at_zero() {
    twin_of(&[1.0, 0.0], &[], 0.0);
}

#[test]
#[should_panic(expected = "twin_of: the cutoff is above 0 and at most 1")]
fn twin_of_rejects_a_cutoff_above_one() {
    twin_of(&[1.0, 0.0], &[], 1.0 + f32::EPSILON);
}

#[test]
#[should_panic(expected = "twin_of: every item has a vector as long as the vector")]
fn twin_of_rejects_an_item_without_a_vector() {
    let list = SessionList::empty().with("SE a ALLORA b".to_string(), None, None);
    twin_of(&[1.0, 0.0], list.items(), SAME_SESSION_CUTOFF);
}

#[test]
#[should_panic(expected = "twin_of: every item has a vector as long as the vector")]
fn twin_of_rejects_an_item_with_a_mismatched_vector() {
    let list =
        SessionList::empty().with("SE a ALLORA b".to_string(), None, Some(vec![1.0, 0.0, 0.0]));
    twin_of(&[1.0, 0.0], list.items(), SAME_SESSION_CUTOFF);
}

#[test]
fn twin_of_takes_the_nearest_item_above_the_cutoff() {
    let list = SessionList::empty()
        .with(
            "SE a ALLORA b".to_string(),
            Some("saved-1".to_string()),
            Some(vec![1.0, 0.1]),
        )
        .with(
            "SE c ALLORA d".to_string(),
            Some("saved-2".to_string()),
            Some(vec![1.0, 1.0]),
        );
    twin_of(&[1.0, 0.0], list.items(), SAME_SESSION_CUTOFF);
}

#[test]
fn twin_of_prefers_the_nearest_over_the_earlier() {
    let list = SessionList::empty()
        .with(
            "SE a ALLORA b".to_string(),
            Some("saved-1".to_string()),
            Some(vec![1.0, 1.0]),
        )
        .with(
            "SE c ALLORA d".to_string(),
            Some("saved-2".to_string()),
            Some(vec![1.0, 0.1]),
        );
    twin_of(&[1.0, 0.0], list.items(), 0.5);
}

#[test]
fn twin_of_takes_the_first_of_equal_nearest_items() {
    let list = SessionList::empty()
        .with(
            "SE a ALLORA b".to_string(),
            Some("saved-1".to_string()),
            Some(vec![1.0, 0.0]),
        )
        .with(
            "SE c ALLORA d".to_string(),
            Some("saved-2".to_string()),
            Some(vec![1.0, 0.0]),
        );
    twin_of(&[1.0, 0.0], list.items(), SAME_SESSION_CUTOFF);
}

#[test]
fn twin_of_finds_no_twin_below_the_cutoff() {
    let list = SessionList::empty()
        .with(
            "SE a ALLORA b".to_string(),
            Some("saved-1".to_string()),
            Some(vec![0.0, 1.0]),
        )
        .with(
            "SE c ALLORA d".to_string(),
            Some("saved-2".to_string()),
            Some(vec![-1.0, 0.0]),
        );
    twin_of(&[1.0, 0.0], list.items(), SAME_SESSION_CUTOFF);
}

#[test]
fn twin_of_accepts_a_match_exactly_at_the_cutoff() {
    let list = SessionList::empty().with("SE a ALLORA b".to_string(), None, Some(vec![1.0, 0.0]));
    twin_of(&[1.0, 0.0], list.items(), 1.0);
}

#[test]
fn twin_of_rejects_an_orthogonal_item_at_the_smallest_cutoff() {
    let list = SessionList::empty().with("SE a ALLORA b".to_string(), None, Some(vec![0.0, 1.0]));
    twin_of(&[1.0, 0.0], list.items(), f32::MIN_POSITIVE);
}

#[test]
fn twin_of_finds_no_twin_in_an_empty_list() {
    let list = SessionList::empty();
    twin_of(&[1.0, 0.0], list.items(), SAME_SESSION_CUTOFF);
}
