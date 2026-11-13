use crate::hist::{Episode, EpisodeHit, Extraction, Extractor, Health, HistError, NewExtraction};

#[allow(unused_imports)]
use super::*;

#[test]
fn new_extraction_defaults_the_optional_fields() {
    let row: NewExtraction = serde_json::from_str(
        r#"{"extractor_id":1,"run":"r1","exchange_id":"00000000-0000-0000-0000-000000000011","kind":"note","body":"{}","quote":"q","created":"2026-01-02T03:04:05.000Z"}"#,
    )
    .unwrap();
    assert_eq!(row.extractor_id, 1);
    assert_eq!(row.run, "r1");
    assert_eq!(row.kind, "note");
    assert_eq!(row.dropped_by, None);
    assert_eq!(row.probabilities, None);
    assert_eq!(row.verdict, None);
    assert_eq!(row.of, None);
    assert_eq!(row.saved_id, None);

    let row: NewExtraction = serde_json::from_str(
        r#"{"extractor_id":1,"run":"r1","exchange_id":"00000000-0000-0000-0000-000000000011","kind":"rule","body":"{}","quote":"q","dropped_by":"check:no","probabilities":"[0.9]","verdict":"keep","of":"other","saved_id":"00000000-0000-0000-0000-000000000012","created":"2026-01-02T03:04:05.000Z"}"#,
    )
    .unwrap();
    assert_eq!(row.dropped_by, Some("check:no".to_string()));
    assert_eq!(row.probabilities, Some("[0.9]".to_string()));
    assert_eq!(row.verdict, Some("keep".to_string()));
    assert_eq!(row.of, Some("other".to_string()));
    assert_eq!(
        row.saved_id,
        Some("00000000-0000-0000-0000-000000000012".to_string())
    );
}

#[test]
fn extraction_json_flattens_the_row() {
    let extraction = Extraction {
        id: 9,
        row: NewExtraction {
            extractor_id: 1,
            run: "r1".to_string(),
            exchange_id: "00000000-0000-0000-0000-000000000011".to_string(),
            kind: "note".to_string(),
            body: "{}".to_string(),
            quote: "q".to_string(),
            dropped_by: None,
            probabilities: None,
            verdict: None,
            of: None,
            saved_id: None,
            created: "2026-01-02T03:04:05.000Z".to_string(),
        },
    };
    let got = serde_json::to_value(&extraction).unwrap();
    let want: serde_json::Value = serde_json::from_str(
        r#"{"id":9,"extractor_id":1,"run":"r1","exchange_id":"00000000-0000-0000-0000-000000000011","kind":"note","body":"{}","quote":"q","dropped_by":null,"probabilities":null,"verdict":null,"of":null,"saved_id":null,"created":"2026-01-02T03:04:05.000Z"}"#,
    )
    .unwrap();
    assert_eq!(got, want);
    assert!(got.get("row").is_none());
    let back: Extraction = serde_json::from_value(got).unwrap();
    assert_eq!(back, extraction);
}

#[test]
fn extractor_json_keeps_active_as_a_boolean() {
    let extractor = Extractor {
        id: 1,
        parent: None,
        why: "why".to_string(),
        active: true,
        config: "{}".to_string(),
        created: "2026-01-02T03:04:05.000Z".to_string(),
    };
    let got = serde_json::to_value(&extractor).unwrap();
    let want: serde_json::Value = serde_json::from_str(
        r#"{"id":1,"parent":null,"why":"why","active":true,"config":"{}","created":"2026-01-02T03:04:05.000Z"}"#,
    )
    .unwrap();
    assert_eq!(got, want);
    let back: Extractor = serde_json::from_value(got).unwrap();
    assert_eq!(back, extractor);
}

#[test]
fn episode_json_round_trips() {
    let episode = Episode {
        id: "00000000-0000-0000-0000-000000000021".to_string(),
        session: "00000000-0000-0000-0000-000000000001".to_string(),
        exchanges: vec![
            "00000000-0000-0000-0000-000000000011".to_string(),
            "00000000-0000-0000-0000-000000000012".to_string(),
        ],
        from: "2026-01-02T03:04:05.000Z".to_string(),
        to: "2026-01-02T03:09:05.000Z".to_string(),
        summary: "two turns".to_string(),
        extractor: 2,
        model: "m".to_string(),
        created: "2026-01-02T03:10:05.000Z".to_string(),
    };
    let got = serde_json::to_value(&episode).unwrap();
    let want: serde_json::Value = serde_json::from_str(
        r#"{"id":"00000000-0000-0000-0000-000000000021","session":"00000000-0000-0000-0000-000000000001","exchanges":["00000000-0000-0000-0000-000000000011","00000000-0000-0000-0000-000000000012"],"from":"2026-01-02T03:04:05.000Z","to":"2026-01-02T03:09:05.000Z","summary":"two turns","extractor":2,"model":"m","created":"2026-01-02T03:10:05.000Z"}"#,
    )
    .unwrap();
    assert_eq!(got, want);
    let back: Episode = serde_json::from_value(got).unwrap();
    assert_eq!(back, episode);
}

#[test]
fn episode_hit_json_keeps_episode_and_score() {
    let episode = Episode {
        id: "00000000-0000-0000-0000-000000000021".to_string(),
        session: "00000000-0000-0000-0000-000000000001".to_string(),
        exchanges: vec![
            "00000000-0000-0000-0000-000000000011".to_string(),
            "00000000-0000-0000-0000-000000000012".to_string(),
        ],
        from: "2026-01-02T03:04:05.000Z".to_string(),
        to: "2026-01-02T03:09:05.000Z".to_string(),
        summary: "two turns".to_string(),
        extractor: 2,
        model: "m".to_string(),
        created: "2026-01-02T03:10:05.000Z".to_string(),
    };
    let hit = EpisodeHit {
        episode: episode.clone(),
        score: 0.5,
    };
    let got = serde_json::to_value(&hit).unwrap();
    let want: serde_json::Value = serde_json::from_str(
        r#"{"episode":{"id":"00000000-0000-0000-0000-000000000021","session":"00000000-0000-0000-0000-000000000001","exchanges":["00000000-0000-0000-0000-000000000011","00000000-0000-0000-0000-000000000012"],"from":"2026-01-02T03:04:05.000Z","to":"2026-01-02T03:09:05.000Z","summary":"two turns","extractor":2,"model":"m","created":"2026-01-02T03:10:05.000Z"},"score":0.5}"#,
    )
    .unwrap();
    assert_eq!(got, want);
    let back: EpisodeHit = serde_json::from_value(got).unwrap();
    assert_eq!(back.episode, episode);
    assert_eq!(back.score, 0.5);
}

#[test]
fn health_json_round_trips() {
    let health = Health {
        ok: true,
        sessions: 2,
        exchanges: 3,
        contents: 4,
    };
    let got = serde_json::to_value(&health).unwrap();
    let want: serde_json::Value =
        serde_json::from_str(r#"{"ok":true,"sessions":2,"exchanges":3,"contents":4}"#).unwrap();
    assert_eq!(got, want);
    let back: Health = serde_json::from_value(got).unwrap();
    assert!(back.ok);
    assert_eq!(back.sessions, 2);
    assert_eq!(back.exchanges, 3);
    assert_eq!(back.contents, 4);
}

#[test]
fn hist_error_display_messages() {
    assert_eq!(
        HistError::BadInput("harness must be claude or pi".to_string()).to_string(),
        "harness must be claude or pi"
    );
    assert_eq!(
        HistError::NotFound("exchange not found".to_string()).to_string(),
        "exchange not found"
    );
    assert_eq!(
        HistError::Ambiguous {
            prefix: "ab".to_string(),
            count: 3,
            ids: vec!["a".to_string(), "b".to_string(), "c".to_string()],
        }
        .to_string(),
        "ambiguous id ab: 3 episodes match"
    );
    assert_eq!(
        HistError::BadEpisode {
            id: "00000000-0000-0000-0000-000000000021".to_string(),
            reason: "bad summary".to_string(),
        }
        .to_string(),
        "bad episode 00000000-0000-0000-0000-000000000021: bad summary"
    );
    assert!(
        HistError::Db(rusqlite::Error::QueryReturnedNoRows)
            .to_string()
            .starts_with("archive: ")
    );
}
