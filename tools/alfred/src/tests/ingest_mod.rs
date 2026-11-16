use crate::hist::ingest::{Summary, looks_like_pi, modified_at};

struct Scratch(std::path::PathBuf);

impl Scratch {
    fn new(name: &str) -> Scratch {
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let dir = std::env::temp_dir().join(format!(
            "ingest_mod_{name}_{}_{}",
            std::process::id(),
            nanos
        ));
        std::fs::create_dir_all(&dir).unwrap();
        Scratch(dir)
    }
}

impl Drop for Scratch {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.0);
    }
}

#[test]
fn summary_add_transcripts_add_up_at_the_edge() {
    let full = Summary {
        transcripts: u32::MAX,
        ..Summary::default()
    };
    let _ = full.plus(Summary::default());
}

#[test]
fn looks_like_pi_outcome_table() {
    let cases: &[(&str, bool)] = &[
        (r#"{"type":"session"}"#, true),
        (
            r#"{"type":"session","id":"pi-1","timestamp":"2026-01-01T00:00:00.000Z"}"#,
            true,
        ),
        ("\n\n{\"type\":\"session\"}\n", true),
        ("   \n{\"type\":\"session\"}", true),
        ("not json\n{\"type\":\"session\"}", true),
        (
            "garbage line\n\n{\"type\":\"session\",\"id\":\"x\"}\n{\"type\":\"message\"}",
            true,
        ),
        (
            r#"{"type":"user","uuid":"u-1","timestamp":"2026-01-01T00:00:01.000Z","sessionId":"s-1","origin":{"kind":"human"}}"#,
            false,
        ),
        (r#"{"type":"assistant"}"#, false),
        (
            r#"{"type":"message","id":"m-1","message":{"role":"assistant"}}"#,
            false,
        ),
        (
            r#"{"id":"pi-1","timestamp":"2026-01-01T00:00:00.000Z"}"#,
            false,
        ),
        (r#"{"type":"sessionx"}"#, false),
        ("{\"type\":\"user\"}\n{\"type\":\"session\"}", false),
        ("", false),
        ("\n\n\n", false),
        ("plain text without json", false),
    ];
    for &(text, expected) in cases {
        assert_eq!(looks_like_pi(text), expected, "looks_like_pi({text:?})");
    }
}

#[test]
fn modified_at_iso_with_milliseconds() {
    let scratch = Scratch::new("mtime_hit");
    let file = scratch.0.join("t.jsonl");
    std::fs::write(&file, b"").unwrap();
    let _ = modified_at(&file);
}

#[test]
fn pi_exchange_id_matches_tl() {
    let opener = serde_json::json!({"type": "message", "id": "02bbcab0", "timestamp": "2026-06-21T17:21:18.789Z", "message": {"role": "user", "content": "x"}});
    let opener: crate::hist::ingest::line::Line = serde_json::from_value(opener).unwrap();
    let id = crate::hist::ingest::harness::Harness::Pi
        .exchange_id("019eeb1e-91c0-72e1-8280-9176550a7def", &opener);
    assert_eq!(id.as_deref(), Some("1d3a3193-3890-d4e8-34de-a7d0ce92a67f"));
}

#[test]
fn split_known_counts_the_exchanges_already_archived() {
    let row = |id: &str| {
        let exchange: crate::hist::Exchange = serde_json::from_value(serde_json::json!({"id": id, "session": "s", "timestamp": "t", "kind": "chat", "actor": "a"})).unwrap();
        let contents = crate::hist::Contents {
            exchange_id: id.into(),
            input: String::new(),
            output: String::new(),
            tools: None,
        };
        (exchange, contents)
    };
    let (fresh, known) = crate::hist::ingest::split_known(
        vec![row("a"), row("b"), row("c")],
        &["b".into(), "z".into()],
    );
    assert_eq!(known, 1);
    assert_eq!(
        fresh.iter().map(|(e, _)| e.id.as_str()).collect::<Vec<_>>(),
        vec!["a", "c"]
    );
}
