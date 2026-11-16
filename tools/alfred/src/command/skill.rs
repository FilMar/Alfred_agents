use std::path::{Path, PathBuf};

use super::CommandError;

#[derive(Debug, Clone, PartialEq)]
pub struct Skill {
    name: String,
    file: PathBuf,
    base: PathBuf,
}

impl Skill {
    pub fn roots(cwd: &Path, home: &Path) -> Vec<PathBuf> {
        vec![
            cwd.join(".pi").join("skills"),
            home.join(".pi").join("agent").join("skills"),
        ]
    }

    pub fn find(name: &str, roots: &[PathBuf]) -> Result<Skill, CommandError> {
        roots
            .iter()
            .map(|root| root.join(name))
            .find(|base| base.join("SKILL.md").is_file())
            .map(|base| Skill {
                name: name.to_string(),
                file: base.join("SKILL.md"),
                base,
            })
            .ok_or_else(|| CommandError::BadInput(format!("Skill \"{name}\" not found")))
    }

    pub fn file(&self) -> &Path {
        &self.file
    }

    pub fn block(&self, body: &str) -> String {
        [
            format!(
                "<skill name=\"{}\" location=\"{}\">",
                self.name,
                self.file.display()
            ),
            format!(
                "References inside this skill are relative to {} — resolve them against it.",
                self.base.display()
            ),
            String::new(),
            body.trim().to_string(),
            "</skill>".to_string(),
        ]
        .join("\n")
    }
}
