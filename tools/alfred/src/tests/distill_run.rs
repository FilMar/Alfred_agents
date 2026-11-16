use crate::distill::run::{Options, Progress};
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

fn progress(sessions: u32, done: u32, saved: u32) -> Progress {
    Progress {
        run: "2026-11-15T00:00:00.000Z".to_string(),
        extractor: 1,
        mode: "active",
        sessions,
        done,
        saved,
        failed: 0,
    }
}

#[test]
fn trigger_starts_an_active_run() {
    let options = Options::trigger();
    assert!(options.same_session_cutoff.is_some());
}

#[test]
#[should_panic(expected = "Progress.after: a session is left to do")]
fn after_needs_a_session_left() {
    progress(1, 1, 0).after(&session());
}

#[test]
fn after_never_loses_saved() {
    progress(3, 0, 5).after(&session());
}

#[test]
fn after_counts_a_failed_session() {
    let failed = SessionReport {
        failures: vec!["split failed".to_string()],
        ..session()
    };
    progress(2, 0, 0).after(&failed);
}
