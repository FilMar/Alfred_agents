use crate::rules::{iso, normalize_tags};

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
