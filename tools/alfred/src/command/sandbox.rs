use std::ffi::OsString;
use std::path::{Path, PathBuf};

pub const NO_BWRAP: &str = "warn: bwrap not available — running WITHOUT sandbox";

#[derive(Debug, Clone, PartialEq)]
pub struct Launch {
    pub program: PathBuf,
    pub args: Vec<OsString>,
}

pub fn find_bwrap(path_var: Option<&std::ffi::OsStr>) -> Option<PathBuf> {
    fn executable(path: &Path) -> bool {
        std::fs::metadata(path).is_ok_and(|meta| {
            let bits = std::os::unix::fs::PermissionsExt::mode(&meta.permissions());
            meta.is_file() && (bits & 0o111) != 0
        })
    }

    path_var.and_then(|paths| {
        std::env::split_paths(paths)
            .filter(|entry| !entry.as_os_str().is_empty())
            .map(|entry| entry.join("bwrap"))
            .find(|candidate| executable(candidate))
    })
}

pub fn wrap(pi_args: Vec<String>, cwd: &Path, home: &Path, bwrap: Option<PathBuf>) -> Launch {
    fn bind(path: &Path) -> [OsString; 3] {
        [
            OsString::from("--bind"),
            path.as_os_str().to_owned(),
            path.as_os_str().to_owned(),
        ]
    }

    if let Some(program) = bwrap {
        let pi_dir = home.join(".pi");
        let args: Vec<OsString> = ["--ro-bind", "/", "/", "--proc", "/proc", "--dev", "/dev"]
            .map(OsString::from)
            .into_iter()
            .chain(bind(cwd))
            .chain(bind(&pi_dir))
            .chain(bind(Path::new("/tmp")))
            .chain([
                OsString::from("--setenv"),
                OsString::from("HOME"),
                home.as_os_str().to_owned(),
            ])
            .chain([OsString::from("--"), OsString::from("pi")])
            .chain(pi_args.into_iter().map(OsString::from))
            .collect();
        Launch { program, args }
    } else {
        eprintln!("{NO_BWRAP}");
        Launch {
            program: PathBuf::from("pi"),
            args: pi_args.into_iter().map(OsString::from).collect(),
        }
    }
}
