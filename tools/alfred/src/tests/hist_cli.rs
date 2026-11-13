use crate::hist::cli::{HistCommand, get_json, low_score_hint, pretty, render_episodes, run};

fn hit(id: &str, from: &str, summary: &str) -> crate::hist::EpisodeHit {
    crate::hist::EpisodeHit {
        episode: crate::hist::Episode {
            id: id.to_owned(),
            session: "6f1c2f30-9f30-45c0-8f8e-1a2b3c4d5e6f".to_owned(),
            exchanges: vec!["7d2e3a40-8e41-46d1-9a9f-2b3c4d5e6f70".to_owned()],
            from: from.to_owned(),
            to: "2026-10-02T18:30:10.789Z".to_owned(),
            summary: summary.to_owned(),
            extractor: 1,
            model: "claude-sonnet-4-5".to_owned(),
            created: "2026-10-02T18:30:10.789Z".to_owned(),
        },
        score: 0.5,
    }
}

fn offline_url() {
    unsafe { std::env::set_var("ALFRED_URL", "notaurl") };
}

#[test]
fn render_episodes_of_no_hits_reaches_the_empty_contract() {
    render_episodes(&[]);
}

#[test]
fn render_episodes_of_many_hits_reaches_the_block_contract() {
    let hits = vec![
        hit(
            "2c3d4e5f-6a70-4b1c-8d2e-3f4a5b6c7d8e",
            "2026-09-30T14:23:51.123Z",
            "Riley reviews the render contract",
        ),
        hit(
            "3d4e5f6a-7b80-4c1d-9e2f-4a5b6c7d8e9f",
            "2026-10-01T09:15:00.456Z",
            "Kokirit opens the archive, even with -- marks inside",
        ),
        hit(
            "4e5f6a7b-8c90-4d1e-8f2a-5b6c7d8e9f0a",
            "2026-10-02T18:30:10.789Z",
            "Aristotele tidies the notes",
        ),
    ];
    render_episodes(&hits);
}

#[test]
fn render_episodes_prints_the_tl_blocks() {
    let cases: Vec<(Vec<crate::hist::EpisodeHit>, String)> = vec![
        (Vec::new(), String::new()),
        (
            vec![hit(
                "1b2c3d4e-5f60-4a1b-9c2d-3e4f5a6b7c8d",
                "2026-09-30T14:23:51.123Z",
                "Riley reviews the render contract",
            )],
            "-- 1b2c3d4e 2026-09-30\nRiley reviews the render contract\n".to_owned(),
        ),
        (
            vec![hit(
                "a1b2c3d4",
                "2026-10-01T09:15:00.456Z",
                "Kokirit opens the archive",
            )],
            "-- a1b2c3d4 2026-10-01\nKokirit opens the archive\n".to_owned(),
        ),
        (
            vec![hit(
                "b2c3d4e5f",
                "2026-10-01T09:15:00.456Z",
                "Riley trims the id",
            )],
            "-- b2c3d4e5 2026-10-01\nRiley trims the id\n".to_owned(),
        ),
        (
            vec![
                hit(
                    "5f6a7b8c-9d01-4e2f-8a3b-4c5d6e7f8a9b",
                    "2026-10-01T09:15:00.456Z",
                    "Kokirit opens the archive",
                ),
                hit(
                    "0a1b2c3d-4e5f-4607-8a9b-0c1d2e3f4a5b",
                    "2026-10-02T18:30:10.789Z",
                    "Riley closes the archive",
                ),
            ],
            "-- 5f6a7b8c 2026-10-01\nKokirit opens the archive\n-- 0a1b2c3d 2026-10-02\nRiley closes the archive\n"
                .to_owned(),
        ),
    ];
    for (hits, expected) in cases {
        assert_eq!(render_episodes(&hits), expected);
    }
}

#[test]
fn low_score_hint_reaches_the_wording_contract() {
    low_score_hint(0.30, 0.15);
}

#[test]
fn low_score_hint_prints_the_tl_wording() {
    let cases: Vec<(f32, f32, String)> = vec![
        (
            0.30,
            0.15,
            "No episode scores 0.3 or more. The best is 0.150: try --min-score 0.1.".to_owned(),
        ),
        (
            0.99,
            0.123,
            "No episode scores 0.99 or more. The best is 0.123: try --min-score 0.1.".to_owned(),
        ),
        (
            0.9,
            0.8,
            "No episode scores 0.9 or more. The best is 0.800: try --min-score 0.8.".to_owned(),
        ),
        (
            0.9,
            0.79,
            "No episode scores 0.9 or more. The best is 0.790: try --min-score 0.7.".to_owned(),
        ),
        (
            0.1,
            0.056,
            "No episode scores 0.1 or more. The best is 0.056: try --min-score 0.0.".to_owned(),
        ),
    ];
    for (min_score, best, expected) in cases {
        assert_eq!(low_score_hint(min_score, best), expected);
    }
}

#[test]
fn pretty_prints_indented_json_with_a_trailing_newline() {
    assert_eq!(pretty(&vec![1_u32, 2]), "[\n  1,\n  2\n]\n");
    assert_eq!(pretty(&"third"), "\"third\"\n");
    assert_eq!(pretty(&None::<u32>), "null\n");
    assert_eq!(
        pretty(&crate::hist::ingest::Summary::default()),
        "{\n  \"transcripts\": 0,\n  \"sessions\": 0,\n  \"exchanges\": 0,\n  \"known\": 0,\n  \"orphans\": 0\n}\n"
    );
}

#[tokio::test]
async fn run_ingest_wants_exactly_one_of_transcript_session_or_all() {
    offline_url();
    let cases: Vec<(Option<std::path::PathBuf>, Option<String>, bool)> = vec![
        (None, None, false),
        (
            Some(std::path::PathBuf::from("a.jsonl")),
            Some("6f1c2f30".to_owned()),
            false,
        ),
        (Some(std::path::PathBuf::from("a.jsonl")), None, true),
        (None, Some("6f1c2f30".to_owned()), true),
        (
            Some(std::path::PathBuf::from("a.jsonl")),
            Some("6f1c2f30".to_owned()),
            true,
        ),
    ];
    for (transcript, session, all) in cases {
        let command = HistCommand::Ingest {
            transcript,
            session,
            all,
            since: None,
            refresh: false,
        };
        let error = run(command).await.unwrap_err();
        assert!(
            error
                .to_string()
                .contains("Use exactly one of --transcript, --session or --all.")
        );
    }
}

#[tokio::test]
async fn run_ingest_of_a_sessionless_transcript_prints_the_empty_summary() {
    offline_url();
    let path = std::env::temp_dir().join("alfred_hist_cli_sessionless.jsonl");
    std::fs::write(&path, "not json\n").unwrap();
    let command = HistCommand::Ingest {
        transcript: Some(path),
        session: None,
        all: false,
        since: None,
        refresh: false,
    };
    let text = run(command).await.unwrap();
    assert_eq!(
        text,
        "{\n  \"transcripts\": 1,\n  \"sessions\": 0,\n  \"exchanges\": 0,\n  \"known\": 0,\n  \"orphans\": 0\n}\n"
    );
}

#[tokio::test]
async fn run_ingest_of_a_missing_transcript_returns_an_error_value() {
    offline_url();
    let path = std::env::temp_dir().join("alfred_hist_cli_missing.jsonl");
    let _ = std::fs::remove_file(&path);
    let command = HistCommand::Ingest {
        transcript: Some(path),
        session: None,
        all: false,
        since: None,
        refresh: false,
    };
    let result = run(command).await;
    assert!(result.is_err());
}

#[tokio::test]
async fn run_turns_a_network_error_into_a_value() {
    offline_url();
    let command = HistCommand::Sessions {
        limit: 20,
        harness: None,
    };
    let result = run(command).await;
    assert!(result.is_err());
}

#[tokio::test]
async fn get_json_turns_a_network_error_into_a_value() {
    offline_url();
    let client = crate::client::Client::from_env().unwrap();
    let query = vec![("harness", "claude".to_owned()), ("limit", "20".to_owned())];
    let result: Result<Vec<crate::hist::Session>, crate::client::ClientError> =
        get_json(&client, "/hist/sessions", &query).await;
    assert!(result.is_err());
}
