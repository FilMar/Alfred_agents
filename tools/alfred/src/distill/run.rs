use std::collections::{BTreeSet, HashSet};

use jiff::Timestamp;
use serde::{Deserialize, Serialize};

use super::config::{Extractor, MODEL_ENV};
use super::decide::Tools;
use super::record::Recorder;
use super::rule::vocabulary_of;
use super::save::{Budget, Mode};
use super::session::SessionRead;
use super::session_run::SessionReport;
use super::session_run::{close, distill_session};
use super::target::Context;
use super::twin::SAME_SESSION_CUTOFF;
use crate::serve::App;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Options {
    #[serde(default)]
    pub session: Option<String>,
    #[serde(default)]
    pub extractor: Option<i64>,
    #[serde(default)]
    pub active: bool,
    #[serde(default)]
    pub max_saved: Option<u32>,
    #[serde(default = "default_cutoff")]
    pub same_session_cutoff: Option<f32>,
}

#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
pub enum RunError {
    #[error("{0}")]
    BadInput(String),
    #[error("{0}")]
    NotFound(String),
    #[error("{0}")]
    Upstream(String),
    #[error("a distill run is already going")]
    Busy,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct RunReport {
    pub extractor: i64,
    pub run: String,
    pub mode: &'static str,
    pub saved: u32,
    pub sessions: Vec<SessionReport>,
    pub failed: BTreeSet<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Progress {
    pub run: String,
    pub extractor: i64,
    pub mode: &'static str,
    pub sessions: u32,
    pub done: u32,
    pub saved: u32,
    pub failed: u32,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Run {
    extractor: Extractor,
    vocabulary: Vec<String>,
    recorder: Recorder,
    mode: Mode,
    max_saved: Option<u32>,
    cutoff: Option<f32>,
}

impl Options {
    pub fn trigger() -> Options {
        Options {
            session: None,
            extractor: None,
            active: true,
            max_saved: None,
            same_session_cutoff: default_cutoff(),
        }
    }

    pub fn mode(&self) -> Mode {
        if self.active {
            Mode::Active
        } else {
            Mode::Shadow
        }
    }
}

impl Run {
    pub async fn start(app: &App, options: &Options, now: Timestamp) -> Result<Run, RunError> {
        let result: Result<Run, RunError> = async {
            let cutoff = options.same_session_cutoff;
            if !cutoff.is_none_or(super::twin::is_cutoff) {
                Err(RunError::BadInput(
                    "sameSessionCutoff must be above 0 and at most 1".to_string(),
                ))
            } else if options.max_saved == Some(0) {
                Err(RunError::BadInput("maxSaved must be above 0".to_string()))
            } else {
                let row = app
                    .hist
                    .get_extractor(options.extractor)
                    .map_err(|e| RunError::Upstream(e.to_string()))?
                    .ok_or_else(|| RunError::NotFound("extractor not found".to_string()))?;
                let model = std::env::var(MODEL_ENV)
                    .ok()
                    .filter(|m| !m.trim().is_empty());
                let extractor =
                    Extractor::from_row(&row, model.as_deref()).map_err(RunError::BadInput)?;
                let rules = app
                    .rules
                    .list(&[])
                    .await
                    .map_err(|e| RunError::Upstream(format!("rules: {e}")))?;
                let vocabulary = vocabulary_of(&rules, extractor.config().vocabulary_size);
                if vocabulary.is_empty() {
                    Err(RunError::BadInput(
                        "no tag vocabulary: no ti rule has a tag".to_string(),
                    ))
                } else {
                    Ok(Run {
                        recorder: Recorder::start(extractor.id(), crate::rules::iso(now)),
                        extractor,
                        vocabulary,
                        mode: options.mode(),
                        max_saved: options.max_saved,
                        cutoff,
                    })
                }
            }
        }
        .await;
        debug_assert!(
            result.as_ref().map_or(true, |r| !r.vocabulary.is_empty()),
            "Run.start: the vocabulary is not empty"
        );
        debug_assert!(
            result
                .as_ref()
                .map_or(true, |r| r.cutoff.is_none_or(super::twin::is_cutoff)),
            "Run.start: the cutoff is none, or above 0 and at most 1"
        );
        debug_assert!(
            result.as_ref().map_or(true, |r| r.mode == options.mode()),
            "Run.start: the mode is the one asked"
        );
        result
    }

    pub async fn all(
        &self,
        app: &App,
        sessions: &[String],
        on_session: &(dyn Fn(&SessionReport) + Send + Sync),
        now: Timestamp,
    ) -> RunReport {
        debug_assert!(
            sessions.iter().collect::<HashSet<_>>().len() == sessions.len(),
            "Run.all: no session twice"
        );
        let context = Context {
            tools: Tools {
                chat: &app.chat,
                rules: &app.rules,
                embedder: &app.embedder,
                extractor: &self.extractor,
                mode: self.mode,
                cutoff: self.cutoff,
            },
            hist: &app.hist,
            episodes: &app.episodes,
            recorder: &self.recorder,
            vocabulary: &self.vocabulary,
        };
        let mut budget = self.budget();
        let mut reports: Vec<SessionReport> = Vec::with_capacity(sessions.len());
        let mut failed: BTreeSet<String> = BTreeSet::new();
        for session in sessions {
            if !budget.is_spent() {
                let (report, ok, next) = one_session(&context, app, session, budget, now).await;
                budget = next;
                if !ok {
                    failed.insert(session.clone());
                }
                if let Some(report) = report {
                    on_session(&report);
                    reports.push(report);
                }
            }
        }
        let result: RunReport = RunReport {
            extractor: self.extractor.id(),
            run: self.recorder.run().to_string(),
            mode: mode_name(self.mode),
            saved: budget.spent(),
            sessions: reports,
            failed,
        };
        debug_assert!(
            result.sessions.len() <= sessions.len(),
            "Run.all: at most one report per session"
        );
        debug_assert!(
            self.mode == Mode::Active || result.saved == 0,
            "Run.all: shadow saves nothing"
        );
        debug_assert!(
            self.max_saved.is_none_or(|m| result.saved <= m),
            "Run.all: never past max_saved"
        );
        debug_assert!(
            failed_are_reported(&result),
            "Run.all: a failed session is one with a failure"
        );
        result
    }

    pub fn budget(&self) -> Budget {
        Budget::of(self.max_saved)
    }

    pub fn progress(&self, sessions: u32) -> Progress {
        let result: Progress = Progress {
            run: self.recorder.run().to_string(),
            extractor: self.extractor.id(),
            mode: mode_name(self.mode),
            sessions,
            done: 0,
            saved: 0,
            failed: 0,
        };
        debug_assert!(
            result.run == self.recorder.run(),
            "Run.progress: the progress is of this run"
        );
        debug_assert!(result.done == 0, "Run.progress: nothing done yet");
        result
    }
}

impl Progress {
    pub fn after(self, session: &SessionReport) -> Progress {
        debug_assert!(
            self.done < self.sessions,
            "Progress.after: a session is left to do"
        );
        let saved: usize = session.exchanges.iter().map(|e| e.saved.len()).sum();
        let result: Progress = Progress {
            done: self.done + 1,
            saved: self.saved + u32::try_from(saved).unwrap_or(u32::MAX),
            failed: self.failed + u32::from(!session.failures.is_empty()),
            ..self.clone()
        };
        debug_assert!(
            result.done == self.done + 1,
            "Progress.after: one session more is done"
        );
        debug_assert!(
            result.saved >= self.saved,
            "Progress.after: saved never goes down"
        );
        debug_assert!(
            result.failed - self.failed == u32::from(!session.failures.is_empty()),
            "Progress.after: failed grows by one exactly when the session has a failure"
        );
        result
    }
}

pub fn sessions_of(app: &App, options: &Options) -> Result<Vec<String>, RunError> {
    let result: Result<Vec<String>, RunError> = match &options.session {
        Some(session) => Ok(vec![session.clone()]),
        None => super::session::pending_sessions(&app.hist)
            .map_err(|e| RunError::Upstream(e.to_string())),
    };
    debug_assert!(
        result
            .as_ref()
            .map_or(true, |s| options.session.is_none() || s.len() == 1),
        "sessions_of: one asked session, or the pending ones"
    );
    result
}

async fn one_session(
    context: &Context<'_>,
    app: &App,
    session: &str,
    budget: Budget,
    now: Timestamp,
) -> (Option<SessionReport>, bool, Budget) {
    match SessionRead::read(&app.hist, session) {
        Err(e) => {
            eprintln!("alfred distill: read: {session}: {e}");
            (None, false, budget)
        }
        Ok(read) if read.turns().is_empty() => {
            let (_, failures) = close(context, &read, Vec::new());
            for failure in &failures {
                eprintln!("alfred distill: {session}: {failure}");
            }
            (None, failures.is_empty(), budget)
        }
        Ok(read) => {
            let (report, next) = distill_session(context, &read, budget, now).await;
            let ok = report.failures.is_empty();
            (Some(report), ok, next)
        }
    }
}

fn mode_name(mode: Mode) -> &'static str {
    match mode {
        Mode::Shadow => "shadow",
        Mode::Active => "active",
    }
}

// serde default needs the Option
#[allow(clippy::unnecessary_wraps)]
fn default_cutoff() -> Option<f32> {
    Some(SAME_SESSION_CUTOFF)
}

fn failed_are_reported(report: &RunReport) -> bool {
    report
        .sessions
        .iter()
        .filter(|s| !s.failures.is_empty())
        .all(|s| report.failed.contains(&s.session))
}
