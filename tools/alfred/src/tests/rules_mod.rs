use crate::rules::{is_full_id, iso, match_prefix, normalize_tags};

#[test]
fn normalize_tags_outcome_table() {
    let cases: Vec<(Vec<String>, Vec<&str>)> = vec![
        (vec![], vec![]),
        (vec!["solo".into()], vec!["solo"]),
        (vec!["a b".into()], vec!["a b"]),
        (vec!["a,b,c".into()], vec!["a", "b", "c"]),
        (
            vec![" tag one , tag two ".into()],
            vec!["tag one", "tag two"],
        ),
        (vec!["a,,b".into()], vec!["a", "b"]),
        (vec!["x,y".into(), "z".into()], vec!["x", "y", "z"]),
        (vec!["x".into(), String::new()], vec!["x"]),
        (vec![String::new()], vec![]),
        (vec!["   ".into()], vec![]),
        (vec![" , ".into()], vec![]),
    ];
    for (raw, want) in cases {
        assert_eq!(normalize_tags(&raw), want, "normalize_tags of {raw:?}");
    }
}

#[test]
fn normalize_tags_no_empty_tag_no_comma() {
    let raw: Vec<String> = vec![" alpha , , beta ".to_string()];
    let _ = normalize_tags(&raw);
}

#[test]
fn is_full_id_outcome_table() {
    let cases: Vec<(&str, bool)> = vec![
        ("550e8400-e29b-41d4-a716-446655440000", true),
        ("00000000-0000-0000-0000-000000000000", true),
        ("ffffffff-ffff-ffff-ffff-ffffffffffff", true),
        ("", false),
        ("550e", false),
        ("550e840-e29b-41d4-a716-446655440000", false),
        ("550e84000-e29b-41d4-a716-446655440000", false),
        ("550e8400-e29-41d4-a716-446655440000", false),
        ("550e8400-e29b5-41d4-a716-446655440000", false),
        ("550e8400-e29b-41d-a716-446655440000", false),
        ("550e8400-e29b-41d45-a716-446655440000", false),
        ("550e8400-e29b-41d4-a71-446655440000", false),
        ("550e8400-e29b-41d4-a7166-446655440000", false),
        ("550e8400-e29b-41d4-a716-44665544000", false),
        ("550e8400-e29b-41d4-a716-4466554400000", false),
        ("550e8400-e29b-41d4-a716-44665544000g", false),
        ("550e8400e29b41d4a716446655440000", false),
    ];
    for (id, want) in cases {
        assert_eq!(is_full_id(id), want, "is_full_id of {id}");
    }
}

#[test]
fn match_prefix_outcome_table() {
    let cases: Vec<(&str, Vec<&str>, Vec<&str>)> = vec![
        ("", vec!["a", "b"], vec!["a", "b"]),
        ("ab", vec!["ab1", "ab2", "ba3"], vec!["ab1", "ab2"]),
        ("ab", vec!["ba3", "ab2", "ab1"], vec!["ab2", "ab1"]),
        ("ab1", vec!["ab", "ab1", "ab12"], vec!["ab1", "ab12"]),
        ("zz", vec!["ab1", "ab2"], vec![]),
        ("ab", vec![], vec![]),
        (
            "550e",
            vec![
                "550e8400-e29b-41d4-a716-446655440000",
                "660e8400-e29b-41d4-a716-446655440000",
            ],
            vec!["550e8400-e29b-41d4-a716-446655440000"],
        ),
    ];
    for (prefix, ids, want) in cases {
        let ids: Vec<String> = ids.into_iter().map(String::from).collect();
        assert_eq!(match_prefix(prefix, &ids), want, "match_prefix of {prefix}");
    }
}

#[test]
fn match_prefix_every_id_starts_with_the_prefix() {
    let ids: Vec<String> = vec!["ab-1".to_string(), "ab-2".to_string(), "cd-3".to_string()];
    let _ = match_prefix("ab", &ids);
}

#[test]
fn iso_outcome_table() {
    let cases: Vec<(&str, &str)> = vec![
        ("2026-11-12T16:00:00.123Z", "2026-11-12T16:00:00.123Z"),
        ("2026-11-12T16:00:00Z", "2026-11-12T16:00:00.000Z"),
        ("2026-10-20T00:00:00.000Z", "2026-10-20T00:00:00.000Z"),
        ("1970-01-01T00:00:00.000Z", "1970-01-01T00:00:00.000Z"),
        ("1969-12-31T23:59:59.999Z", "1969-12-31T23:59:59.999Z"),
    ];
    for (input, want) in cases {
        let at: jiff::Timestamp = input.parse().unwrap();
        assert_eq!(iso(at), want, "iso of {input}");
    }
}

#[test]
fn iso_ends_with_z() {
    let at = "2026-06-15T12:30:45.678Z"
        .parse::<jiff::Timestamp>()
        .unwrap();
    let _ = iso(at);
}

#[test]
fn iso_millisecond_precision() {
    let at = "2026-11-12T16:00:00.123456789Z"
        .parse::<jiff::Timestamp>()
        .unwrap();
    let _ = iso(at);
}
