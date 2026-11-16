mod of;
mod read;

pub(super) use crate::distill::session::{Noise, PENDING_CAP, SessionRead, Turn, pending_sessions};

pub(super) fn seed(db: &crate::hist::db::HistDb, exchanges: &[crate::hist::Exchange]) {
    let sessions: Vec<crate::hist::Session> = exchanges
        .iter()
        .map(|e| crate::hist::Session {
            id: e.session.clone(),
            started: "2026-01-01T00:00:00.000Z".to_string(),
            harness: None,
            host: None,
            path: None,
        })
        .collect();
    db.upsert_sessions(&sessions).unwrap();
    db.upsert_exchanges(exchanges).unwrap();
}

pub(super) fn temp_db() -> crate::hist::db::HistDb {
    crate::hist::db::HistDb::open(&crate::tests::distill_bench::temp_path("session")).unwrap()
}

pub(super) fn uuid(tag: u64) -> String {
    format!("{tag:08x}-0000-4000-8000-{tag:012x}")
}

pub(super) fn session(tag: u64) -> String {
    format!("f{tag:07x}-0000-4000-8000-000000000000")
}

pub(super) fn ts(second: i64) -> String {
    format!(
        "2026-01-01T{:02}:{:02}:{:02}.000Z",
        second / 3600,
        (second / 60) % 60,
        second % 60
    )
}

pub(super) fn exchange(
    id: &str,
    session: &str,
    timestamp: &str,
    kind: &str,
    trigger: Option<&str>,
    distilled: bool,
) -> crate::hist::Exchange {
    crate::hist::Exchange {
        id: id.to_string(),
        session: session.to_string(),
        timestamp: timestamp.to_string(),
        kind: kind.to_string(),
        meta: trigger.map(|t| serde_json::json!({ "trigger": t })),
        distilled: distilled.then(|| "2026-01-01T00:00:00.000Z".to_string()),
        parent: None,
        actor: "alfredo".to_string(),
        model: None,
        tokens_in: None,
        tokens_out: None,
        tokens_cache_read: None,
        tokens_cache_write: None,
    }
}

pub(super) fn contents(id: &str, input: &str, output: &str) -> crate::hist::Contents {
    crate::hist::Contents {
        exchange_id: id.to_string(),
        input: input.to_string(),
        output: output.to_string(),
        tools: None,
    }
}

pub(super) fn turn(
    id: &str,
    session: &str,
    timestamp: &str,
    kind: &str,
    trigger: Option<&str>,
    input: &str,
    output: &str,
) -> Turn {
    Turn::of(
        exchange(id, session, timestamp, kind, trigger, false),
        contents(id, input, output),
    )
}

pub(super) fn ids(turns: &[Turn]) -> Vec<String> {
    turns.iter().map(|t| t.id().to_string()).collect()
}

pub(super) fn ref_ids(turns: &[&Turn]) -> Vec<String> {
    turns.iter().map(|t| t.id().to_string()).collect()
}

pub(super) fn cap_db(pending: i64, distilled: i64) -> crate::hist::db::HistDb {
    let db = temp_db();
    let s = session(1);
    let tags: Vec<(u64, i64, bool)> = (0..pending)
        .map(|k| (k, false))
        .chain((0..distilled).map(|k| (k, true)))
        .enumerate()
        .map(|(tag, (k, done))| (tag as u64, k, done))
        .collect();
    let exchanges: Vec<_> = tags
        .iter()
        .map(|(tag, k, done)| exchange(&uuid(*tag), &s, &ts(*k), "chat", None, *done))
        .collect();
    let rows: Vec<_> = tags
        .iter()
        .map(|(tag, _, _)| contents(&uuid(*tag), "in", "out"))
        .collect();
    seed(&db, &exchanges);
    db.upsert_contents(&rows).unwrap();
    db
}

#[test]
#[should_panic(expected = "Turn.of: the contents belong to the exchange")]
fn turn_of_rejects_contents_of_another_exchange() {
    let e = exchange(&uuid(1), &session(1), &ts(1), "chat", None, false);
    let c = contents(&uuid(2), "in", "out");
    let _ = Turn::of(e, c);
}

#[test]
fn noise_classifies_each_kind() {
    let cases: Vec<(&str, Option<&str>, &str, Option<Noise>)> = vec![
        ("subtask", None, "done", Some(Noise::Delegated)),
        (
            "subtask",
            Some("task-notification"),
            "done",
            Some(Noise::Delegated),
        ),
        ("subtask", None, "API Error: 500", Some(Noise::Delegated)),
        (
            "chat",
            Some("task-notification"),
            "done",
            Some(Noise::TaskNotification),
        ),
        (
            "chat",
            Some("task-notification"),
            "API Error: 500",
            Some(Noise::TaskNotification),
        ),
        ("chat", None, "API Error: 500", Some(Noise::HarnessError)),
        ("chat", None, "   API Error: 500", Some(Noise::HarnessError)),
        ("chat", None, "api error: 500", None),
        ("chat", None, "raised API Error: 500", None),
        ("chat", Some("manual"), "done", None),
        ("chat", None, "", None),
    ];
    for (kind, trigger, output, expected) in cases {
        let t = turn(&uuid(1), &session(1), &ts(1), kind, trigger, "in", output);
        assert_eq!(
            t.noise(),
            expected,
            "kind={kind} trigger={trigger:?} output={output}"
        );
    }
}
