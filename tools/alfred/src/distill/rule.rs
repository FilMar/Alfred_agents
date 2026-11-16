use std::collections::{HashMap, HashSet};

use serde::{Deserialize, Serialize};

use super::text::{is_italian, norm_text, quote_in, tag_key};
use crate::rules::Rule;
use crate::sorted::{sorted_by, sorted_by_key};

pub const MAX_TAGS: usize = 3;
pub const RULE_QUOTE_MIN: usize = 8;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Drop {
    Empty,
    Tags,
    RuleQuote,
    Italian,
    SameQuote,
}

pub const CHECKS: [Drop; 4] = [Drop::Empty, Drop::Tags, Drop::RuleQuote, Drop::Italian];

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RuleCandidate {
    #[serde(rename = "if")]
    pub if_: String,
    #[serde(rename = "do")]
    pub do_: String,
    pub tags: Vec<String>,
    #[serde(rename = "proposedTags", default)]
    pub proposed_tags: Vec<String>,
    pub quote: String,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Checked {
    candidate: RuleCandidate,
    drop: Option<Drop>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct TagVocabulary {
    by_key: HashMap<String, String>,
}

#[derive(Debug, Clone, Copy)]
pub struct Evidence<'a> {
    pub user: &'a str,
    pub vocabulary: &'a TagVocabulary,
}

impl Drop {
    pub fn name(self) -> &'static str {
        match self {
            Drop::Empty => "empty",
            Drop::Tags => "tags",
            Drop::RuleQuote => "rule_quote",
            Drop::Italian => "italian",
            Drop::SameQuote => "same_quote",
        }
    }
}

impl RuleCandidate {
    pub fn from_model(raw: &serde_json::Value) -> Option<RuleCandidate> {
        let result: Option<RuleCandidate> = serde_json::from_value::<RuleCandidate>(raw.clone())
            .ok()
            .map(|candidate| RuleCandidate {
                proposed_tags: Vec::new(),
                ..candidate
            });
        debug_assert!(
            result.as_ref().is_none_or(|c| c.proposed_tags.is_empty()),
            "RuleCandidate.from_model: the model proposes no tag of its own"
        );
        result
    }

    pub fn check(self, evidence: &Evidence<'_>) -> Checked {
        let before = self.clone();
        let drop = CHECKS.into_iter().find(|d| self.fails(*d, evidence));
        let candidate = match drop {
            None => self.with_cut_tags(evidence.vocabulary),
            Some(_) => self,
        };
        let result: Checked = Checked { candidate, drop };
        debug_assert!(
            !result.is_kept() || is_cut_of(&result.candidate, &before.tags, evidence.vocabulary),
            "RuleCandidate.check: a kept rule keeps its known tags first, then proposed ones"
        );
        debug_assert!(
            result.is_kept() || result.candidate == before,
            "RuleCandidate.check: a dropped result carries this candidate"
        );
        debug_assert!(
            result.drop
                == CHECKS
                    .into_iter()
                    .find(|d| result.candidate.fails(*d, evidence)),
            "RuleCandidate.check: the drop is the first check in order the rule fails"
        );
        result
    }

    fn with_cut_tags(self, vocabulary: &TagVocabulary) -> RuleCandidate {
        let (known, offered) = (
            vocabulary.known(&self.tags),
            vocabulary.proposed(&self.tags),
        );
        let tags = known.len().min(MAX_TAGS);
        let proposed = offered.len().min(MAX_TAGS - tags);
        RuleCandidate {
            tags: known[..tags].to_vec(),
            proposed_tags: offered[..proposed].to_vec(),
            ..self
        }
    }

    fn fails(&self, drop: Drop, evidence: &Evidence<'_>) -> bool {
        let result: bool = match drop {
            Drop::Empty => self.if_.trim().is_empty() || self.do_.trim().is_empty(),
            Drop::Tags => evidence.vocabulary.known(&self.tags).is_empty(),
            Drop::RuleQuote => !quote_in(&self.quote, evidence.user, RULE_QUOTE_MIN),
            Drop::Italian => !is_italian(&format!("{} {}", self.if_, self.do_)),
            Drop::SameQuote => false,
        };
        result
    }
}

impl Checked {
    pub fn candidate(&self) -> &RuleCandidate {
        &self.candidate
    }

    pub fn drop(&self) -> Option<Drop> {
        self.drop
    }

    pub fn is_kept(&self) -> bool {
        self.drop.is_none()
    }

    pub fn dedupe(checked: Vec<Checked>) -> Vec<Checked> {
        let before: Vec<Option<Drop>> = checked.iter().map(Checked::drop).collect();
        let result: Vec<Checked> = checked
            .into_iter()
            .fold(
                (Vec::<Checked>::new(), Vec::<String>::new()),
                |(out, seen), c| {
                    let quote = norm_text(&c.candidate.quote);
                    let kept = c.is_kept();
                    let same = kept && seen.iter().any(|q| q == &quote);
                    let next = if same {
                        Checked {
                            drop: Some(Drop::SameQuote),
                            ..c
                        }
                    } else {
                        c
                    };
                    let seen = if kept && !same {
                        [seen, vec![quote]].concat()
                    } else {
                        seen
                    };
                    ([out, vec![next]].concat(), seen)
                },
            )
            .0;
        debug_assert!(
            result.len() == before.len(),
            "Checked.dedupe: every rule is kept or dropped"
        );
        debug_assert!(
            only_new_drops(&before, &result),
            "Checked.dedupe: a dropped rule keeps its reason, a new drop is same_quote"
        );
        debug_assert!(
            unique_kept_quotes(&result),
            "Checked.dedupe: no two kept rules share a quote"
        );
        result
    }
}

impl TagVocabulary {
    pub fn of(tags: &[String]) -> TagVocabulary {
        debug_assert!(
            tags.iter().all(|t| !t.trim().is_empty()),
            "TagVocabulary.of: every tag is not blank"
        );
        let result: TagVocabulary = TagVocabulary {
            by_key: tags.iter().map(|tag| (tag_key(tag), tag.clone())).collect(),
        };
        result
    }

    pub fn known(&self, tags: &[String]) -> Vec<String> {
        let result: Vec<String> = tags
            .iter()
            .filter_map(|tag| self.by_key.get(&tag_key(tag)))
            .fold(Vec::<String>::new(), |out, tag| {
                if out.iter().any(|kept| kept == tag) {
                    out
                } else {
                    [out, vec![tag.clone()]].concat()
                }
            });
        debug_assert!(
            result.iter().all(|t| self.by_key.values().any(|v| v == t)),
            "TagVocabulary.known: every result is a tag of the vocabulary"
        );
        debug_assert!(no_repeat(&result), "TagVocabulary.known: no tag twice");
        result
    }

    pub fn proposed(&self, tags: &[String]) -> Vec<String> {
        let result: Vec<String> = tags.iter().fold(Vec::<String>::new(), |out, tag| {
            let key = tag_key(tag);
            let taken = key.is_empty()
                || self.by_key.contains_key(&key)
                || out.iter().any(|proposed| tag_key(proposed) == key);
            if taken {
                out
            } else {
                [out, vec![tag.clone()]].concat()
            }
        });
        debug_assert!(
            result
                .iter()
                .all(|t| !self.by_key.contains_key(&tag_key(t))),
            "TagVocabulary.proposed: no result matches the vocabulary"
        );
        debug_assert!(no_repeat(&result), "TagVocabulary.proposed: no tag twice");
        debug_assert!(
            result.iter().all(|t| !t.trim().is_empty()),
            "TagVocabulary.proposed: no blank tag"
        );
        result
    }
}

pub fn vocabulary_of(rules: &[Rule], size: u32) -> Vec<String> {
    debug_assert!(size > 0, "vocabulary_of: size is positive");
    let all: Vec<&str> = sorted_by_key(
        rules
            .iter()
            .flat_map(|r| r.body.tags.iter().map(String::as_str))
            .collect(),
        |tag| *tag,
    );
    let counted: Vec<(&str, usize)> = all
        .chunk_by(|a, b| a == b)
        .map(|g| (g[0], g.len()))
        .collect();
    let result: Vec<String> = sorted_by(counted, |a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(b.0)))
        .into_iter()
        .take(size as usize)
        .map(|(tag, _)| tag.to_string())
        .collect();
    debug_assert!(
        result.len() <= size as usize,
        "vocabulary_of: at most size tags"
    );
    debug_assert!(no_repeat(&result), "vocabulary_of: no tag twice");
    result
}

fn no_repeat(items: &[String]) -> bool {
    items.iter().collect::<HashSet<_>>().len() == items.len()
}

fn unique_kept_quotes(checked: &[Checked]) -> bool {
    let quotes: Vec<String> = checked
        .iter()
        .filter(|c| c.is_kept())
        .map(|c| norm_text(&c.candidate.quote))
        .collect();
    no_repeat(&quotes)
}

fn is_cut_of(kept: &RuleCandidate, raw: &[String], vocabulary: &TagVocabulary) -> bool {
    let (known, offered) = (vocabulary.known(raw), vocabulary.proposed(raw));
    let tags = known.len().min(MAX_TAGS);
    let proposed = offered.len().min(MAX_TAGS - tags);
    kept.tags == known[..tags] && kept.proposed_tags == offered[..proposed]
}

fn only_new_drops(before: &[Option<Drop>], after: &[Checked]) -> bool {
    before.iter().zip(after).all(|(b, a)| {
        b.map_or(a.drop.is_none_or(|d| d == Drop::SameQuote), |d| {
            a.drop == Some(d)
        })
    })
}
