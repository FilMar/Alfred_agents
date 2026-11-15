use std::collections::HashSet;
use std::sync::{Arc, Mutex};

use jiff::Timestamp;
use serde::Serialize;

use super::run::{Options, Progress, Run, RunError, RunReport, sessions_of};
use super::session_run::SessionReport;
use super::trigger::Trigger;
use crate::serve::Shared;

#[derive(Debug, Clone, PartialEq, Default, Serialize)]
pub struct Status {
    pub running: Option<Progress>,
    pub last: Option<RunReport>,
}

#[derive(Debug)]
pub struct Runner {
    lock: Arc<tokio::sync::Mutex<()>>,
    status: Arc<Mutex<Status>>,
    trigger: Option<Trigger>,
}

impl Runner {
    pub fn new(trigger: Option<Trigger>) -> Runner {
        Runner {
            lock: Arc::new(tokio::sync::Mutex::new(())),
            status: Arc::new(Mutex::new(Status::default())),
            trigger,
        }
    }

    pub fn status(&self) -> Status {
        self.status
            .lock()
            .expect("Runner.status: the status lock is not poisoned")
            .clone()
    }

    pub async fn start(
        app: Shared,
        options: &Options,
        now: Timestamp,
    ) -> Result<Progress, RunError> {
        let result: Result<Progress, RunError> = async {
            let guard = app
                .runner
                .lock
                .clone()
                .try_lock_owned()
                .map_err(|_| RunError::Busy)?;
            let run = Run::start(&app, options, now).await?;
            let sessions = sessions_of(&app, options)?;
            let progress = run.progress(u32::try_from(sessions.len()).unwrap_or(u32::MAX));
            app.runner.update(|s| Status {
                running: Some(progress.clone()),
                ..s
            });
            let task = app.clone();
            tokio::spawn(async move {
                let on_session = |report: &SessionReport| {
                    task.runner.update(|s| Status {
                        running: s.running.map(|p| p.after(report)),
                        ..s
                    });
                };
                let report = run.all(&task, &sessions, &on_session, now).await;
                eprintln!(
                    "alfred distill: run {}: {} sessions, {} saved, {} failed",
                    report.run,
                    report.sessions.len(),
                    report.saved,
                    report.failed.len()
                );
                task.runner.update(|_| Status {
                    running: None,
                    last: Some(report),
                });
                drop(guard);
            });
            Ok(progress)
        }
        .await;
        debug_assert!(
            result
                .as_ref()
                .map_or(true, |p| is_running_or_last(&app.runner.status(), &p.run)),
            "Runner.start: a started run is the running one, or the last when it already ended"
        );
        result
    }

    pub async fn on_ingest(app: Shared, now: Timestamp) -> Option<Result<Progress, RunError>> {
        let no_trigger = app.runner.trigger.is_none();
        let result: Option<Result<Progress, RunError>> = match app.runner.trigger {
            None => None,
            Some(trigger) => {
                let failed: HashSet<String> = app
                    .runner
                    .status()
                    .last
                    .map(|last| last.failed.into_iter().collect())
                    .unwrap_or_default();
                let pending = app.hist.list_exchanges(
                    &crate::hist::ExchangeQuery::default(),
                    Some(false),
                    super::session::PENDING_SESSIONS_CAP,
                );
                match pending {
                    Err(e) => Some(Err(RunError::Upstream(e.to_string()))),
                    Ok(pending) if trigger.due(&pending, &failed, now) => {
                        match Runner::start(app.clone(), &Options::trigger(), now).await {
                            Err(RunError::Busy) => None,
                            started => Some(started),
                        }
                    }
                    Ok(_) => None,
                }
            }
        };
        debug_assert!(
            !no_trigger || result.is_none(),
            "Runner.on_ingest: no trigger, no run"
        );
        debug_assert!(
            !matches!(result, Some(Err(RunError::Busy))),
            "Runner.on_ingest: a busy runner skips, it does not fail"
        );
        result
    }

    fn update(&self, change: impl FnOnce(Status) -> Status) {
        let mut status = self
            .status
            .lock()
            .expect("Runner.update: the status lock is not poisoned");
        *status = change(std::mem::take(&mut *status));
    }

    pub fn spawn_on_ingest(app: Shared) {
        if app.runner.trigger.is_some() {
            tokio::spawn(async move {
                if let Some(Err(error)) = Runner::on_ingest(app, Timestamp::now()).await {
                    eprintln!("alfred distill: {error}");
                }
            });
        }
    }
}

fn is_running_or_last(status: &Status, run: &str) -> bool {
    status.running.as_ref().is_some_and(|p| p.run == run)
        || status.last.as_ref().is_some_and(|l| l.run == run)
}
