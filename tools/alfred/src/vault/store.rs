use std::path::{Path, PathBuf};

use super::TocReply;
use super::VaultError;
use super::page::Page;

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

    pub fn toc(&self, name: &str) -> Result<TocReply, VaultError> {
        self.page(name).map(|(path, page)| TocReply {
            path,
            chars: u32::try_from(page.body().chars().count()).unwrap_or(u32::MAX),
            headings: page.toc(),
        })
    }

    pub fn read(&self, name: &str, id: Option<&str>) -> Result<String, VaultError> {
        self.page(name).and_then(|(_, page)| match id {
            None => Ok(page.body().to_string()),
            Some(id) => page
                .section(id)
                .map(str::to_string)
                .ok_or_else(|| VaultError::NoSection {
                    name: name.to_string(),
                    id: id.to_string(),
                }),
        })
    }

    fn page(&self, name: &str) -> Result<(String, Page), VaultError> {
        let path = self.find(name)?;
        let page = Page::parse(&std::fs::read_to_string(&path)?);
        let rel = path
            .strip_prefix(&self.root)
            .unwrap_or(&path)
            .with_extension("");
        let result: Result<(String, Page), VaultError> = if page.is_draft() {
            Err(VaultError::NoPage(name.to_string()))
        } else {
            Ok((rel.display().to_string(), page))
        };
        debug_assert!(
            result.as_ref().map_or(true, |(_, p)| !p.is_draft()),
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
    rel.extension().and_then(|ext| ext.to_str()) == Some("md")
        && rel.components().all(|c| {
            !matches!(
                c.as_os_str().to_str(),
                Some("private" | "templates" | ".obsidian")
            )
        })
        && !matches!(
            rel.file_name().and_then(|f| f.to_str()),
            Some("README.md" | "CLAUDE.md" | "ROADMAP.md")
        )
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
