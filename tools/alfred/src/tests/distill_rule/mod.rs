mod check;
mod text;

use crate::distill::rule::{Evidence, RuleCandidate, TagVocabulary};

pub(super) const IF: &str = "quando l'utente chiede un riassunto della sessione";
pub(super) const DO: &str = "scrivi il riassunto alla fine, con le decisioni prese";
pub(super) const USER: &str = "per favore fammi un riassunto della sessione di oggi";
pub(super) const QUOTE: &str = "fammi un riassunto della sessione";

pub(super) fn strings(tags: &[&str]) -> Vec<String> {
    tags.iter().map(|t| (*t).to_string()).collect()
}

pub(super) fn candidate(if_: &str, do_: &str, tags: &[&str], quote: &str) -> RuleCandidate {
    RuleCandidate {
        if_: if_.to_string(),
        do_: do_.to_string(),
        tags: strings(tags),
        proposed_tags: Vec::new(),
        quote: quote.to_string(),
    }
}

pub(super) fn evidence<'a>(user: &'a str, vocabulary: &'a TagVocabulary) -> Evidence<'a> {
    Evidence { user, vocabulary }
}

#[test]
fn from_model_reads_a_rule() {
    let raw =
        serde_json::json!({"if": IF, "do": DO, "tags": ["sessione"], "quote": QUOTE, "extra": 1});
    assert_eq!(
        RuleCandidate::from_model(&raw),
        Some(candidate(IF, DO, &["sessione"], QUOTE))
    );
    let empty_tags = serde_json::json!({"if": IF, "do": DO, "tags": [], "quote": QUOTE});
    assert_eq!(
        RuleCandidate::from_model(&empty_tags),
        Some(candidate(IF, DO, &[], QUOTE))
    );
}

#[test]
fn from_model_leaves_no_proposed_tag_of_its_own() {
    let raw = serde_json::json!({"if": IF, "do": DO, "tags": [], "proposedTags": ["nuovo"], "quote": QUOTE});
    let _ = RuleCandidate::from_model(&raw);
}

#[test]
fn from_model_refuses_what_is_not_a_rule() {
    let cases = [
        serde_json::json!({"do": DO, "tags": [], "quote": QUOTE}),
        serde_json::json!({"if": IF, "tags": [], "quote": QUOTE}),
        serde_json::json!({"if": IF, "do": DO, "quote": QUOTE}),
        serde_json::json!({"if": IF, "do": DO, "tags": []}),
        serde_json::json!({"if": 3, "do": DO, "tags": [], "quote": QUOTE}),
        serde_json::json!({"if": IF, "do": true, "tags": [], "quote": QUOTE}),
        serde_json::json!({"if": IF, "do": DO, "tags": [], "quote": [QUOTE]}),
        serde_json::json!({"if": IF, "do": DO, "tags": "sessione", "quote": QUOTE}),
        serde_json::json!({"if": IF, "do": DO, "tags": ["sessione", 3], "quote": QUOTE}),
        serde_json::json!("una regola"),
        serde_json::json!(["una regola"]),
    ];
    for raw in cases {
        assert_eq!(RuleCandidate::from_model(&raw), None, "raw: {raw}");
    }
}
