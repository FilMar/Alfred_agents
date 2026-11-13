use serde_json::{Map, Value};

use super::ask::Answer;
use super::config::{CriticCheck, Extractor};
use super::extract::Target;
use super::rule::RuleCandidate;
use crate::chat::Chat;

pub type Probabilities = Map<String, Value>;

#[derive(Debug, Clone, PartialEq)]
pub struct Judgement {
    answer: Answer,
    probabilities: Option<Probabilities>,
    drop: Option<String>,
}

impl Judgement {
    pub async fn of(
        chat: &Chat,
        target: &Target<'_>,
        candidate: &RuleCandidate,
        extractor: &Extractor,
    ) -> Judgement {
        let prompt = critic_prompt(target, candidate, extractor);
        let checks = &extractor.config().checks;
        let check = |json: &Value| probabilities_check(json, checks);
        let answer: Answer =
            super::ask::ask(chat, &extractor.config().critic, &prompt, &check).await;
        let probabilities = answer
            .is_ok()
            .then(|| answer.json().as_object().cloned())
            .flatten();
        let drop = probabilities
            .as_ref()
            .and_then(|p| drop_of(p, &extractor.config().checks));
        let result: Judgement = Judgement {
            answer,
            probabilities,
            drop,
        };
        debug_assert!(
            result.probabilities.is_some() == result.answer.is_ok(),
            "Judgement.of: probabilities exactly when the answer is ok"
        );
        debug_assert!(
            result.drop
                == result
                    .probabilities
                    .as_ref()
                    .and_then(|p| drop_of(p, &extractor.config().checks)),
            "Judgement.of: the drop is the first check that drops"
        );
        result
    }

    pub fn answer(&self) -> &Answer {
        &self.answer
    }

    pub fn probabilities(&self) -> Option<&Probabilities> {
        self.probabilities.as_ref()
    }

    pub fn drop(&self) -> Option<&str> {
        self.drop.as_deref()
    }
}

pub fn critic_prompt(
    target: &Target<'_>,
    candidate: &RuleCandidate,
    extractor: &Extractor,
) -> String {
    let result: String = format!(
        "{}\n\n## How this episode ended\n{}\n\n## The episode (context)\n{}\n\n## The exchange the candidate comes from\n{}\n\n## The candidate (rule)\n{}\n\n## Questions\nAnswer with one JSON object. Each key is a question name. Each value is a probability from 0.0 to 1.0 that the answer is yes.\n{}",
        target.map().text(),
        target.episode().summary(),
        target.episode_text(extractor.config().episode_chars),
        target.text(
            extractor.config().target_input_chars,
            extractor.config().target_output_chars,
        ),
        serde_json::to_string(candidate).unwrap_or_default(),
        extractor
            .config()
            .checks
            .iter()
            .map(|c| format!("- {}: {}", c.name, c.text))
            .collect::<Vec<_>>()
            .join("\n")
    );
    debug_assert!(
        extractor
            .config()
            .checks
            .iter()
            .all(|c| result.contains(&format!("- {}: ", c.name))),
        "critic_prompt: every check is asked"
    );
    result
}

pub fn probabilities_check(json: &Value, checks: &[CriticCheck]) -> Option<String> {
    debug_assert!(
        !checks.is_empty(),
        "probabilities_check: at least one check"
    );
    if json.as_object().is_some_and(|map| {
        map.len() == checks.len()
            && checks.iter().all(|c| {
                map.get(&c.name)
                    .and_then(Value::as_f64)
                    .is_some_and(|p| (0.0..=1.0).contains(&p))
            })
    }) {
        None
    } else {
        Some(format!(
            "need exactly these keys, each a number from 0 to 1: {}",
            checks
                .iter()
                .map(|c| c.name.as_str())
                .collect::<Vec<_>>()
                .join(", ")
        ))
    }
}

pub fn drop_of(probabilities: &Probabilities, checks: &[CriticCheck]) -> Option<String> {
    debug_assert!(
        checks.iter().all(|c| probabilities.contains_key(&c.name)),
        "drop_of: every check has a probability"
    );
    let result = checks
        .iter()
        .find(|c| probabilities[&c.name].as_f64().is_some_and(|p| c.drops(p)))
        .map(|c| c.name.clone());
    debug_assert!(
        is_first_drop(result.as_deref(), probabilities, checks),
        "drop_of: the drop is the first check in order that drops, or none drops"
    );
    result
}

fn is_first_drop(
    drop: Option<&str>,
    probabilities: &Probabilities,
    checks: &[CriticCheck],
) -> bool {
    let drops = |c: &CriticCheck| probabilities[&c.name].as_f64().is_some_and(|p| c.drops(p));
    checks.iter().find(|c| drops(c)).map(|c| c.name.as_str()) == drop
}
