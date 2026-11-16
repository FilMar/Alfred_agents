use crate::command::sandbox::{find_bwrap, wrap};

fn fixture_dir(name: &str) -> std::path::PathBuf {
    let dir = std::env::temp_dir().join(format!("command_sandbox_{}_{}", name, std::process::id()));
    std::fs::create_dir_all(&dir).unwrap();
    dir
}

fn write_bwrap(dir: &std::path::Path) -> std::path::PathBuf {
    let path = dir.join("bwrap");
    std::fs::write(&path, "#!/bin/sh\n").unwrap();
    std::fs::set_permissions(
        &path,
        <std::fs::Permissions as std::os::unix::fs::PermissionsExt>::from_mode(0o755),
    )
    .unwrap();
    path
}

fn osvec(items: &[&str]) -> Vec<std::ffi::OsString> {
    items.iter().map(|s| std::ffi::OsString::from(*s)).collect()
}

fn expected_bwrap_args(cwd: &str, home: &str, pi_args: &[&str]) -> Vec<std::ffi::OsString> {
    let pi_dir = format!("{home}/.pi");
    osvec(&[
        "--ro-bind",
        "/",
        "/",
        "--proc",
        "/proc",
        "--dev",
        "/dev",
        "--bind",
        cwd,
        cwd,
        "--bind",
        pi_dir.as_str(),
        pi_dir.as_str(),
        "--bind",
        "/tmp",
        "/tmp",
        "--setenv",
        "HOME",
        home,
        "--",
        "pi",
    ])
    .into_iter()
    .chain(osvec(pi_args))
    .collect()
}

#[test]
fn find_bwrap_takes_the_first_entry_in_order() {
    let first = fixture_dir("order_first");
    let second = fixture_dir("order_second");
    let bwrap_first = write_bwrap(&first);
    let bwrap_second = write_bwrap(&second);
    let forward = std::env::join_paths([&first, &second]).unwrap();
    assert_eq!(find_bwrap(Some(forward.as_os_str())), Some(bwrap_first));
    let backward = std::env::join_paths([&second, &first]).unwrap();
    assert_eq!(find_bwrap(Some(backward.as_os_str())), Some(bwrap_second));
}

#[test]
fn find_bwrap_skips_entries_without_bwrap() {
    let empty = fixture_dir("skip_empty");
    let real = fixture_dir("skip_real");
    let bwrap = write_bwrap(&real);
    let nowhere = std::path::Path::new("/nonexistent-alfred-sandbox-entry");
    let path_var = std::env::join_paths([empty.as_path(), nowhere, real.as_path()]).unwrap();
    assert_eq!(find_bwrap(Some(path_var.as_os_str())), Some(bwrap));
}

#[test]
fn find_bwrap_is_none_without_a_match() {
    let one = fixture_dir("none_one");
    let two = fixture_dir("none_two");
    let nowhere = std::path::Path::new("/nonexistent-alfred-sandbox-none");
    let path_var = std::env::join_paths([one.as_path(), nowhere, two.as_path()]).unwrap();
    assert_eq!(find_bwrap(Some(path_var.as_os_str())), None);
}

#[test]
fn find_bwrap_is_none_without_a_path() {
    assert_eq!(find_bwrap(None), None);
}

#[test]
fn find_bwrap_is_none_with_an_empty_path() {
    assert_eq!(find_bwrap(Some(std::ffi::OsStr::new(""))), None);
}

#[test]
fn wrap_builds_the_bwrap_argv() {
    let bwrap = std::path::PathBuf::from("/usr/bin/bwrap");
    let cwd = std::path::Path::new("/tmp/alfred-docs-1-ab12");
    let home = std::path::Path::new("/home/alice");
    let pi_args = [
        "-p",
        "--mode",
        "json",
        "--system-prompt",
        "/tmp/alfred-docs-1-ab12.system",
        "--",
        "write the docs",
    ];
    let launch = wrap(
        pi_args
            .iter()
            .map(std::string::ToString::to_string)
            .collect(),
        cwd,
        home,
        Some(bwrap.clone()),
    );
    assert_eq!(launch.program, bwrap);
    assert_eq!(
        launch.args,
        expected_bwrap_args("/tmp/alfred-docs-1-ab12", "/home/alice", &pi_args)
    );
}

#[test]
fn wrap_without_bwrap_launches_pi_naked() {
    let pi_args = ["-p", "--mode", "json"];
    let launch = wrap(
        pi_args
            .iter()
            .map(std::string::ToString::to_string)
            .collect(),
        std::path::Path::new("/w"),
        std::path::Path::new("/h"),
        None,
    );
    assert_eq!(launch.program, std::path::PathBuf::from("pi"));
    assert_eq!(launch.args, osvec(&pi_args));
}
