use crate::command::archive::{Archived, DEADLINE, FinishedRun, archive, rows};

fn finished_run(label: &str, id: &str) -> FinishedRun {
    FinishedRun {
        id: id.to_string(),
        label: label.to_string(),
        task: "write the feature".to_string(),
        skill: Some("ritchie".to_string()),
        thinking: Some("low".to_string()),
        timeout_s: Some(600),
        status: crate::command::job::Status::Done,
        started_at: jiff::Timestamp::now(),
        finished_at: jiff::Timestamp::now(),
    }
}

fn messages() -> Vec<serde_json::Value> {
    vec![
        serde_json::json!({
            "role": "user",
            "content": [{"type": "text", "text": "write the feature"}]
        }),
        serde_json::json!({
            "role": "assistant",
            "model": "glm-5",
            "content": [{"type": "text", "text": "the feature is written"}],
            "usage": {"input": 10, "output": 5, "cacheRead": 0, "cacheWrite": 0, "cost": {"total": 0.25}}
        }),
    ]
}

fn spool_dir(name: &str) -> std::path::PathBuf {
    std::env::temp_dir().join(format!(
        "alfred-command-archive-{}-{}",
        name,
        std::process::id()
    ))
}

#[allow(unused_unsafe)]
fn closed_port_client() -> crate::client::Client {
    unsafe { std::env::set_var("ALFRED_URL", "http://127.0.0.1:9") };
    crate::client::Client::from_env()
        .expect("command_archive: ALFRED_URL points at a closed port")
        .with_timeout(DEADLINE)
}

#[tokio::test]
async fn archive_spools_when_there_is_no_client() {
    let spool = crate::command::spool::Spool::at(spool_dir("no-client")).unwrap();
    let run = finished_run("worker", "5a6b7c8d-9e0f-4a1b-9c2d-4e5f6a7b8c9d");
    let run_rows = rows(&run, &messages(), Some("localhost"), "/work");
    let archived = archive(None, &run_rows, "alfred-archive-none", &spool).await;
    assert_eq!(archived, Archived::Spooled);
}

#[tokio::test]
async fn archive_spools_when_send_fails() {
    let client = closed_port_client();
    let spool = crate::command::spool::Spool::at(spool_dir("closed-port")).unwrap();
    let run = finished_run("worker", "6b7c8d9e-0f1a-4b2c-9d3e-5f6a7b8c9d0e");
    let run_rows = rows(&run, &messages(), Some("localhost"), "/work");
    let archived = archive(Some(&client), &run_rows, "alfred-archive-port", &spool).await;
    assert_eq!(archived, Archived::Spooled);
}

#[test]
fn rows_fill_the_three_hist_rows() {
    let run = finished_run("worker", "7c8d9e0f-1a2b-4c3d-9e4f-6a7b8c9d0e1f");
    let got = rows(&run, &messages(), Some("deck"), "/work");
    assert_eq!(got.session.id, run.id);
    assert_eq!(got.session.host.as_deref(), Some("deck"));
    assert_eq!(got.session.path.as_deref(), Some("/work"));
    assert_eq!(got.exchange.session, run.id);
    assert_eq!(got.exchange.kind, "subtask");
    assert_eq!(got.exchange.actor, "worker");
    assert_eq!(got.exchange.model.as_deref(), Some("glm-5"));
    assert_eq!(got.exchange.tokens_in, Some(10));
    assert_eq!(got.exchange.tokens_out, Some(5));
    assert_eq!(got.contents.input, "write the feature");
    assert_eq!(got.contents.output, "the feature is written");
    let meta = got.exchange.meta.expect("rows: meta is set");
    assert_eq!(meta["status"], "done");
    assert_eq!(meta["timeout_s"], 600);
    assert_eq!(meta["thinking"], "low");
    assert_eq!(meta["skill"], "ritchie");
    assert_eq!(meta["cost_usd"], 0.25);
}
