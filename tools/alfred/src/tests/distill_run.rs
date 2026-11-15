use crate::distill::run::{Options, Progress, RunError};
use crate::distill::session_run::SessionReport;

fn session() -> SessionReport {
    SessionReport {
        session: "s1".to_string(),
        turns: 1,
        split: "ok",
        closed: 1,
        failures: Vec::new(),
        exchanges: Vec::new(),
    }
}

#[test]
fn trigger_starts_an_active_run() {
    let options = Options::trigger();
    assert_eq!(options.session, None);
    assert_eq!(options.extractor, None);
    assert!(options.active);
    assert_eq!(options.max_saved, None);
    assert!(options.same_session_cutoff.is_some());
}

#[test]
fn mode_follows_active() {
    assert_eq!(format!("{:?}", Options::trigger().mode()), "Active");
    let shadow = Options {
        active: false,
        ..Options::trigger()
    };
    assert_eq!(format!("{:?}", shadow.mode()), "Shadow");
}

#[test]
fn run_error_tells_why() {
    assert_eq!(
        format!("{}", RunError::Busy),
        "a distill run is already going"
    );
    assert_eq!(
        format!("{}", RunError::BadInput("no tag vocabulary".to_string())),
        "no tag vocabulary"
    );
}

#[test]
#[should_panic(expected = "Progress.after: a session is left to do")]
fn after_needs_a_session_left() {
    let progress = Progress {
        run: "2026-11-15T00:00:00.000Z".to_string(),
        extractor: 1,
        mode: "active",
        sessions: 1,
        done: 1,
        saved: 0,
        failed: 0,
    };
    progress.after(&session());
}

#[test]
fn after_does_one_more_session() {
    let progress = Progress {
        run: "2026-11-15T00:00:00.000Z".to_string(),
        extractor: 1,
        mode: "active",
        sessions: 3,
        done: 1,
        saved: 0,
        failed: 0,
    };
    progress.after(&session());
}

#[test]
fn after_never_loses_saved() {
    let progress = Progress {
        run: "2026-11-15T00:00:00.000Z".to_string(),
        extractor: 1,
        mode: "active",
        sessions: 3,
        done: 0,
        saved: 5,
        failed: 0,
    };
    progress.after(&session());
}

#[test]
fn after_counts_a_failed_session() {
    let progress = Progress {
        run: "2026-11-15T00:00:00.000Z".to_string(),
        extractor: 1,
        mode: "active",
        sessions: 2,
        done: 0,
        saved: 0,
        failed: 0,
    };
    let failed = SessionReport {
        failures: vec!["split failed".to_string()],
        ..session()
    };
    progress.after(&failed);
}
