use serde_json::Value;

use super::ask::Answer;
use super::config::Extractor;
use super::episodes::{Episode, SessionMap};
use super::rule::Checked;
use super::session::Turn;
use crate::chat::Chat;

pub const QUALITY_BAR_HEAD: &str = "## Quality bar\nThe guide below sets the bar of the memory. It is written for an agent that saves by hand. Use its bar. Skip its commands: you cannot run them.";
pub const RULE_GUIDE: &str = include_str!("../rules/guide.md");

#[derive(Debug, Clone, Copy)]
pub struct Target<'a> {
    map: &'a SessionMap,
    episode: &'a Episode,
    index: u32,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Extraction {
    answer: Answer,
    rules: Vec<Checked>,
}

impl<'a> Target<'a> {
    pub fn of(map: &'a SessionMap, episode: &'a Episode, index: u32) -> Target<'a> {
        debug_assert!(
            map.episodes().iter().any(|e| std::ptr::eq(e, episode)),
            "Target.of: the episode is in the map"
        );
        debug_assert!(
            (index as usize) < episode.turns().len(),
            "Target.of: the index is a turn of the episode"
        );
        Target {
            map,
            episode,
            index,
        }
    }

    pub fn map(&self) -> &'a SessionMap {
        self.map
    }

    pub fn episode(&self) -> &'a Episode {
        self.episode
    }

    pub fn turn(&self) -> &'a Turn {
        &self.episode.turns()[self.index as usize]
    }

    pub fn episode_text(&self, episode_chars: u32) -> String {
        debug_assert!(
            episode_chars > 0,
            "Target.episode_text: episode_chars is positive"
        );
        let result: String = self
            .episode
            .turns()
            .iter()
            .enumerate()
            .map(|(k, turn)| {
                format!(
                    "[{}]{} USER: {}\nAGENT: {}",
                    k,
                    if k == self.index as usize {
                        " <<< TARGET"
                    } else {
                        ""
                    },
                    super::episodes::cut(turn.input(), episode_chars),
                    super::episodes::cut(turn.output(), episode_chars),
                )
            })
            .collect::<Vec<_>>()
            .join("\n\n");
        debug_assert!(
            result.matches(" <<< TARGET").count() == 1,
            "Target.episode_text: the target is marked once"
        );
        result
    }

    pub fn text(&self, input_chars: u32, output_chars: u32) -> String {
        debug_assert!(input_chars > 0, "Target.text: input_chars is positive");
        debug_assert!(output_chars > 0, "Target.text: output_chars is positive");
        let result: String = format!(
            "USER: {}\n\nAGENT: {}",
            super::episodes::cut(self.turn().input(), input_chars),
            super::episodes::cut(self.turn().output(), output_chars),
        );
        result
    }
}

impl Extraction {
    pub async fn from(
        chat: &Chat,
        target: &Target<'_>,
        vocabulary: &[String],
        extractor: &Extractor,
    ) -> Extraction {
        debug_assert!(
            !vocabulary.is_empty(),
            "Extraction.from: the vocabulary is not empty"
        );
        let prompt = extraction_prompt(target, vocabulary, extractor);
        let answer = super::ask::ask(
            chat,
            &extractor.config().extract,
            &prompt,
            &candidates_check,
        )
        .await;
        let rules = if answer.is_ok() {
            check_candidates(answer.json(), target, vocabulary)
        } else {
            Vec::new()
        };
        let result: Extraction = Extraction { answer, rules };
        debug_assert!(
            result.answer.is_ok() || result.rules.is_empty(),
            "Extraction.from: a failed answer has no rule"
        );
        debug_assert!(
            !result.answer.is_ok()
                || Some(result.rules.len())
                    == result.answer.json()["rules"].as_array().map(Vec::len),
            "Extraction.from: one checked rule per rule of an ok answer"
        );
        result
    }

    pub fn answer(&self) -> &Answer {
        &self.answer
    }

    pub fn rules(&self) -> &[Checked] {
        &self.rules
    }
}

pub fn quality_bar() -> String {
    format!("{QUALITY_BAR_HEAD}\n\n{}", RULE_GUIDE.trim_end())
}

pub fn extraction_prompt(
    target: &Target<'_>,
    vocabulary: &[String],
    extractor: &Extractor,
) -> String {
    debug_assert!(
        !vocabulary.is_empty(),
        "extraction_prompt: the vocabulary is not empty"
    );
    let result: String = format!(
        "{}\n\nTag vocabulary: {}\n\n{}\n\n## How this episode ended\n{}\n\n## The episode (context)\n{}\n\n## >>> TARGET: extract only from this exchange <<<\n{}",
        quality_bar(),
        vocabulary.join(", "),
        target.map().text(),
        target.episode().summary(),
        target.episode_text(extractor.config().episode_chars),
        target.text(
            extractor.config().target_input_chars,
            extractor.config().target_output_chars,
        ),
    );
    result
}

pub fn candidates_check(json: &Value) -> Option<String> {
    let result: Option<String> = match json.get("rules").and_then(Value::as_array) {
        None => Some(String::from("need a list `rules`")),
        Some(rules) => rules.iter().enumerate().find_map(|(i, rule)| {
            let shaped = rule.get("if").and_then(Value::as_str).is_some()
                && rule.get("do").and_then(Value::as_str).is_some()
                && rule.get("quote").and_then(Value::as_str).is_some()
                && rule
                    .get("tags")
                    .and_then(Value::as_array)
                    .is_some_and(|tags| tags.iter().all(Value::is_string));
            (!shaped).then(|| {
                format!(
                    "rules[{i}] is not a rule: it needs if, do and quote as strings, and tags as a list of strings"
                )
            })
        }),
    };
    result
}

pub fn check_candidates(json: &Value, target: &Target<'_>, vocabulary: &[String]) -> Vec<Checked> {
    debug_assert!(
        candidates_check(json).is_none(),
        "check_candidates: the json passes the check"
    );
    let tags = super::rule::TagVocabulary::of(vocabulary);
    let evidence = super::rule::Evidence {
        user: target.turn().input(),
        vocabulary: &tags,
    };
    let result: Vec<Checked> = Checked::dedupe(
        json["rules"]
            .as_array()
            .map(|rules| {
                rules
                    .iter()
                    .map(|rule| {
                        super::rule::RuleCandidate::from_model(rule)
                            .expect("check_candidates: every rule passed the check")
                            .check(&evidence)
                    })
                    .collect()
            })
            .unwrap_or_default(),
    );
    debug_assert!(
        Some(result.len()) == json["rules"].as_array().map(Vec::len),
        "check_candidates: one checked rule per rule of the answer"
    );
    result
}
