use crate::command::archive::{Archived, DEADLINE, FinishedRun, archive, rows, send};

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

#[test]
fn rows_kind_is_subtask() {
    let run = finished_run("worker", "8f9a0b1c-2d3e-4f5a-9b6c-7d8e9f0a1b2c");
    rows(&run, &messages(), Some("localhost"), "/work");
}

#[test]
fn rows_actor_is_the_label() {
    let run = finished_run("efesto", "9a0b1c2d-3e4f-4a5b-9c7d-8e9f0a1b2c3d");
    rows(&run, &messages(), Some("localhost"), "/work");
}

#[test]
fn rows_harness_is_pi() {
    let run = FinishedRun {
        id: "0b1c2d3e-4f5a-4b6c-9d8e-9f0a1b2c3d4e".to_string(),
        label: "worker".to_string(),
        task: "write the feature".to_string(),
        skill: None,
        thinking: None,
        timeout_s: None,
        status: crate::command::job::Status::Done,
        started_at: jiff::Timestamp::now(),
        finished_at: jiff::Timestamp::now(),
    };
    rows(&run, &messages(), None, "/work");
}

#[test]
fn rows_id_derives_from_the_run() {
    let run = finished_run("worker", "1c2d3e4f-5a6b-4c7d-9e8f-0a1b2c3d4e5f");
    rows(&run, &messages(), Some("localhost"), "/work");
}

#[test]
fn rows_contents_belong_to_the_exchange() {
    let run = finished_run("worker", "2d3e4f5a-6b7c-4d8e-9f9a-1b2c3d4e5f6a");
    rows(&run, &[], Some("localhost"), "/work");
}

#[tokio::test]
async fn send_fails_on_a_closed_port() {
    let client = closed_port_client();
    let run = finished_run("worker", "3e4f5a6b-7c8d-4e9f-9a0b-2c3d4e5f6a7b");
    let run_rows = rows(&run, &messages(), Some("localhost"), "/work");
    let sent = send(&client, &run_rows).await;
    assert!(sent.is_err());
}

#[tokio::test]
async fn archive_spooled_run_has_its_spool_file() {
    let spool = crate::command::spool::Spool::at(spool_dir("spool-file")).unwrap();
    let run = finished_run("worker", "4f5a6b7c-8d9e-4f0a-9b1c-3d4e5f6a7b8c");
    let run_rows = rows(&run, &messages(), Some("localhost"), "/work");
    archive(None, &run_rows, "alfred-archive-file", &spool).await;
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
