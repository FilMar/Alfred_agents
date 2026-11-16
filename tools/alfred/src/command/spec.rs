use std::num::NonZeroU32;
use std::path::Path;

use super::CommandError;

pub const SEPARATOR: &str = "\n\n---\n\n";

#[derive(Debug, Clone, PartialEq)]
pub struct Label(String);

#[derive(Debug, Clone, PartialEq)]
pub struct RunSpec {
    label: Label,
    task: String,
    system: String,
    tools: Vec<String>,
    thinking: Option<String>,
    model: Option<String>,
    timeout: Option<NonZeroU32>,
    skill: Option<String>,
}

#[derive(Debug, Clone, Default)]
pub struct RunParts {
    pub task: String,
    pub role: Option<String>,
    pub hat: Option<String>,
    pub hat_text: Option<String>,
    pub skill: Option<String>,
    pub skill_block: Option<String>,
    pub tools: Option<String>,
    pub thinking: Option<String>,
    pub model: Option<String>,
    pub timeout: Option<NonZeroU32>,
}

impl Label {
    pub fn of(hat: Option<&str>, skill: Option<&str>) -> Result<Label, CommandError> {
        debug_assert!(
            hat.is_some() || skill.is_some(),
            "Label.of: a hat or a skill"
        );
        let name = hat.or(skill).expect("Label.of: a hat or a skill");
        let result: Result<Label, CommandError> = if safe_name(name) {
            Ok(Label(name.to_string()))
        } else {
            Err(CommandError::BadInput(format!(
                "label \"{name}\": only letters, digits, - and _"
            )))
        };
        debug_assert!(
            labels_with(&result, hat.or(skill)),
            "Label.of: the hat, else the skill"
        );
        debug_assert!(
            result
                .as_ref()
                .map_or(true, |label| safe_name(label.as_str())),
            "Label.of: only letters, digits, - and _"
        );
        result
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

pub fn safe_name(name: &str) -> bool {
    !name.is_empty()
        && name
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
}

pub fn compose(role: Option<&str>, hat: Option<&str>, skill: Option<&str>) -> String {
    let result: String = [role, hat, skill]
        .into_iter()
        .flatten()
        .filter(|block| !block.trim().is_empty())
        .collect::<Vec<&str>>()
        .join(SEPARATOR);
    debug_assert!(
        in_order(&result, &[role, hat, skill]),
        "compose: role, hat, skill in this order"
    );
    debug_assert!(no_blank_block(&result), "compose: no blank block");
    result
}

fn labels_with(result: &Result<Label, CommandError>, name: Option<&str>) -> bool {
    result
        .as_ref()
        .map_or(true, |label| Some(label.as_str()) == name)
}

fn no_blank_block(prompt: &str) -> bool {
    prompt.is_empty() || !prompt.split(SEPARATOR).any(|block| block.trim().is_empty())
}

fn in_order(prompt: &str, blocks: &[Option<&str>]) -> bool {
    blocks
        .iter()
        .copied()
        .flatten()
        .filter(|block| !block.trim().is_empty())
        .collect::<Vec<&str>>()
        .join(SEPARATOR)
        == prompt
}

pub fn parse_tools(raw: Option<&str>) -> Vec<String> {
    raw.unwrap_or("")
        .split(',')
        .map(str::trim)
        .filter(|tool| !tool.is_empty())
        .map(str::to_string)
        .collect()
}

impl RunSpec {
    pub fn of(parts: RunParts) -> Result<RunSpec, CommandError> {
        let RunParts {
            task,
            role,
            hat,
            hat_text,
            skill,
            skill_block,
            tools,
            thinking,
            model,
            timeout,
        } = parts;
        Ok(RunSpec {
            label: Label::of(hat.as_deref(), skill.as_deref())?,
            task,
            system: compose(role.as_deref(), hat_text.as_deref(), skill_block.as_deref()),
            tools: parse_tools(tools.as_deref()),
            thinking,
            model,
            timeout,
            skill,
        })
    }

    pub fn pi_args(&self, system_file: &Path) -> Vec<String> {
        [
            vec![
                "-p".to_string(),
                "--mode".to_string(),
                "json".to_string(),
                "--no-session".to_string(),
                "--no-extensions".to_string(),
                "--no-context-files".to_string(),
                "--no-skills".to_string(),
                "--system-prompt".to_string(),
                system_file.to_string_lossy().into_owned(),
            ],
            if self.tools.is_empty() {
                Vec::new()
            } else {
                vec!["--tools".to_string(), self.tools.join(",")]
            },
            self.model
                .clone()
                .map(|model| vec!["--model".to_string(), model])
                .unwrap_or_default(),
            self.thinking
                .clone()
                .map(|thinking| vec!["--thinking".to_string(), thinking])
                .unwrap_or_default(),
            vec!["--".to_string(), self.task.clone()],
        ]
        .concat()
    }

    pub fn label(&self) -> &Label {
        &self.label
    }

    pub fn task(&self) -> &str {
        &self.task
    }

    pub fn system(&self) -> &str {
        &self.system
    }

    pub fn thinking(&self) -> Option<&str> {
        self.thinking.as_deref()
    }

    pub fn timeout(&self) -> Option<NonZeroU32> {
        self.timeout
    }

    pub fn skill(&self) -> Option<&str> {
        self.skill.as_deref()
    }
}
