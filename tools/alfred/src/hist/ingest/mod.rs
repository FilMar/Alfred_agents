pub mod formats;
pub mod transcript;

use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::client::{Client, ClientError};
use transcript::Parsed;

pub const MAX_KNOWN: u32 = 5_000;
pub const MAX_FILES: usize = 100_000;

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct Summary {
    pub transcripts: u32,
    pub sessions: u32,
    pub exchanges: u32,
    pub known: u32,
    pub orphans: u32,
}

#[derive(Debug, Clone)]
pub struct Roots {
    pub claude: PathBuf,
    pub pi: PathBuf,
}

impl Summary {
    pub fn plus(self, other: Summary) -> Summary {
        let result: Summary = Summary {
            transcripts: self.transcripts.saturating_add(other.transcripts),
            sessions: self.sessions.saturating_add(other.sessions),
            exchanges: self.exchanges.saturating_add(other.exchanges),
            known: self.known.saturating_add(other.known),
            orphans: self.orphans.saturating_add(other.orphans),
        };
        debug_assert!(
            result.transcripts == self.transcripts + other.transcripts,
            "Summary.plus: transcripts add up"
        );
        result
    }
}

impl Roots {
    pub fn from_env() -> Roots {
        let result: Roots = {
            let home = std::env::var_os("HOME")
                .map(PathBuf::from)
                .unwrap_or_default();
            let claude = match std::env::var_os("TL_TRANSCRIPTS") {
                Some(root) => PathBuf::from(root),
                None => home.join(".claude").join("projects"),
            };
            let pi = match std::env::var_os("TL_PI_SESSIONS") {
                Some(root) => PathBuf::from(root),
                None => home.join(".pi").join("agent").join("sessions"),
            };
            Roots { claude, pi }
        };
        result
    }

    pub fn all(&self) -> Vec<PathBuf> {
        let result: Vec<PathBuf> = 'walk: {
            let mut files: Vec<PathBuf> = Vec::new();
            for root in [&self.claude, &self.pi] {
                let Ok(projects) = std::fs::read_dir(root) else {
                    continue;
                };
                for project in projects.flatten() {
                    let project = project.path();
                    if !project.is_dir() {
                        continue;
                    }
                    let Ok(entries) = std::fs::read_dir(&project) else {
                        continue;
                    };
                    for entry in entries.flatten() {
                        let file = entry.path();
                        if file.extension().is_some_and(|ext| ext == "jsonl") && file.is_file() {
                            files.push(file);
                            if files.len() >= MAX_FILES {
                                break 'walk files;
                            }
                        }
                    }
                }
            }
            files
        };
        debug_assert!(result.len() <= MAX_FILES, "Roots.all: at most MAX_FILES");
        debug_assert!(
            result
                .iter()
                .all(|p| p.extension().is_some_and(|e| e == "jsonl")),
            "Roots.all: only jsonl files"
        );
        result
    }

    pub fn find(&self, session: &str) -> Option<PathBuf> {
        let result: Option<PathBuf> = 'search: {
            let exact = format!("{session}.jsonl");
            let suffix = format!("_{session}.jsonl");
            let mut loose: Option<PathBuf> = None;
            for root in [&self.claude, &self.pi] {
                let Ok(projects) = std::fs::read_dir(root) else {
                    continue;
                };
                for project in projects.flatten() {
                    let project = project.path();
                    if !project.is_dir() {
                        continue;
                    }
                    let Ok(entries) = std::fs::read_dir(&project) else {
                        continue;
                    };
                    for entry in entries.flatten() {
                        let file = entry.path();
                        if !file.is_file() {
                            continue;
                        }
                        let Some(name) = file.file_name().and_then(|raw| raw.to_str()) else {
                            continue;
                        };
                        if name == exact {
                            break 'search Some(file);
                        }
                        if loose.is_none() && name.ends_with(suffix.as_str()) {
                            loose = Some(file);
                        }
                    }
                }
            }
            loose
        };
        result
    }
}

pub fn looks_like_pi(text: &str) -> bool {
    let result: bool = text
        .lines()
        .find_map(|line| serde_json::from_str::<serde_json::Value>(line.trim()).ok())
        .is_some_and(|first| first.get("type").and_then(|kind| kind.as_str()) == Some("session"));
    result
}

pub fn parse(text: &str, host: Option<&str>) -> Parsed {
    let result: Parsed = transcript::parse(
        if looks_like_pi(text) {
            &formats::PI
        } else {
            &formats::CLAUDE
        },
        &transcript::parse_lines(text),
        host,
    );
    result
}

pub async fn transcript(
    client: &Client,
    path: &Path,
    refresh: bool,
    host: Option<&str>,
) -> Result<Summary, ClientError> {
    let result: Result<Summary, ClientError> = async {
        let text = std::fs::read_to_string(path).map_err(|error| {
            ClientError::Input(format!("cannot read {}: {error}", path.display()))
        })?;
        let parsed = parse(&text, host);
        let Some(session) = parsed.session else {
            return Ok(Summary {
                transcripts: 1,
                sessions: 0,
                exchanges: 0,
                known: 0,
                orphans: 0,
            });
        };
        let known = if refresh {
            Vec::new()
        } else {
            known_ids(client, &session.id).await?
        };
        let (fresh, known) = split_known(parsed.exchanges, &known);
        let (exchanges, contents): (Vec<crate::hist::Exchange>, Vec<crate::hist::Contents>) =
            fresh.into_iter().unzip();
        let summary = Summary {
            transcripts: 1,
            sessions: 1,
            exchanges: exchanges.len() as u32,
            known,
            orphans: parsed.orphans,
        };
        let _: serde_json::Value = client.post("/hist/sessions", &[session]).await?;
        if !exchanges.is_empty() {
            let _: serde_json::Value = client.post("/hist/exchanges", &exchanges).await?;
            let _: serde_json::Value = client.post("/hist/contents", &contents).await?;
        }
        Ok(summary)
    }
    .await;
    debug_assert!(
        result.as_ref().map_or(true, |s| s.transcripts == 1),
        "ingest.transcript: one transcript"
    );
    result
}

pub fn modified_at(path: &Path) -> Option<String> {
    let modified = std::fs::metadata(path).and_then(|m| m.modified()).ok();
    let result: Option<String> = modified
        .and_then(|time| jiff::Timestamp::try_from(time).ok())
        .map(|at| at.strftime("%Y-%m-%dT%H:%M:%S%.3fZ").to_string());
    debug_assert!(
        result
            .as_ref()
            .is_none_or(|t| crate::hist::validate::is_timestamp(t)),
        "modified_at: ISO with milliseconds"
    );
    result
}

pub fn hostname() -> Option<String> {
    let result: Option<String> = std::fs::read_to_string("/proc/sys/kernel/hostname")
        .ok()
        .map(|text| text.trim().to_owned())
        .filter(|name| !name.is_empty());
    debug_assert!(
        result
            .as_ref()
            .is_none_or(|h| !h.is_empty() && !h.ends_with('\n')),
        "hostname: no empty name, no newline"
    );
    result
}

async fn known_ids(client: &Client, session: &str) -> Result<Vec<String>, ClientError> {
    let limit = MAX_KNOWN.to_string();
    let known: Vec<crate::hist::Exchange> = client
        .get(
            "/hist/exchanges",
            &[("session", session), ("limit", limit.as_str())],
        )
        .await?;
    Ok(known.into_iter().map(|e| e.id).collect())
}

pub(crate) fn split_known(
    exchanges: Vec<(crate::hist::Exchange, crate::hist::Contents)>,
    known: &[String],
) -> (Vec<(crate::hist::Exchange, crate::hist::Contents)>, u32) {
    let total = exchanges.len();
    let fresh: Vec<_> = exchanges
        .into_iter()
        .filter(|(e, _)| !known.contains(&e.id))
        .collect();
    let count = (total - fresh.len()) as u32;
    let result = (fresh, count);
    debug_assert!(
        result.0.len() + result.1 as usize == total,
        "split_known: every exchange is fresh or known"
    );
    result
}
