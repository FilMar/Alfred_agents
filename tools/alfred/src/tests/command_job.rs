use crate::command::job::{JobPaths, Status};

#[test]
fn of_base_builds_the_run_paths() {
    let paths = JobPaths::of_base(std::path::PathBuf::from("/tmp/alfred-ritchie-1699-3fa2"));
    assert_eq!(
        paths.base(),
        std::path::Path::new("/tmp/alfred-ritchie-1699-3fa2")
    );
    assert_eq!(
        paths.out(),
        std::path::PathBuf::from("/tmp/alfred-ritchie-1699-3fa2.out")
    );
    assert_eq!(
        paths.log(),
        std::path::PathBuf::from("/tmp/alfred-ritchie-1699-3fa2.log")
    );
    assert_eq!(
        paths.status(),
        std::path::PathBuf::from("/tmp/alfred-ritchie-1699-3fa2.status")
    );
    assert_eq!(
        paths.pid(),
        std::path::PathBuf::from("/tmp/alfred-ritchie-1699-3fa2.pid")
    );
    assert_eq!(
        paths.system(),
        std::path::PathBuf::from("/tmp/alfred-ritchie-1699-3fa2.system")
    );
}

#[test]
fn of_status_recovers_the_run_paths() {
    let base = std::env::temp_dir().join("alfred_job_of_status_run");
    let status = base.with_extension("status");
    std::fs::write(&status, "running").unwrap();
    let paths = JobPaths::of_status(&status).unwrap();
    assert_eq!(paths.base(), base.as_path());
    assert_eq!(paths.status(), status);
    assert_eq!(paths.out(), base.with_extension("out"));
}

#[test]
fn of_status_rejects_a_path_that_is_not_a_status_file() {
    let out = std::env::temp_dir().join("alfred_job_of_status_wrong.out");
    std::fs::write(&out, "not a status file").unwrap();
    assert!(JobPaths::of_status(&out).is_err());
    let bare = std::env::temp_dir().join("alfred_job_of_status_bare");
    std::fs::write(&bare, "not a status file").unwrap();
    assert!(JobPaths::of_status(&bare).is_err());
}

#[test]
fn parse_reads_the_status_text() {
    assert_eq!(Status::parse("running"), Status::Running);
    assert_eq!(Status::parse("done"), Status::Done);
    assert_eq!(Status::parse("timeout"), Status::Timeout);
    assert_eq!(
        Status::parse("error: pi exited with 2"),
        Status::Error("pi exited with 2".into())
    );
    assert_eq!(
        Status::parse("flaky hardware"),
        Status::Other("flaky hardware".into())
    );
    assert_eq!(Status::parse(""), Status::Other(String::new()));
}

#[test]
fn text_running_reads_back() {
    Status::Running.text();
}

#[test]
fn text_done_reads_back() {
    Status::Done.text();
}

#[test]
fn text_error_reads_back() {
    Status::Error("pi exited with 2".into()).text();
}

#[test]
fn text_timeout_reads_back() {
    Status::Timeout.text();
}

#[test]
fn text_other_reads_back() {
    Status::Other("flaky hardware".into()).text();
}

#[test]
fn is_terminal_on_each_status() {
    assert!(!Status::Running.is_terminal());
    assert!(Status::Done.is_terminal());
    assert!(Status::Error("pi exited with 2".into()).is_terminal());
    assert!(Status::Timeout.is_terminal());
    assert!(!Status::Other("flaky hardware".into()).is_terminal());
}

#[test]
fn write_then_read_returns_the_same_status() {
    let cases = vec![
        (Status::Running, "running"),
        (Status::Done, "done"),
        (Status::Error("pi exited with 2".into()), "error"),
        (Status::Timeout, "timeout"),
        (Status::Other("flaky hardware".into()), "other"),
    ];
    for (status, tag) in cases {
        let path = std::env::temp_dir().join(format!("alfred_job_status_{tag}.status"));
        status.write(&path).unwrap();
        assert_eq!(Status::read(&path), status);
    }
}
