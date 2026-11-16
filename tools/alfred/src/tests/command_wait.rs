use std::num::NonZeroU32;
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant, SystemTime};

use crate::command::wait::{CRASHED, MISSING, Outcome, STALE, Watch, outcome, pid_alive, wait};

fn scratch(name: &str) -> PathBuf {
    let dir = std::env::temp_dir().join(format!("command_wait_{}_{}", std::process::id(), name));
    std::fs::create_dir_all(&dir).unwrap();
    dir
}

fn status(dir: &Path, name: &str, text: &str) -> PathBuf {
    let path = dir.join(name);
    std::fs::write(&path, text).unwrap();
    path
}

fn expected(path: &Path, status: &str, ok: bool) -> Outcome {
    Outcome {
        status_path: path.to_string_lossy().into_owned(),
        status: status.to_string(),
        ok,
    }
}

#[test]
fn seen_keeps_the_watch_when_the_mtime_is_unchanged() {
    let start = Instant::now();
    let later = start + Duration::from_secs(5);
    let mtime = SystemTime::UNIX_EPOCH;
    let watch = Watch::start(Some(mtime), start);
    assert_eq!(watch.seen(Some(mtime), later), watch);
    let absent = Watch::start(None, start);
    assert_eq!(absent.seen(None, later), absent);
}

#[test]
fn seen_resets_the_watch_when_the_mtime_changes() {
    let start = Instant::now();
    let later = start + Duration::from_secs(5);
    let mtime = SystemTime::UNIX_EPOCH;
    let next = mtime + Duration::from_secs(1);
    assert_eq!(
        Watch::start(Some(mtime), start).seen(Some(next), later),
        Watch::start(Some(next), later)
    );
    assert_eq!(
        Watch::start(None, start).seen(Some(next), later),
        Watch::start(Some(next), later)
    );
    assert_eq!(
        Watch::start(Some(mtime), start).seen(None, later),
        Watch::start(None, later)
    );
}

#[test]
fn is_stale_at_sixty_seconds() {
    let now = Instant::now();
    let watch = Watch::start(Some(SystemTime::UNIX_EPOCH), now);
    assert!(watch.is_stale(now + STALE));
}

#[test]
fn is_stale_below_sixty_seconds() {
    let now = Instant::now();
    let watch = Watch::start(Some(SystemTime::UNIX_EPOCH), now);
    assert!(!watch.is_stale((now + STALE).checked_sub(Duration::from_secs(1)).unwrap()));
}

#[test]
fn pid_alive_is_true_for_a_live_pid() {
    let dir = scratch("pid_alive_live");
    let path = dir.join("alive.pid");
    std::fs::write(&path, std::process::id().to_string()).unwrap();
    assert!(pid_alive(&path));
}

#[test]
fn pid_alive_is_true_without_a_pid_file() {
    let dir = scratch("pid_alive_none");
    assert!(pid_alive(&dir.join("none.pid")));
}

#[test]
fn pid_alive_is_false_for_a_dead_pid() {
    let dir = scratch("pid_alive_dead");
    let path = dir.join("dead.pid");
    std::fs::write(&path, u32::MAX.to_string()).unwrap();
    assert!(!pid_alive(&path));
}

#[test]
fn outcome_done_is_ok() {
    let dir = scratch("outcome_done");
    let path = status(&dir, "job.status", "done");
    assert_eq!(outcome(&path, false), expected(&path, "done", true));
}

#[test]
fn outcome_error_is_not_ok() {
    let dir = scratch("outcome_error");
    let path = status(&dir, "job.status", "error: boom");
    assert_eq!(outcome(&path, false), expected(&path, "error: boom", false));
}

#[test]
fn outcome_timeout_is_not_ok() {
    let dir = scratch("outcome_timeout");
    let path = status(&dir, "job.status", "timeout");
    assert_eq!(outcome(&path, false), expected(&path, "timeout", false));
}

#[test]
fn outcome_running_alive_stays_running() {
    let dir = scratch("outcome_running");
    let path = status(&dir, "job.status", "running");
    assert_eq!(outcome(&path, false), expected(&path, "running", false));
}

#[test]
fn outcome_running_dead_is_crashed() {
    let dir = scratch("outcome_crashed");
    let path = status(&dir, "job.status", "running");
    assert_eq!(
        outcome(&path, true),
        expected(&path, &format!("error: {CRASHED}"), false)
    );
}

#[test]
fn outcome_unreadable_status_is_missing() {
    let dir = scratch("outcome_missing");
    let path = dir.join("job.status");
    assert_eq!(outcome(&path, false), expected(&path, MISSING, false));
}

#[tokio::test]
async fn wait_returns_one_outcome_per_path_in_order() {
    let dir = scratch("wait_order");
    let done = status(&dir, "one.status", "done");
    let error = status(&dir, "two.status", "error: boom");
    let timed_out = status(&dir, "three.status", "timeout");
    let missing = dir.join("four.status");
    let paths = vec![done, error, timed_out, missing];
    wait(&paths, NonZeroU32::MIN).await;
}

#[tokio::test]
async fn wait_runs_until_the_timeout_with_a_running_status() {
    let dir = scratch("wait_running");
    let running = status(&dir, "alive.status", "running");
    std::fs::write(dir.join("alive.out"), "partial output").unwrap();
    std::fs::write(dir.join("alive.pid"), std::process::id().to_string()).unwrap();
    let paths = vec![running.clone()];
    let started = Instant::now();
    assert_eq!(
        wait(&paths, NonZeroU32::MIN).await,
        vec![expected(&running, "running", false)]
    );
    assert!(started.elapsed() >= Duration::from_secs(1));
}
