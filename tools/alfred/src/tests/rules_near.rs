use crate::rules::near::{NEAR_ITEMS_LIMIT, Pair, cosine, near_pairs};

fn near_items(list: &[(&str, &[f32])]) -> Vec<(String, Vec<f32>)> {
    list.iter()
        .map(|(id, vector)| (id.to_string(), vector.to_vec()))
        .collect()
}

fn near_axis_items(count: usize) -> Vec<(String, Vec<f32>)> {
    (0..count).map(|i| (i.to_string(), vec![1.0])).collect()
}

fn assert_cosine(left: &[f32], right: &[f32], want: f32) {
    let got = cosine(left, right);
    assert!(
        (got - want).abs() <= 1e-6,
        "cosine: {left:?} against {right:?} scores {got} not {want}"
    );
}

fn assert_near_pairs(got: &[Pair], want: &[(&str, &str, f32)]) {
    assert_eq!(
        got.len(),
        want.len(),
        "near_pairs: expected {} pairs, got {:?}",
        want.len(),
        got
    );
    for (i, (pair, (a, b, score))) in got.iter().zip(want.iter().copied()).enumerate() {
        assert_eq!(
            pair.a.as_str(),
            a,
            "near_pairs: pair {} has a {} not {}",
            i,
            pair.a,
            a
        );
        assert_eq!(
            pair.b.as_str(),
            b,
            "near_pairs: pair {} has b {} not {}",
            i,
            pair.b,
            b
        );
        assert!(
            (pair.score - score).abs() <= 1e-6,
            "near_pairs: pair {} scores {} not {}",
            i,
            pair.score,
            score
        );
    }
}

#[test]
#[should_panic(expected = "cosine: same length")]
fn cosine_panics_on_vectors_of_different_length() {
    cosine(&[1.0, 0.0], &[1.0]);
}

#[test]
fn cosine_stays_between_minus_one_and_one() {
    cosine(&[1.0, 0.0], &[1.0, 0.0]);
    cosine(&[-1.0, 0.0], &[1.0, 0.0]);
    cosine(&[1.0, 0.0], &[0.0, 1.0]);
    cosine(&[1.0, 1.0], &[1.0, 1.0]);
    cosine(&[0.0, 0.0], &[1.0, 1.0]);
    cosine(&[0.0], &[0.0]);
    cosine(&[], &[]);
}

#[test]
fn cosine_matches_the_similarity_of_hand_built_vectors() {
    assert_cosine(&[1.0, 0.0], &[1.0, 0.0], 1.0);
    assert_cosine(&[3.0, 4.0], &[3.0, 4.0], 1.0);
    assert_cosine(&[3.0, 4.0], &[6.0, 8.0], 1.0);
    assert_cosine(&[1.0, 0.0], &[0.0, 1.0], 0.0);
    assert_cosine(&[3.0, 4.0], &[-4.0, 3.0], 0.0);
    assert_cosine(&[1.0, 0.0], &[-1.0, 0.0], -1.0);
    assert_cosine(&[3.0, 4.0], &[-6.0, -8.0], -1.0);
    assert_cosine(&[1.0, 0.0], &[1.0, 1.0], 0.70710678);
    assert_cosine(&[1.0, 0.0, 0.0], &[1.0, 1.0, 1.0], 0.57735027);
}

#[test]
#[should_panic(expected = "near_pairs: at most 3000 items")]
fn near_pairs_panics_above_3000_items() {
    near_pairs(&near_axis_items(NEAR_ITEMS_LIMIT + 1), 0.5, 100);
}

#[test]
fn near_pairs_accepts_3000_items() {
    near_pairs(&near_axis_items(NEAR_ITEMS_LIMIT), 2.0, 100);
}

#[test]
fn near_pairs_returns_at_most_limit_pairs() {
    let items = near_items(&[
        ("a", &[1.0, 0.0]),
        ("b", &[1.0, 0.0]),
        ("c", &[1.0, 0.0]),
        ("d", &[1.0, 0.0]),
    ]);
    near_pairs(&items, -1.0, 2);
    near_pairs(&items, -1.0, 1);
    near_pairs(&items, -1.0, 0);
}

#[test]
fn near_pairs_keeps_two_rules_at_least_min() {
    let items = near_items(&[
        ("dup", &[1.0, 0.0]),
        ("dup", &[1.0, 0.0]),
        ("x", &[1.0, 0.0]),
        ("y", &[0.0, 1.0]),
    ]);
    near_pairs(&items, 1.0, 100);
}

#[test]
fn near_pairs_orders_closest_first_then_by_ids() {
    let items = near_items(&[
        ("aa", &[1.0, 0.0]),
        ("bb", &[1.0, 0.0]),
        ("cc", &[1.0, 1.0]),
        ("dd", &[0.0, 1.0]),
        ("ee", &[0.0, 1.0]),
        ("ff", &[-1.0, 0.0]),
    ]);
    near_pairs(&items, -1.0, 100);
}

#[test]
fn near_pairs_matches_the_pairs_of_hand_built_vectors() {
    let items = near_items(&[
        ("aa", &[1.0, 0.0]),
        ("bb", &[1.0, 0.0]),
        ("cc", &[1.0, 1.0]),
        ("dd", &[0.0, 1.0]),
        ("ee", &[0.0, 1.0]),
        ("ff", &[-1.0, 0.0]),
    ]);
    let inv_sqrt2 = 0.70710678;
    assert_near_pairs(
        &near_pairs(&items, -1.0, 100),
        &[
            ("aa", "bb", 1.0),
            ("dd", "ee", 1.0),
            ("aa", "cc", inv_sqrt2),
            ("bb", "cc", inv_sqrt2),
            ("cc", "dd", inv_sqrt2),
            ("cc", "ee", inv_sqrt2),
            ("aa", "dd", 0.0),
            ("aa", "ee", 0.0),
            ("bb", "dd", 0.0),
            ("bb", "ee", 0.0),
            ("dd", "ff", 0.0),
            ("ee", "ff", 0.0),
            ("cc", "ff", -inv_sqrt2),
            ("aa", "ff", -1.0),
            ("bb", "ff", -1.0),
        ],
    );
    assert_near_pairs(
        &near_pairs(&items, 0.5, 100),
        &[
            ("aa", "bb", 1.0),
            ("dd", "ee", 1.0),
            ("aa", "cc", inv_sqrt2),
            ("bb", "cc", inv_sqrt2),
            ("cc", "dd", inv_sqrt2),
            ("cc", "ee", inv_sqrt2),
        ],
    );
    assert_near_pairs(
        &near_pairs(&items, 1.0, 100),
        &[("aa", "bb", 1.0), ("dd", "ee", 1.0)],
    );
    assert_near_pairs(
        &near_pairs(&items, 0.5, 3),
        &[
            ("aa", "bb", 1.0),
            ("dd", "ee", 1.0),
            ("aa", "cc", inv_sqrt2),
        ],
    );
    assert_near_pairs(&near_pairs(&items, 0.5, 1), &[("aa", "bb", 1.0)]);
    assert_near_pairs(&near_pairs(&items, 2.0, 100), &[]);
    assert_near_pairs(&near_pairs(&[], 0.5, 100), &[]);
    let single = near_items(&[("solo", &[1.0, 0.0])]);
    assert_near_pairs(&near_pairs(&single, -1.0, 100), &[]);
}
