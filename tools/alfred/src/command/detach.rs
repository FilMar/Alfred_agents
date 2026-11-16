use std::ffi::OsString;
use std::os::unix::process::CommandExt;
use std::path::Path;
use std::process::Stdio;

use serde::Serialize;

use super::CommandError;
use super::job::{JobPaths, Status};

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Detached {
    pub pid: u32,
    pub out: String,
    pub log: String,
    pub status: String,
}

pub fn child_args(argv: &[OsString], base: &Path) -> Vec<OsString> {
    let result: Vec<OsString> = argv
        .iter()
        .filter(|arg| *arg != "--detach")
        .cloned()
        .chain([OsString::from("--job"), base.as_os_str().to_os_string()])
        .collect();
    debug_assert!(!has_detach(&result), "detach.child_args: no --detach");
    debug_assert!(
        has_job(&result, base),
        "detach.child_args: --job names the base"
    );
    result
}

fn has_detach(args: &[OsString]) -> bool {
    args.iter().any(|arg| arg == "--detach")
}

fn has_job(args: &[OsString], base: &Path) -> bool {
    args.windows(2)
        .any(|pair| pair[0] == "--job" && Path::new(&pair[1]) == base)
}

pub fn spawn(
    program: &Path,
    args: &[OsString],
    paths: &JobPaths,
) -> Result<Detached, CommandError> {
    Status::Running.write(&paths.status())?;
    let child = std::process::Command::new(program)
        .args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .process_group(0)
        .spawn()
        .map_err(CommandError::io(format!("start {}", program.display())))?;
    let pid = child.id();
    if let Err(error) = std::fs::write(paths.pid(), pid.to_string()) {
        eprintln!("warn: pid not written: {error}");
    }
    Ok(Detached {
        pid,
        out: paths.out().display().to_string(),
        log: paths.log().display().to_string(),
        status: paths.status().display().to_string(),
    })
}
