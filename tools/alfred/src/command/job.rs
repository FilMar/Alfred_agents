use std::path::{Path, PathBuf};

use super::CommandError;
use super::spec::Label;

#[derive(Debug, Clone, PartialEq)]
pub struct JobPaths {
    base: PathBuf,
}

#[derive(Debug, Clone, PartialEq)]
pub enum Status {
    Running,
    Done,
    Error(String),
    Timeout,
    Other(String),
}

impl JobPaths {
    pub fn new(dir: &Path, label: &Label, ms: i64, hex: &str) -> JobPaths {
        debug_assert!(four_hex(hex), "JobPaths.new: four hex digits");
        JobPaths::of_base(dir.join(format!("alfred-{}-{}-{}", label.as_str(), ms, hex)))
    }

    pub fn of_base(base: PathBuf) -> JobPaths {
        JobPaths { base }
    }

    pub fn of_status(path: &Path) -> Result<JobPaths, CommandError> {
        if path.extension().and_then(|ext| ext.to_str()) == Some("status") {
            Ok(JobPaths::of_base(path.with_extension("")))
        } else {
            Err(CommandError::BadInput(format!(
                "not a status file: {}",
                path.display()
            )))
        }
    }

    pub fn base(&self) -> &Path {
        &self.base
    }

    pub fn name(&self) -> String {
        self.base
            .file_name()
            .map_or_else(String::new, |name| name.to_string_lossy().into_owned())
    }

    pub fn out(&self) -> PathBuf {
        self.with("out")
    }

    pub fn log(&self) -> PathBuf {
        self.with("log")
    }

    pub fn status(&self) -> PathBuf {
        self.with("status")
    }

    pub fn pid(&self) -> PathBuf {
        self.with("pid")
    }

    pub fn system(&self) -> PathBuf {
        self.with("system")
    }

    fn with(&self, ext: &str) -> PathBuf {
        self.base.with_extension(ext)
    }
}

fn four_hex(hex: &str) -> bool {
    hex.len() == 4 && hex.bytes().all(|b| b.is_ascii_hexdigit())
}

impl Status {
    pub fn parse(text: &str) -> Status {
        if text == "running" {
            Status::Running
        } else if text == "done" {
            Status::Done
        } else if text == "timeout" {
            Status::Timeout
        } else if let Some(why) = text.strip_prefix("error: ") {
            Status::Error(why.into())
        } else {
            Status::Other(text.into())
        }
    }

    pub fn text(&self) -> String {
        let result: String = match self {
            Status::Running => "running".into(),
            Status::Done => "done".into(),
            Status::Timeout => "timeout".into(),
            Status::Error(why) => format!("error: {why}"),
            Status::Other(text) => text.clone(),
        };
        debug_assert!(
            Status::parse(&result) == *self,
            "Status.text: parse reads back the same status"
        );
        result
    }

    pub fn is_terminal(&self) -> bool {
        matches!(self, Status::Done | Status::Error(_) | Status::Timeout)
    }

    pub fn read(path: &Path) -> Status {
        std::fs::read_to_string(path).map_or(Status::Running, |text| Status::parse(&text))
    }

    pub fn write(&self, path: &Path) -> Result<(), CommandError> {
        std::fs::write(path, self.text()).map_err(|source| CommandError::Io {
            context: format!("write {}", path.display()),
            source,
        })
    }
}
