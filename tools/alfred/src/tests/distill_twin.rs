use crate::distill::twin::{Known, SAME_SESSION_CUTOFF, SessionList, is_cutoff, twin_of};

#[test]
fn the_spec_pins_the_cutoff() {
    assert_eq!(SAME_SESSION_CUTOFF, 0.75);
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
#[should_panic(expected = "SessionList.with: the text is not blank")]
fn with_rejects_a_blank_text() {
    SessionList::default().with("   ".to_string(), None, None);
}

#[test]
#[should_panic(expected = "SessionList.with: the id is none or not blank")]
fn with_rejects_a_blank_id() {
    SessionList::default().with("SE a ALLORA b".to_string(), Some("   ".to_string()), None);
}

#[test]
fn with_numbers_the_session_keys_as_the_list_grows() {
    SessionList::default()
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
#[should_panic(expected = "twin_of: every item has a vector as long as the vector")]
fn twin_of_rejects_an_item_without_a_vector() {
    let list = SessionList::default().with("SE a ALLORA b".to_string(), None, None);
    twin_of(&[1.0, 0.0], list.items(), SAME_SESSION_CUTOFF);
}

#[test]
#[should_panic(expected = "twin_of: every item has a vector as long as the vector")]
fn twin_of_rejects_an_item_with_a_mismatched_vector() {
    let list =
        SessionList::default().with("SE a ALLORA b".to_string(), None, Some(vec![1.0, 0.0, 0.0]));
    twin_of(&[1.0, 0.0], list.items(), SAME_SESSION_CUTOFF);
}

#[test]
fn twin_of_meets_its_contract() {
    // nearest over earlier, first of equals, none below, a match exactly at the cutoff
    let cases: [(&[[f32; 2]], f32); 4] = [
        (&[[1.0, 1.0], [1.0, 0.1]], 0.5),
        (&[[1.0, 0.0], [1.0, 0.0]], SAME_SESSION_CUTOFF),
        (&[[0.0, 1.0], [-1.0, 0.0]], SAME_SESSION_CUTOFF),
        (&[[1.0, 0.0]], 1.0),
    ];
    for (vectors, cutoff) in cases {
        let list = vectors
            .iter()
            .enumerate()
            .fold(SessionList::default(), |l, (k, v)| {
                l.with(
                    format!("SE {k} ALLORA b"),
                    Some(format!("saved-{k}")),
                    Some(v.to_vec()),
                )
            });
        twin_of(&[1.0, 0.0], list.items(), cutoff);
    }
}
