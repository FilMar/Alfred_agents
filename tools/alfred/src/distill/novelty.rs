use serde_json::Value;

use super::ask::Answer;
use super::config::Extractor;
use super::record::Verdict;
use super::rule::RuleCandidate;
use super::twin::Known;
use crate::chat::Chat;

pub const KNOWN_TEXT_CHARS: u32 = 400;
pub const TWIN_REASON: &str = "same idea as an item of this session";

#[derive(Debug, Clone, PartialEq)]
pub struct Ruling {
    verdict: Verdict,
    of: Option<String>,
    do_: Option<String>,
    reason: Option<String>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Judged {
    answer: Option<Answer>,
    rulings: Vec<Ruling>,
}

impl Ruling {
    pub fn twin(key: String) -> Ruling {
        debug_assert!(!key.trim().is_empty(), "Ruling.twin: the key is not blank");
        Ruling {
            verdict: Verdict::Duplicate,
            of: Some(key),
            do_: None,
            reason: Some(TWIN_REASON.to_string()),
        }
    }

    pub fn verdict(&self) -> Verdict {
        self.verdict
    }

    pub fn of(&self) -> Option<&str> {
        self.of.as_deref()
    }

    pub fn do_(&self) -> Option<&str> {
        self.do_.as_deref()
    }

    pub fn reason(&self) -> Option<&str> {
        self.reason.as_deref()
    }
}

impl Judged {
    pub async fn of(
        chat: &Chat,
        candidates: &[&RuleCandidate],
        known: &[Known],
        extractor: &Extractor,
    ) -> Judged {
        let result: Judged = if candidates.is_empty() {
            Judged {
                answer: None,
                rulings: Vec::new(),
            }
        } else {
            let prompt = novelty_prompt(candidates, known);
            let check = |json: &Value| verdicts_check(json, candidates.len(), known.len());
            let answer = super::ask::ask(chat, &extractor.config().novelty, &prompt, &check).await;
            let rulings = if answer.is_ok() {
                settle(answer.json(), candidates.len(), known)
            } else {
                Vec::new()
            };
            Judged {
                answer: Some(answer),
                rulings,
            }
        };
        debug_assert!(
            result.answer.is_none() == candidates.is_empty(),
            "Judged.of: no call only when there is no candidate"
        );
        debug_assert!(
            result.answer.as_ref().is_none_or(Answer::is_ok) || result.rulings.is_empty(),
            "Judged.of: a failed answer has no ruling"
        );
        debug_assert!(
            !result.answer.as_ref().is_some_and(Answer::is_ok)
                || result.rulings.len() == candidates.len(),
            "Judged.of: an ok answer has one ruling per candidate"
        );
        result
    }

    pub fn answer(&self) -> Option<&Answer> {
        self.answer.as_ref()
    }

    pub fn rulings(&self) -> &[Ruling] {
        &self.rulings
    }
}

pub fn saved_text(candidate: &RuleCandidate) -> String {
    let result: String = format!("SE {} ALLORA {}", candidate.if_, candidate.do_);
    debug_assert!(
        !result.trim().is_empty(),
        "saved_text: the text is not blank"
    );
    result
}

pub fn novelty_prompt(candidates: &[&RuleCandidate], known: &[Known]) -> String {
    debug_assert!(
        !candidates.is_empty(),
        "novelty_prompt: at least one candidate"
    );
    [
        vec![
            super::extract::quality_bar(),
            String::new(),
            "## Candidates".to_string(),
        ],
        candidates
            .iter()
            .enumerate()
            .map(|(k, c)| format!("C{k} (rule): {}", saved_text(c)))
            .collect::<Vec<String>>(),
        vec![String::new(), "## Neighbours".to_string()],
        known
            .iter()
            .enumerate()
            .map(|(k, n)| {
                format!(
                    "N{k} (rule): {}",
                    n.text()
                        .chars()
                        .take(KNOWN_TEXT_CHARS as usize)
                        .collect::<String>()
                )
            })
            .collect::<Vec<String>>(),
    ]
    .concat()
    .join("\n")
        + "\n\nUse the integer after C as `cand` and the integer after N as `of`."
}

pub fn verdicts_check(json: &Value, candidates: usize, known: usize) -> Option<String> {
    debug_assert!(candidates > 0, "verdicts_check: at least one candidate");
    match json["verdicts"].as_array() {
        None => Some("need list `verdicts`".to_string()),
        Some(list) if !covers_every_cand(list, candidates) => Some(format!(
            "need exactly one verdict per cand 0..{}",
            candidates - 1
        )),
        Some(list) => by_cand(list, candidates)
            .iter()
            .enumerate()
            .find_map(|(k, v)| verdict_fault(k, v, known)),
    }
}

pub fn settle(json: &Value, candidates: usize, known: &[Known]) -> Vec<Ruling> {
    debug_assert!(
        verdicts_check(json, candidates, known.len()).is_none(),
        "settle: the json passes the check"
    );
    let list = json["verdicts"]
        .as_array()
        .expect("settle: the json holds the `verdicts` list");
    let result: Vec<Ruling> = by_cand(list, candidates)
        .into_iter()
        .map(|v| ruling_of(v, known))
        .collect();
    debug_assert!(
        result.len() == candidates,
        "settle: one ruling per candidate, in order"
    );
    debug_assert!(
        ofs_are_known(&result, known),
        "settle: a new ruling has no of, any other has the key of a known item"
    );
    debug_assert!(
        appends_have_do(&result),
        "settle: an append carries a do; without one it is a duplicate"
    );
    result
}

fn covers_every_cand(list: &[Value], candidates: usize) -> bool {
    let cands: std::collections::HashSet<u64> =
        list.iter().filter_map(|v| v["cand"].as_u64()).collect();
    list.len() == candidates
        && cands.len() == candidates
        && cands.iter().all(|&c| c < candidates as u64)
}

fn by_cand(list: &[Value], candidates: usize) -> Vec<&Value> {
    (0..candidates as u64)
        .map(|k| {
            list.iter()
                .find(|v| v["cand"].as_u64() == Some(k))
                .expect("by_cand: every cand has a verdict")
        })
        .collect()
}

fn verdict_fault(k: usize, v: &Value, known: usize) -> Option<String> {
    let verdict = v["verdict"].as_str();
    let bad_of = verdict != Some("new") && v["of"].as_u64().is_none_or(|of| of >= known as u64);
    if !matches!(verdict, Some("new" | "duplicate" | "append")) {
        Some(format!(
            "cand {k}: verdict must be one of append, duplicate, new"
        ))
    } else if bad_of {
        Some(format!(
            "cand {k}: `of` must be a neighbour id 0..{}",
            known.saturating_sub(1)
        ))
    } else {
        None
    }
}

fn ruling_of(v: &Value, known: &[Known]) -> Ruling {
    let text = |key: &str| {
        v[key]
            .as_str()
            .map(str::trim)
            .filter(|t| !t.is_empty())
            .map(str::to_string)
    };
    let (verdict, do_) = match (v["verdict"].as_str(), text("do")) {
        (Some("new"), _) => (Verdict::New, None),
        (Some("append"), Some(d)) => (Verdict::Append, Some(d)),
        _ => (Verdict::Duplicate, None),
    };
    let of = (verdict != Verdict::New).then(|| {
        let at = v["of"]
            .as_u64()
            .expect("ruling_of: a ruling that is not new has an of");
        known[usize::try_from(at).expect("ruling_of: of fits a usize")]
            .key()
            .to_string()
    });
    Ruling {
        verdict,
        of,
        do_,
        reason: text("reason"),
    }
}

fn ofs_are_known(rulings: &[Ruling], known: &[Known]) -> bool {
    rulings.iter().all(|r| match r.verdict() {
        Verdict::New => r.of().is_none(),
        _ => r
            .of()
            .is_some_and(|key| known.iter().any(|n| n.key() == key)),
    })
}

fn appends_have_do(rulings: &[Ruling]) -> bool {
    rulings
        .iter()
        .all(|r| r.verdict() != Verdict::Append || r.do_().is_some())
}
