use crate::hist::ingest::injection::{injections_of, is_short_id, rules_of};

const SESSION: &str = "11111111-1111-1111-1111-111111111111";

fn user_line() -> crate::hist::ingest::line::Line {
    serde_json::from_value::<crate::hist::ingest::line::Line>(serde_json::json!({
        "type": "user",
        "uuid": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "sessionId": SESSION,
        "timestamp": "2026-01-02T03:04:05.678Z",
        "origin": { "kind": "human" },
        "message": { "role": "user", "content": "ciao" }
    }))
    .unwrap()
}

fn hook_attachment(contents: &[&str]) -> crate::hist::ingest::line::Line {
    serde_json::from_value::<crate::hist::ingest::line::Line>(serde_json::json!({
        "type": "attachment",
        "parentUuid": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "attachment": {
            "type": "hook_additional_context",
            "hookEvent": "UserPromptSubmit",
            "hookName": "UserPromptSubmit",
            "content": contents
        }
    }))
    .unwrap()
}

#[test]
fn is_short_id_table() {
    assert!(is_short_id("9d3685f9"));
    assert!(is_short_id("58708950"));
    assert!(is_short_id("00000000"));
    assert!(is_short_id("99999999"));
    assert!(is_short_id("aaaaaaaa"));
    assert!(is_short_id("ffffffff"));

    assert!(!is_short_id(""));
    assert!(!is_short_id("9d3685f"));
    assert!(!is_short_id("9d3685f90"));
    assert!(!is_short_id("////////"));
    assert!(!is_short_id("::::::::"));
    assert!(!is_short_id("````````"));
    assert!(!is_short_id("gggggggg"));
    assert!(!is_short_id("9D3685F9"));
    assert!(!is_short_id("9d3685g9"));
    assert!(!is_short_id("9d3685f "));
    assert!(!is_short_id("éééé"));
}

#[test]
fn rules_of_no_rules_without_the_header() {
    let _ = rules_of("-- 9d3685f9\nprima azione");
    let _ = rules_of("ciao\n## Rule matches\n-- 9d3685f9\nprima azione");
    let _ = rules_of("## rule matches\n-- 9d3685f9\nprima azione");
}

#[test]
fn rules_of_every_ref_is_a_short_id() {
    let _ = rules_of(
        "## Rule matches\n-- 9d3685f9\nprima azione\nseconda azione\n-- 58708950\naltra azione",
    );
    let _ = rules_of("## Rule matches\n-- 9d3685f9\nprima azione\n-- 9d3685f\nseconda azione");
    let _ = rules_of("## Rule matches\n-- 9d3685f9\nprima azione\n-- 9D3685F9\nseconda azione");
    let _ = rules_of("## Rule matches\n-- 9d3685f9\nprima azione\n-- 9d3685g9\nseconda azione");
    let _ = rules_of("## Rule matches\n-- 9d3685f9\nprima azione\n-- 58708950 \nseconda azione");
}

#[test]
fn rules_of_every_rule_has_actions() {
    let _ = rules_of(
        "## Rule matches\n\n-- 9d3685f9\nprima azione\nseconda azione\n-- 58708950\naltra azione",
    );
    let _ = rules_of("## Rule matches\n\n-- 9d3685f9\n\n-- 58708950\naltra azione");
    let _ = rules_of("## Rule matches\n\n-- 9d3685f9\nprima azione\n-- 58708950");
}

#[test]
fn injections_of_every_row_is_a_rule() {
    let opener = user_line();
    let attachment = hook_attachment(&[
        "## Rule matches\n-- 9d3685f9\nprima azione\nseconda azione\n-- 58708950\naltra azione",
    ]);
    let span = crate::hist::ingest::transcript::Span {
        opener: &opener,
        body: vec![&attachment],
    };
    let _ = injections_of(
        crate::hist::ingest::harness::Harness::Claude,
        SESSION,
        &span,
    );
}

#[test]
fn injections_of_every_row_is_of_the_exchange_of_the_span() {
    let opener = user_line();
    let first = hook_attachment(&["## Rule matches\n-- 9d3685f9\nprima azione"]);
    let second = hook_attachment(&["## Rule matches\n-- 58708950\naltra azione"]);
    let span = crate::hist::ingest::transcript::Span {
        opener: &opener,
        body: vec![&first, &second],
    };
    let _ = injections_of(
        crate::hist::ingest::harness::Harness::Claude,
        SESSION,
        &span,
    );
}

#[test]
fn injections_of_a_rule_once_per_exchange() {
    let opener = user_line();
    let first = hook_attachment(&["## Rule matches\n-- 9d3685f9\nprima azione"]);
    let second = hook_attachment(&["## Rule matches\n-- 9d3685f9\nseconda azione"]);
    let twice = crate::hist::ingest::transcript::Span {
        opener: &opener,
        body: vec![&first, &second],
    };
    let _ = injections_of(
        crate::hist::ingest::harness::Harness::Claude,
        SESSION,
        &twice,
    );

    let repeated = hook_attachment(&[
        "## Rule matches\n-- 9d3685f9\nprima azione\n-- 9d3685f9\nseconda azione",
    ]);
    let once = crate::hist::ingest::transcript::Span {
        opener: &opener,
        body: vec![&repeated],
    };
    let _ = injections_of(
        crate::hist::ingest::harness::Harness::Claude,
        SESSION,
        &once,
    );
}

fn pairs(rows: &[(&str, &str)]) -> Vec<(String, String)> {
    rows.iter()
        .map(|(id, actions)| ((*id).to_string(), (*actions).to_string()))
        .collect()
}

#[test]
fn rules_of_outcome_table() {
    let cases: &[(&str, &[(&str, &str)])] = &[
        (
            "## Rule matches\n-- 9d3685f9\nprima azione\nseconda azione\n-- 58708950\naltra azione",
            &[
                ("9d3685f9", "prima azione\nseconda azione"),
                ("58708950", "altra azione"),
            ],
        ),
        (
            "## Rule matches\n\n-- 9d3685f9\nprima azione\n",
            &[("9d3685f9", "prima azione")],
        ),
        (
            "## Rule matches\n-- 9d3685f9\nprima azione\n-- non una testa\nterza",
            &[("9d3685f9", "prima azione\n-- non una testa\nterza")],
        ),
        (
            "## Rule matches\nriga persa\n-- 9d3685f9\nprima azione",
            &[("9d3685f9", "prima azione")],
        ),
        (
            "## Rule matches\n-- 9d3685f9\n-- 58708950\naltra azione",
            &[("58708950", "altra azione")],
        ),
        ("## Rule matches", &[]),
        ("-- 9d3685f9\nprima azione", &[]),
        ("", &[]),
    ];
    for (text, expected) in cases {
        assert_eq!(rules_of(text), pairs(expected), "{text:?}");
    }
}

#[test]
fn injections_of_outcome_table() {
    let opener = user_line();
    let first =
        hook_attachment(&["## Rule matches\n-- 9d3685f9\nprima azione\n-- 58708950\naltra azione"]);
    let second = hook_attachment(&["## Rule matches\n-- 9d3685f9\nazione tardiva"]);
    let span = crate::hist::ingest::transcript::Span {
        opener: &opener,
        body: vec![&first, &second],
    };
    let row = |reference: &str, text: &str| crate::hist::Injection {
        exchange_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa".to_string(),
        kind: "rule".to_string(),
        reference: reference.to_string(),
        text: text.to_string(),
    };
    assert_eq!(
        injections_of(
            crate::hist::ingest::harness::Harness::Claude,
            SESSION,
            &span
        ),
        vec![
            row("9d3685f9", "prima azione"),
            row("58708950", "altra azione")
        ]
    );
    assert_eq!(
        injections_of(crate::hist::ingest::harness::Harness::Pi, SESSION, &span),
        Vec::new()
    );
}
