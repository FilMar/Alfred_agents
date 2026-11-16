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
        match text {
            "running" => Status::Running,
            "done" => Status::Done,
            "timeout" => Status::Timeout,
            _ => text.strip_prefix("error: ").map_or_else(
                || Status::Other(text.into()),
                |why| Status::Error(why.into()),
            ),
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
        std::fs::write(path, self.text())
            .map_err(CommandError::io(format!("write {}", path.display())))
    }
}
