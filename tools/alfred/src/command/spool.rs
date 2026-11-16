use std::ffi::OsString;
use std::path::{Path, PathBuf};

use serde::Serialize;

use super::CommandError;
use super::archive::{DEADLINE, RunRows};
use crate::client::Client;

pub const PREFIX: &str = "alfred-";
pub const SUFFIX: &str = ".unarchived";

#[derive(Debug, Clone, PartialEq)]
pub struct Spool {
    dir: PathBuf,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize)]
pub struct Drained {
    pub sent: u32,
    pub failed: u32,
}

pub fn state_dir(xdg: Option<OsString>, home: &Path) -> PathBuf {
    xdg.map_or_else(|| home.join(".local").join("state"), PathBuf::from)
        .join("alfred")
        .join("spool")
}

impl Spool {
    pub fn from_env() -> Result<Spool, CommandError> {
        let xdg = std::env::var_os("XDG_STATE_HOME");
        let home = PathBuf::from(std::env::var_os("HOME").unwrap_or_default());
        Spool::at(state_dir(xdg, &home))
    }

    pub fn at(dir: PathBuf) -> Result<Spool, CommandError> {
        let result: Result<Spool, CommandError> = std::fs::create_dir_all(&dir)
            .map_err(CommandError::io(format!("create {}", dir.display())))
            .map(|()| Spool { dir });
        debug_assert!(
            result.as_ref().map_or(true, |spool| spool.dir.is_dir()),
            "Spool.at: the directory exists"
        );
        result
    }

    pub fn path(&self, name: &str) -> PathBuf {
        self.dir.join(format!("{name}{SUFFIX}"))
    }

    pub fn write(&self, name: &str, rows: &RunRows) -> Result<(), CommandError> {
        debug_assert!(name.starts_with(PREFIX), "Spool.write: a job name");
        let path = self.path(name);
        let result: Result<(), CommandError> = serde_json::to_string(rows)
            .map_err(|error| CommandError::BadInput(format!("spool rows: {error}")))
            .and_then(|json| {
                std::fs::write(&path, json)
                    .map_err(CommandError::io(format!("write {}", path.display())))
            });
        debug_assert!(
            result.is_err() || reads_back(&self.path(name), rows),
            "Spool.write: the file reads back the same rows"
        );
        result
    }

    pub fn read(path: &Path) -> Result<RunRows, CommandError> {
        let json = std::fs::read_to_string(path)
            .map_err(CommandError::io(format!("read {}", path.display())))?;
        serde_json::from_str(&json)
            .map_err(|error| CommandError::BadInput(format!("{}: {error}", path.display())))
    }

    pub fn files(&self) -> Vec<PathBuf> {
        let result: Vec<PathBuf> = std::fs::read_dir(&self.dir).map_or_else(
            |_| Vec::new(),
            |entries| {
                entries
                    .filter_map(std::result::Result::ok)
                    .map(|entry| entry.path())
                    .filter(|path| is_spool_file(path))
                    .collect()
            },
        );
        debug_assert!(
            result.iter().map(PathBuf::as_path).all(is_spool_file),
            "Spool.files: only alfred-*.unarchived"
        );
        result
    }

    pub async fn send_one(client: &Client, path: &Path) -> bool {
        let sent = match Spool::read(path) {
            Ok(rows) => super::archive::send(client, &rows)
                .await
                .map_err(|err| err.to_string()),
            Err(err) => Err(err.to_string()),
        };
        match sent {
            Ok(()) => drop(std::fs::remove_file(path)),
            Err(why) => eprintln!("warn: {} still not archived: {why}", path.display()),
        }
        let result = !path.exists();
        debug_assert!(
            result != path.exists(),
            "Spool.send_one: a file is gone exactly when it was sent"
        );
        result
    }

    pub async fn drain(&self, client: Option<&Client>) -> Drained {
        let files = self.files();
        let deadline = tokio::time::Instant::now() + DEADLINE;
        let mut drained = Drained::default();
        for path in files {
            let sent = match client {
                Some(client) => tokio::time::timeout_at(deadline, Spool::send_one(client, &path))
                    .await
                    .unwrap_or(false),
                None => false,
            };
            if sent {
                drained.sent += 1;
            } else {
                drained.failed += 1;
            }
        }
        drained
    }
}

fn reads_back(path: &Path, rows: &RunRows) -> bool {
    Spool::read(path).is_ok_and(|read| &read == rows)
}

fn is_spool_file(path: &Path) -> bool {
    path.file_name()
        .and_then(|name| name.to_str())
        .is_some_and(|name| name.starts_with(PREFIX) && name.ends_with(SUFFIX))
}
