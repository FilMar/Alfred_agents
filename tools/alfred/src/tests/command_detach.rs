use std::ffi::OsString;
use std::path::Path;

use crate::command::detach::{child_args, spawn};
use crate::command::job::{JobPaths, Status};
use crate::command::spec::Label;

fn os_args(parts: &[&str]) -> Vec<OsString> {
    parts.iter().copied().map(OsString::from).collect()
}

#[test]
fn child_args_keeps_the_other_args_in_order() {
    let argv = os_args(&[
        "command",
        "run",
        "--hat",
        "white-core",
        "--detach",
        "--task",
        "x",
    ]);
    assert_eq!(
        child_args(&argv, Path::new("/tmp/alfred-abc")),
        os_args(&[
            "command",
            "run",
            "--hat",
            "white-core",
            "--task",
            "x",
            "--job",
            "/tmp/alfred-abc"
        ])
    );
}

#[test]
fn spawn_writes_running_and_the_pid() {
    let dir = std::env::temp_dir().join(format!("alfred-detach-{}", std::process::id()));
    std::fs::create_dir_all(&dir).unwrap();
    let label = Label::of(Some("white-core"), None).unwrap();
    let paths = JobPaths::new(&dir, &label, 1, "abcd");
    let detached = spawn(Path::new("/bin/true"), &[], &paths).unwrap();
    assert_eq!(Status::read(&paths.status()), Status::Running);
    assert_eq!(
        std::fs::read_to_string(paths.pid()).unwrap(),
        detached.pid.to_string()
    );
    assert_eq!(detached.status, paths.status().display().to_string());
    assert_eq!(detached.out, paths.out().display().to_string());
}
