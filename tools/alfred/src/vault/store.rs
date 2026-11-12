use std::path::{Path, PathBuf};

use super::VaultError;
use super::page::{Heading, Page};

const MAX_ENTRIES: u32 = 10_000;

#[derive(Debug)]
pub struct Vault {
    root: PathBuf,
}

impl Vault {
    pub fn new(root: PathBuf) -> Vault {
        debug_assert!(root.is_absolute(), "Vault.new: root is absolute");
        Vault { root }
    }

    pub fn toc(&self, name: &str) -> Result<Vec<Heading>, VaultError> {
        let result: Result<Vec<Heading>, VaultError> = self.page(name).map(|page| page.toc());
        result
    }

    pub fn read(&self, name: &str, id: Option<&str>) -> Result<String, VaultError> {
        let result: Result<String, VaultError>;
        match self.page(name) {
            Err(e) => result = Err(e),
            Ok(page) => match id {
                None => result = Ok(page.body().to_string()),
                Some(id) => match page.section(id) {
                    Some(section) => result = Ok(section.to_string()),
                    None => {
                        result = Err(VaultError::NoSection {
                            name: name.to_string(),
                            id: id.to_string(),
                        });
                    }
                },
            },
        }
        result
    }

    fn page(&self, name: &str) -> Result<Page, VaultError> {
        let result: Result<Page, VaultError>;
        match self.find(name) {
            Err(e) => result = Err(e),
            Ok(path) => match std::fs::read_to_string(path) {
                Err(e) => result = Err(VaultError::Io(e)),
                Ok(text) => {
                    let page = Page::parse(&text);
                    if page.is_draft() {
                        result = Err(VaultError::NoPage(name.to_string()));
                    } else {
                        result = Ok(page);
                    }
                }
            },
        }
        debug_assert!(
            result.as_ref().map_or(true, |p| !p.is_draft()),
            "Vault.page: never a draft"
        );
        result
    }

    fn find(&self, name: &str) -> Result<PathBuf, VaultError> {
        let result: Result<PathBuf, VaultError>;
        match check_name(name) {
            Err(e) => result = Err(e),
            Ok(()) => {
                if name.contains('/') {
                    let rel = PathBuf::from(format!("{name}.md"));
                    let full = self.root.join(&rel);
                    result = if is_published(&rel) && full.is_file() {
                        Ok(full)
                    } else {
                        Err(VaultError::NoPage(name.to_string()))
                    };
                } else {
                    result = match self.pages() {
                        Err(e) => Err(e),
                        Ok(pages) => {
                            let hits: Vec<PathBuf> = pages
                                .into_iter()
                                .filter(|p| p.file_stem().and_then(|s| s.to_str()) == Some(name))
                                .collect();
                            if hits.len() > 1 {
                                Err(VaultError::Ambiguous {
                                    name: name.to_string(),
                                    paths: hits
                                        .iter()
                                        .map(|p| p.with_extension("").display().to_string())
                                        .collect(),
                                })
                            } else if let Some(p) = hits.first() {
                                Ok(self.root.join(p))
                            } else {
                                Err(VaultError::NoPage(name.to_string()))
                            }
                        }
                    };
                }
            }
        }
        debug_assert!(
            result.as_ref().map_or(true, |p| p.starts_with(&self.root)),
            "Vault.find: path inside the root"
        );
        debug_assert!(
            result.as_ref().map_or(true, |p| is_published(
                p.strip_prefix(&self.root).unwrap_or(p)
            )),
            "Vault.find: path is published"
        );
        result
    }

    fn pages(&self) -> Result<Vec<PathBuf>, VaultError> {
        let mut found: Vec<PathBuf> = Vec::new();
        let mut stack: Vec<PathBuf> = vec![PathBuf::new()];
        let mut entries: u32 = 0;
        let mut failed: Option<VaultError> = None;
        while failed.is_none() {
            let Some(dir) = stack.pop() else { break };
            match std::fs::read_dir(self.root.join(&dir)) {
                Err(e) => failed = Some(VaultError::Io(e)),
                Ok(reader) => {
                    for entry in reader {
                        match entry {
                            Err(e) => {
                                failed = Some(VaultError::Io(e));
                                break;
                            }
                            Ok(entry) => {
                                entries += 1;
                                if entries > MAX_ENTRIES {
                                    failed = Some(VaultError::TooLarge(MAX_ENTRIES));
                                    break;
                                }
                                let rel = dir.join(entry.file_name());
                                if entry.file_type().is_ok_and(|t| t.is_dir()) {
                                    stack.push(rel);
                                } else if is_published(&rel) {
                                    found.push(rel);
                                }
                            }
                        }
                    }
                }
            }
        }
        let result: Result<Vec<PathBuf>, VaultError> = if let Some(e) = failed {
            Err(e)
        } else {
            found.sort();
            Ok(found)
        };
        debug_assert!(
            result
                .as_ref()
                .map_or(true, |ps| ps.iter().all(|p| p.is_relative())),
            "Vault.pages: paths relative to the root"
        );
        result
    }
}

pub(crate) fn is_published(rel: &Path) -> bool {
    debug_assert!(rel.is_relative(), "is_published: path is relative");
    let result: bool = rel.extension().and_then(|ext| ext.to_str()) == Some("md")
        && rel.components().all(|c| {
            !matches!(
                c.as_os_str().to_str(),
                Some("private" | "templates" | ".obsidian")
            )
        })
        && !matches!(
            rel.file_name().and_then(|f| f.to_str()),
            Some("README.md" | "CLAUDE.md" | "ROADMAP.md")
        );
    result
}

pub(crate) fn check_name(name: &str) -> Result<(), VaultError> {
    let result: Result<(), VaultError> =
        if name.starts_with('/') || name.split('/').any(|part| part == "..") {
            Err(VaultError::BadName(name.to_string()))
        } else {
            Ok(())
        };
    result
}
