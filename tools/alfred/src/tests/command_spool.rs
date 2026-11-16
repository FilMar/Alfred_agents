use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::time::Duration;

use crate::client::Client;
use crate::command::archive::RunRows;
use crate::command::spool::{Drained, Spool, state_dir};
use crate::hist::{Contents, Exchange, Session};

fn scratch(tag: &str) -> PathBuf {
    static NEXT: AtomicUsize = AtomicUsize::new(0);
    let n = NEXT.fetch_add(1, Ordering::SeqCst);
    let pid = std::process::id();
    std::env::temp_dir().join(format!("alfred-spool-{pid}-{tag}-{n}"))
}

fn rows() -> RunRows {
    RunRows {
        session: Session {
            id: "session-1".to_owned(),
            started: "2026-11-16T10:00:00Z".to_owned(),
            harness: Some("pi".to_owned()),
            host: Some("box".to_owned()),
            path: Some("/tmp/ritchie".to_owned()),
        },
        exchange: Exchange {
            id: "exchange-1".to_owned(),
            session: "session-1".to_owned(),
            parent: None,
            timestamp: "2026-11-16T10:00:01Z".to_owned(),
            kind: "subtask".to_owned(),
            actor: "debate".to_owned(),
            model: Some("sonnet".to_owned()),
            tokens_in: Some(120),
            tokens_out: Some(340),
            tokens_cache_read: None,
            tokens_cache_write: None,
            distilled: None,
            meta: None,
        },
        contents: Contents {
            exchange_id: "exchange-1".to_owned(),
            input: "run the debate".to_owned(),
            output: "the debate ran".to_owned(),
            tools: None,
        },
    }
}

fn closed_port_client() -> Client {
    unsafe { std::env::set_var("ALFRED_URL", "http://127.0.0.1:9") };
    Client::from_env()
        .unwrap()
        .with_timeout(Duration::from_secs(2))
}

fn sorted(mut paths: Vec<PathBuf>) -> Vec<PathBuf> {
    paths.sort();
    paths
}

#[test]
fn state_dir_prefers_xdg_state_home() {
    let state = scratch("state-xdg");
    let dir = state_dir(Some(state.clone().into_os_string()), Path::new("/home/who"));
    assert_eq!(dir, state.join("alfred").join("spool"));
}

#[test]
fn state_dir_falls_back_to_local_state_under_home() {
    let home = scratch("state-home");
    let dir = state_dir(None, &home);
    assert_eq!(
        dir,
        home.join(".local")
            .join("state")
            .join("alfred")
            .join("spool")
    );
}

#[test]
fn at_ends_up_on_an_existing_directory() {
    Spool::at(scratch("at-missing")).unwrap();
    let existing = scratch("at-existing");
    std::fs::create_dir_all(&existing).unwrap();
    Spool::at(existing).unwrap();
    Spool::at(scratch("at-nested").join("deep").join("er")).unwrap();
}

#[test]
fn dir_returns_the_directory_given_to_at() {
    let dir = scratch("dir");
    let spool = Spool::at(dir.clone()).unwrap();
    assert_eq!(spool.dir(), dir.as_path());
}

#[test]
fn path_names_the_job_file() {
    let dir = scratch("path");
    let spool = Spool::at(dir.clone()).unwrap();
    assert_eq!(spool.path("alfred-one"), dir.join("alfred-one.unarchived"));
}

#[test]
#[should_panic(expected = "Spool.write: a job name")]
fn write_rejects_a_name_without_the_prefix() {
    let spool = Spool::at(scratch("write-rejects")).unwrap();
    let _ = spool.write("alfred", &rows());
}

#[test]
fn write_reads_back_the_same_rows() {
    let spool = Spool::at(scratch("write")).unwrap();
    spool.write("alfred-one", &rows()).unwrap();
    spool.write("alfred-", &rows()).unwrap();
}

#[test]
fn files_lists_only_alfred_unarchived() {
    let dir = scratch("files");
    let spool = Spool::at(dir.clone()).unwrap();
    std::fs::write(dir.join("junk.unarchived"), b"no").unwrap();
    std::fs::write(dir.join("alfred-plain"), b"no").unwrap();
    std::fs::write(dir.join("alfred-b.unarchived2"), b"no").unwrap();
    std::fs::write(dir.join("alfred-a.unarchived"), b"yes").unwrap();
    std::fs::write(dir.join("alfred-.unarchived"), b"yes").unwrap();
    assert_eq!(
        sorted(spool.files()),
        vec![
            dir.join("alfred-.unarchived"),
            dir.join("alfred-a.unarchived")
        ]
    );
}

#[tokio::test]
async fn send_one_leaves_the_file_when_the_send_fails() {
    let spool = Spool::at(scratch("send-one")).unwrap();
    spool.write("alfred-one", &rows()).unwrap();
    let client = closed_port_client();
    Spool::send_one(&client, &spool.path("alfred-one")).await;
}

#[tokio::test]
async fn send_one_on_a_file_that_is_already_gone() {
    let spool = Spool::at(scratch("send-one-gone")).unwrap();
    let client = closed_port_client();
    Spool::send_one(&client, &spool.path("alfred-never")).await;
}

#[tokio::test]
async fn drain_on_an_empty_spool_sends_nothing() {
    let spool = Spool::at(scratch("drain-empty")).unwrap();
    assert_eq!(spool.drain(None).await, Drained::default());
}

#[tokio::test]
async fn drain_keeps_and_counts_the_files_it_cannot_send() {
    let spool = Spool::at(scratch("drain-fails")).unwrap();
    spool.write("alfred-one", &rows()).unwrap();
    spool.write("alfred-two", &rows()).unwrap();
    let client = closed_port_client();
    assert_eq!(
        spool.drain(Some(&client)).await,
        Drained { sent: 0, failed: 2 }
    );
    assert!(spool.path("alfred-one").exists());
    assert!(spool.path("alfred-two").exists());
}
