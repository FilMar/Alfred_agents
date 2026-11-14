use super::novelty::{Ruling, saved_text};
use super::rule::RuleCandidate;
use crate::embed::Embedder;
use crate::upstream::Upstream;

pub const SAME_SESSION_CUTOFF: f32 = 0.75;
pub const SESSION_KEY: &str = "session:";

#[derive(Debug, Clone, PartialEq)]
pub struct Known {
    key: String,
    text: String,
    vector: Option<Vec<f32>>,
}

#[derive(Debug, Clone, PartialEq, Default)]
pub struct SessionList {
    items: Vec<Known>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Twin {
    pub key: String,
    pub score: f32,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Twins {
    vectors: Vec<Option<Vec<f32>>>,
    rulings: Vec<Option<Ruling>>,
}

impl Known {
    pub fn neighbour(key: String, text: String) -> Known {
        debug_assert!(
            !key.trim().is_empty(),
            "Known.neighbour: the key is not blank"
        );
        debug_assert!(
            !text.trim().is_empty(),
            "Known.neighbour: the text is not blank"
        );
        Known {
            key,
            text,
            vector: None,
        }
    }

    pub fn key(&self) -> &str {
        &self.key
    }

    pub fn text(&self) -> &str {
        &self.text
    }

    pub fn vector(&self) -> Option<&[f32]> {
        self.vector.as_deref()
    }

    pub fn is_session(&self) -> bool {
        self.key.starts_with(SESSION_KEY)
    }
}

impl SessionList {
    pub fn empty() -> SessionList {
        SessionList::default()
    }

    pub fn items(&self) -> &[Known] {
        &self.items
    }

    #[allow(clippy::needless_pass_by_value)]
    pub fn with(self, text: String, id: Option<String>, vector: Option<Vec<f32>>) -> SessionList {
        debug_assert!(
            !text.trim().is_empty(),
            "SessionList.with: the text is not blank"
        );
        debug_assert!(
            id.as_deref().is_none_or(|i| !i.trim().is_empty()),
            "SessionList.with: the id is none or not blank"
        );
        let before = self.items.len();
        let result: SessionList = {
            let key = id
                .clone()
                .unwrap_or_else(|| format!("{SESSION_KEY}{before}"));
            SessionList {
                items: self
                    .items
                    .into_iter()
                    .chain([Known { key, text, vector }])
                    .collect(),
            }
        };
        debug_assert!(
            result.items.len() == before + 1,
            "SessionList.with: one item more"
        );
        debug_assert!(
            ends_with_key(&result, id.as_deref(), before),
            "SessionList.with: the key is the saved id, or session:<n> without one"
        );
        result
    }
}

impl Twins {
    pub async fn of(
        embedder: &Embedder,
        candidates: &[&RuleCandidate],
        list: &SessionList,
        cutoff: Option<f32>,
    ) -> Result<Twins, Upstream> {
        debug_assert!(
            cutoff.is_none_or(is_cutoff),
            "Twins.of: the cutoff is above 0 and at most 1"
        );
        let result: Result<Twins, Upstream> = async {
            match cutoff {
                None => Ok(Twins {
                    vectors: vec![None; candidates.len()],
                    rulings: vec![None; candidates.len()],
                }),
                Some(cutoff) => {
                    let mut found: Vec<(Option<Vec<f32>>, Option<Ruling>)> =
                        Vec::with_capacity(candidates.len());
                    for candidate in candidates {
                        let vector = embedder.document(&twin_text(candidate)).await?;
                        let ruling = twin_of(&vector, list.items(), cutoff)
                            .map(|twin| Ruling::twin(twin.key));
                        found.push((Some(vector), ruling));
                    }
                    let (vectors, rulings) = found.into_iter().unzip();
                    Ok(Twins { vectors, rulings })
                }
            }
        }
        .await;
        debug_assert!(
            result
                .as_ref()
                .map_or(true, |t| t.rulings.len() == candidates.len()),
            "Twins.of: one place per candidate"
        );
        debug_assert!(
            result
                .as_ref()
                .map_or(true, |t| cutoff.is_some() || t.is_empty()),
            "Twins.of: with no cutoff no vector and no twin"
        );
        debug_assert!(
            result
                .as_ref()
                .map_or(true, |t| twins_are_of_the_list(t, list)),
            "Twins.of: every twin is a duplicate of a list item"
        );
        result
    }

    pub fn vector(&self, at: usize) -> Option<&[f32]> {
        self.vectors[at].as_deref()
    }

    pub fn ruling(&self, at: usize) -> Option<&Ruling> {
        self.rulings[at].as_ref()
    }

    fn is_empty(&self) -> bool {
        self.vectors.iter().all(Option::is_none) && self.rulings.iter().all(Option::is_none)
    }
}

pub fn twin_of(vector: &[f32], items: &[Known], cutoff: f32) -> Option<Twin> {
    debug_assert!(
        is_cutoff(cutoff),
        "twin_of: the cutoff is above 0 and at most 1"
    );
    debug_assert!(
        items
            .iter()
            .all(|k| k.vector().is_some_and(|v| v.len() == vector.len())),
        "twin_of: every item has a vector as long as the vector"
    );
    let result: Option<Twin> = items
        .iter()
        .filter_map(|known| {
            known
                .vector()
                .map(|v| (known, crate::rules::near::cosine(vector, v)))
        })
        .filter(|(_, score)| *score >= cutoff)
        .reduce(|best, item| if item.1 > best.1 { item } else { best })
        .map(|(known, score)| Twin {
            key: known.key.clone(),
            score,
        });
    debug_assert!(
        twin_is_nearest(result.as_ref(), vector, items, cutoff),
        "twin_of: the twin is the first nearest item, and without one no item reaches the cutoff"
    );
    result
}

pub fn twin_text(candidate: &RuleCandidate) -> String {
    saved_text(candidate)
}

pub fn is_cutoff(value: f32) -> bool {
    value.is_finite() && value > 0.0 && value <= 1.0
}

fn ends_with_key(list: &SessionList, id: Option<&str>, before: usize) -> bool {
    list.items.get(before).is_some_and(|known| match id {
        Some(id) => known.key == id,
        None => known.key == format!("{SESSION_KEY}{before}"),
    })
}

fn twins_are_of_the_list(twins: &Twins, list: &SessionList) -> bool {
    twins.rulings.iter().flatten().all(|ruling| {
        ruling.verdict() == crate::distill::record::Verdict::Duplicate
            && ruling
                .of()
                .is_some_and(|of| list.items.iter().any(|known| known.key == of))
    })
}

fn twin_is_nearest(twin: Option<&Twin>, vector: &[f32], items: &[Known], cutoff: f32) -> bool {
    let expected: Option<(usize, f32)> = items
        .iter()
        .enumerate()
        .filter_map(|(at, known)| {
            known
                .vector()
                .map(|v| (at, crate::rules::near::cosine(vector, v)))
        })
        .filter(|(_, score)| *score >= cutoff)
        .min_by(|a, b| b.1.total_cmp(&a.1));
    match (twin, expected) {
        (None, None) => true,
        #[allow(clippy::float_cmp)]
        (Some(twin), Some((at, score))) => twin.key == items[at].key && twin.score == score,
        _ => false,
    }
}
