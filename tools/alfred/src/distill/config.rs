use serde::{Deserialize, Serialize};

use crate::chat::Think;
use crate::hist::Extractor as Row;

pub const MODEL_ENV: &str = "ALFRED_DISTILL_MODEL";

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Role {
    pub model: String,
    pub think: Think,
    pub temperature: f32,
    pub system: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum DropWhen {
    #[serde(rename = "atLeast")]
    AtLeast,
    #[serde(rename = "under")]
    Under,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CriticCheck {
    pub name: String,
    pub text: String,
    pub drop_when: DropWhen,
    pub threshold: f64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Config {
    pub episodes: Role,
    pub extract: Role,
    pub critic: Role,
    pub novelty: Role,
    pub checks: Vec<CriticCheck>,
    pub episode_chars: u32,
    pub target_input_chars: u32,
    pub target_output_chars: u32,
    pub listing_chars: u32,
    pub vocabulary_size: u32,
    pub top_k: u32,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Extractor {
    id: i64,
    config: Config,
}

impl CriticCheck {
    pub fn drops(&self, p: f64) -> bool {
        debug_assert!(
            (0.0..=1.0).contains(&p),
            "CriticCheck.drops: p is from 0 to 1"
        );
        let result: bool = match self.drop_when {
            DropWhen::AtLeast => p >= self.threshold,
            DropWhen::Under => p < self.threshold,
        };
        result
    }
}

impl Extractor {
    pub fn from_row(row: &Row, model: Option<&str>) -> Result<Extractor, String> {
        debug_assert!(
            model.is_none_or(|m| !m.trim().is_empty()),
            "Extractor.from_row: an override model is not blank"
        );
        let result: Result<Extractor, String> = match serde_json::from_str(&row.config) {
            Err(error) => Err(format!(
                "extractor {}: config is not an extractor: {error}",
                row.id
            )),
            Ok(mut config) => {
                if let Some(fault) = bad_config(&config) {
                    Err(fault)
                } else {
                    if let Some(model) = model {
                        for role in [
                            &mut config.episodes,
                            &mut config.extract,
                            &mut config.critic,
                            &mut config.novelty,
                        ] {
                            role.model = model.to_string();
                        }
                    }
                    Ok(Extractor { id: row.id, config })
                }
            }
        };
        debug_assert!(
            result
                .as_ref()
                .map_or(true, |e| bad_config(&e.config).is_none()),
            "Extractor.from_row: the config passes the check"
        );
        debug_assert!(
            result
                .as_ref()
                .map_or(true, |e| model.is_none_or(|m| uses_only(&e.config, m))),
            "Extractor.from_row: the override model is in every role"
        );
        result
    }

    pub fn id(&self) -> i64 {
        self.id
    }

    pub fn config(&self) -> &Config {
        &self.config
    }
}

pub fn bad_config(config: &Config) -> Option<String> {
    let result: Option<String> = bad_shape(config).or_else(|| bad_part(config));
    result
}

fn bad_shape(config: &Config) -> Option<String> {
    let sizes = [
        ("episodeChars", config.episode_chars),
        ("targetInputChars", config.target_input_chars),
        ("targetOutputChars", config.target_output_chars),
        ("listingChars", config.listing_chars),
        ("vocabularySize", config.vocabulary_size),
        ("topK", config.top_k),
    ];
    let mut names: Vec<&str> = config.checks.iter().map(|c| c.name.as_str()).collect();
    names.sort_unstable();
    let duplicate = names.windows(2).any(|pair| pair[0] == pair[1]);
    let size = sizes.iter().find(|(_, value)| *value == 0);
    if config.checks.is_empty() {
        Some("no critic check".to_string())
    } else if duplicate {
        Some("check names are not unique".to_string())
    } else {
        size.map(|(name, _)| format!("{name} is not positive"))
    }
}

fn bad_part(config: &Config) -> Option<String> {
    let roles = [
        ("episodes", &config.episodes),
        ("extract", &config.extract),
        ("critic", &config.critic),
        ("novelty", &config.novelty),
    ];
    let role_fault = |bad: fn(&Role) -> bool, what: &str| {
        roles
            .iter()
            .find(|(_, role)| bad(role))
            .map(|(name, _)| format!("{name} {what}"))
    };
    let check_fault = |bad: fn(&CriticCheck) -> bool, what: &str| {
        config
            .checks
            .iter()
            .find(|check| bad(check))
            .map(|check| format!("check {} {what}", check.name))
    };
    role_fault(|r| r.model.trim().is_empty(), "model is blank")
        .or_else(|| role_fault(|r| r.system.trim().is_empty(), "system is blank"))
        .or_else(|| {
            role_fault(
                |r| !r.temperature.is_finite() || r.temperature < 0.0,
                "temperature is not finite and at least 0",
            )
        })
        .or_else(|| {
            check_fault(
                |c| !(0.0..=1.0).contains(&c.threshold),
                "threshold is not from 0 to 1",
            )
        })
        .or_else(|| check_fault(|c| c.text.trim().is_empty(), "text is blank"))
}

fn uses_only(config: &Config, model: &str) -> bool {
    [
        &config.episodes,
        &config.extract,
        &config.critic,
        &config.novelty,
    ]
    .iter()
    .all(|role| role.model == model)
}
