use std::num::NonZeroU32;
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant, SystemTime};

use serde::Serialize;

use super::job::Status;

pub const POLL: Duration = Duration::from_secs(2);
pub const STALE: Duration = Duration::from_mins(1);
pub const CRASHED: &str = "process died unexpectedly";
pub const MISSING: &str = "missing";

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Outcome {
    pub status_path: String,
    pub status: String,
    pub ok: bool,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Watch {
    mtime: Option<SystemTime>,
    changed: Instant,
}

impl Watch {
    pub fn start(mtime: Option<SystemTime>, now: Instant) -> Watch {
        Watch {
            mtime,
            changed: now,
        }
    }

    pub fn seen(self, mtime: Option<SystemTime>, now: Instant) -> Watch {
        if mtime == self.mtime {
            self
        } else {
            Watch::start(mtime, now)
        }
    }

    pub fn is_stale(&self, now: Instant) -> bool {
        now.duration_since(self.changed) >= STALE
    }
}

pub fn pid_alive(pid_file: &Path) -> bool {
    std::fs::read_to_string(pid_file)
        .ok()
        .and_then(|text| text.trim().parse::<u32>().ok())
        .is_none_or(|pid| Path::new("/proc").join(pid.to_string()).exists())
}

pub fn outcome(status_path: &Path, dead: bool) -> Outcome {
    let status = std::fs::read_to_string(status_path)
        .map_or_else(|_| MISSING.to_string(), |text| text.trim().to_owned());
    let status = if dead && status == "running" {
        format!("error: {CRASHED}")
    } else {
        status
    };
    let result: Outcome = Outcome {
        ok: status == "done",
        status,
        status_path: status_path.to_string_lossy().into_owned(),
    };
    debug_assert!(
        result.ok == (result.status == "done"),
        "wait.outcome: ok only when done"
    );
    result
}

pub async fn wait(status_paths: &[PathBuf], timeout: NonZeroU32) -> Vec<Outcome> {
    let start = Instant::now();
    let deadline = start + Duration::from_secs(u64::from(timeout.get()));
    let mut jobs: Vec<Job> = status_paths
        .iter()
        .map(|status| Job::start(status, start))
        .collect();
    loop {
        jobs = jobs
            .into_iter()
            .map(|job| job.poll(Instant::now()))
            .collect();
        let now = Instant::now();
        if jobs.iter().all(Job::settled) || now >= deadline {
            break;
        }
        tokio::time::sleep((now + POLL).min(deadline) - now).await;
    }
    let result: Vec<Outcome> = jobs.into_iter().map(|job| job.latest).collect();
    debug_assert!(
        same_order(&result, status_paths),
        "wait.wait: one outcome per path, in order"
    );
    result
}

fn same_order(outcomes: &[Outcome], paths: &[PathBuf]) -> bool {
    outcomes.len() == paths.len()
        && outcomes
            .iter()
            .zip(paths)
            .all(|(outcome, path)| outcome.status_path == path.to_string_lossy())
}

struct Job {
    status: PathBuf,
    watch: Watch,
    latest: Outcome,
}

impl Job {
    fn start(status: &Path, now: Instant) -> Job {
        Job {
            status: status.to_path_buf(),
            watch: Watch::start(mtime(&status.with_extension("out")), now),
            latest: outcome(status, false),
        }
    }

    fn poll(self, now: Instant) -> Job {
        let watch = self
            .watch
            .seen(mtime(&self.status.with_extension("out")), now);
        let dead = watch.is_stale(now) && !pid_alive(&self.status.with_extension("pid"));
        let latest = outcome(&self.status, dead);
        Job {
            status: self.status,
            watch,
            latest,
        }
    }

    fn settled(&self) -> bool {
        self.latest.status != Status::Running.text()
    }
}

fn mtime(path: &Path) -> Option<SystemTime> {
    std::fs::metadata(path)
        .and_then(|data| data.modified())
        .ok()
}
