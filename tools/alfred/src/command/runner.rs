use std::fs::File;
use std::io::Write;
use std::num::NonZeroU32;
use std::path::Path;
use std::time::Duration;

use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::{Child, ChildStdout, Command};

use serde_json::Value;

use super::job::{JobPaths, Status};
use super::sandbox::{Launch, find_bwrap, wrap};
use super::spec::RunSpec;

pub const LOG_RESULT_MAX: usize = 500;

#[derive(Debug, Clone, PartialEq)]
pub enum Route {
    Out(String),
    Log(String),
    End(Vec<Value>),
    Skip,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Ended {
    pub status: Status,
    pub messages: Vec<Value>,
}

pub fn route(line: &str) -> Route {
    match serde_json::from_str::<Value>(line) {
        Ok(event) => match event["type"].as_str() {
            Some("message_update") => {
                let update = &event["assistantMessageEvent"];
                let delta = update["delta"].as_str().unwrap_or("").to_string();
                match update["type"].as_str() {
                    Some("text_delta") => Route::Out(delta),
                    Some("thinking_delta") => Route::Log(delta),
                    _ => Route::Skip,
                }
            }
            Some("tool_execution_start") => Route::Log(format!(
                "\n[tool:{}] {}\n",
                event["toolName"].as_str().unwrap_or(""),
                serde_json::to_string(&event["args"]).unwrap_or_default()
            )),
            Some("tool_execution_end") => tool_end(&event),
            Some("agent_end") => {
                Route::End(event["messages"].as_array().cloned().unwrap_or_default())
            }
            _ => Route::Skip,
        },
        Err(_) => Route::Skip,
    }
}

fn tool_end(event: &Value) -> Route {
    let mark = if event["isError"].as_bool().unwrap_or(false) {
        "ERROR: "
    } else {
        ""
    };
    let text = format!(
        "{mark}{}",
        serde_json::to_string(&event["result"]).unwrap_or_default()
    );
    Route::Log(format!(
        "[tool:{}] → {}\n",
        event["toolName"].as_str().unwrap_or(""),
        truncate(&text, LOG_RESULT_MAX)
    ))
}

pub fn sanitize(text: &str) -> String {
    text.chars()
        .scan(0u8, |state, c| {
            let allowed = matches!(c, '\t' | '\n' | '\r' | ' '..='~') || c >= '\u{80}';
            let (kept, next) = match (*state, c) {
                (_, '\u{1b}') => (None, 1),
                (2, c) if c.is_alphabetic() => (None, 0),
                (2, c) if c.is_ascii_digit() || matches!(c, ';' | ':' | '?') => (None, 2),
                (1, '[') => (None, 2),
                (_, c) => (if allowed { Some(c) } else { None }, 0),
            };
            *state = next;
            Some(kept)
        })
        .flatten()
        .collect()
}

pub fn truncate(text: &str, max: usize) -> String {
    let count = text.chars().count();
    if count <= max {
        text.to_string()
    } else {
        format!(
            "{}… [+{} chars]",
            text.chars().take(max).collect::<String>(),
            count - max
        )
    }
}

pub async fn stream(launch: &Launch, paths: &JobPaths, spec: &RunSpec) -> Ended {
    eprintln!("log: {}", paths.log().display());
    eprintln!("output: {}", paths.out().display());
    let result: Ended = match (open(&paths.out()), open(&paths.log())) {
        (Ok(out), Ok(log)) => launch_and_follow(launch, &out, &log, spec.timeout()).await,
        (Err(err), _) | (_, Err(err)) => failed(format!("cannot open the run files: {err}")),
    };
    let _ = result.status.write(&paths.status());
    debug_assert!(
        result.status.is_terminal(),
        "runner.stream: the status is terminal"
    );
    result
}

pub async fn execute(spec: &RunSpec, paths: &JobPaths, cwd: &Path, home: &Path) -> Ended {
    let system = paths.system();
    let result: Ended = match std::fs::write(&system, spec.system()) {
        Ok(()) => {
            let bwrap = find_bwrap(std::env::var_os("PATH").as_deref());
            let launch = wrap(spec.pi_args(&system), cwd, home, bwrap);
            stream(&launch, paths, spec).await
        }
        Err(err) => {
            let ended = failed(format!("cannot write the system prompt: {err}"));
            let _ = ended.status.write(&paths.status());
            ended
        }
    };
    debug_assert!(
        Status::read(&paths.status()).is_terminal(),
        "runner.execute: the status file is terminal"
    );
    result
}

fn open(path: &Path) -> std::io::Result<File> {
    std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)
}

fn failed(reason: String) -> Ended {
    Ended {
        status: Status::Error(reason),
        messages: Vec::new(),
    }
}

async fn launch_and_follow(
    launch: &Launch,
    out: &File,
    log: &File,
    timeout: Option<NonZeroU32>,
) -> Ended {
    let spawned = Command::new(&launch.program)
        .args(&launch.args)
        .stdin(std::process::Stdio::null())
        .stdout(std::process::Stdio::piped())
        .kill_on_drop(true)
        .spawn();
    match (spawned, timeout) {
        (Ok(child), Some(secs)) => {
            let limit = Duration::from_secs(u64::from(secs.get()));
            tokio::time::timeout(limit, follow(child, out, log))
                .await
                .unwrap_or(Ended {
                    status: Status::Timeout,
                    messages: Vec::new(),
                })
        }
        (Ok(child), None) => follow(child, out, log).await,
        (Err(err), _) => failed(format!("pi cannot start: {err}")),
    }
}

async fn follow(mut child: Child, out: &File, log: &File) -> Ended {
    let read = match child.stdout.take() {
        Some(stdout) => pump(stdout, out, log).await,
        None => Err("pi stdout is not piped".to_string()),
    };
    match (read, child.wait().await) {
        (Ok(messages), Ok(exit)) if exit.success() => {
            println!();
            let _ = (&*out).write_all(b"\n");
            Ended {
                status: Status::Done,
                messages,
            }
        }
        (Ok(messages), Ok(exit)) => Ended {
            status: Status::Error(format!("pi exited with {exit}")),
            messages,
        },
        (Err(reason), _) => failed(reason),
        (_, Err(err)) => failed(format!("cannot wait for pi: {err}")),
    }
}

async fn pump(stdout: ChildStdout, out: &File, log: &File) -> Result<Vec<Value>, String> {
    let mut lines = BufReader::new(stdout).lines();
    let mut messages: Vec<Value> = Vec::new();
    loop {
        match lines.next_line().await {
            Ok(Some(line)) => {
                if let Some(found) = apply(route(&line), out, log) {
                    messages = found;
                }
            }
            Ok(None) => break Ok(messages),
            Err(err) => break Err(format!("cannot read pi stdout: {err}")),
        }
    }
}

fn apply(route: Route, out: &File, log: &File) -> Option<Vec<Value>> {
    match route {
        Route::Out(text) => {
            print!("{text}");
            let _ = std::io::stdout().flush();
            let _ = (&*out).write_all(text.as_bytes());
            None
        }
        Route::Log(text) => {
            let _ = (&*log).write_all(sanitize(&text).as_bytes());
            None
        }
        Route::End(found) => Some(found),
        Route::Skip => None,
    }
}
