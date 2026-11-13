use super::{DO, IF, QUOTE, USER, candidate, evidence, strings};
use crate::distill::rule::{Checked, Drop, RULE_QUOTE_MIN, TagVocabulary, vocabulary_of};
use crate::rules::{Rule, RuleBody};

fn vocabulary() -> TagVocabulary {
    TagVocabulary::of(&strings(&["sessione", "riassunto", "git", "test"]))
}

type Case<'a> = (
    &'a str,
    &'a str,
    &'a [&'a str],
    &'a str,
    &'a str,
    Option<Drop>,
);

fn drop_of(if_: &str, do_: &str, tags: &[&str], quote: &str, user: &str) -> Option<Drop> {
    let vocabulary = vocabulary();
    candidate(if_, do_, tags, quote)
        .check(&evidence(user, &vocabulary))
        .drop()
}

#[test]
fn check_drops_at_the_first_check_that_fails() {
    let short = "b".repeat(RULE_QUOTE_MIN - 1);
    let edge = "b".repeat(RULE_QUOTE_MIN);
    let user_short = format!("lei ha detto {short} due volte");
    let user_edge = format!("lei ha detto {edge} due volte");
    let english = "when the user asks for it, write the summary and the plan";
    let cases: [Case; 9] = [
        (IF, DO, &["sessione"], QUOTE, USER, None),
        ("  ", DO, &[], "x", USER, Some(Drop::Empty)),
        (IF, " ", &["sessione"], QUOTE, USER, Some(Drop::Empty)),
        (IF, DO, &["nuovo"], "x", USER, Some(Drop::Tags)),
        (
            IF,
            DO,
            &["sessione"],
            "frase che l'utente non ha mai scritto",
            USER,
            Some(Drop::RuleQuote),
        ),
        (
            IF,
            DO,
            &["sessione"],
            &short,
            &user_short,
            Some(Drop::RuleQuote),
        ),
        (IF, DO, &["sessione"], &edge, &user_edge, None),
        (
            english,
            english,
            &["sessione"],
            QUOTE,
            USER,
            Some(Drop::Italian),
        ),
        (
            IF,
            DO,
            &["Sessione"],
            "Fammi un RIASSUNTO, della sessione!",
            USER,
            None,
        ),
    ];
    for (if_, do_, tags, quote, user, want) in cases {
        assert_eq!(
            drop_of(if_, do_, tags, quote, user),
            want,
            "if: {if_}, quote: {quote}"
        );
    }
}

#[test]
fn check_cuts_the_tags_known_first() {
    let vocabulary = vocabulary();
    let cases: [(&[&str], &[&str], &[&str]); 4] = [
        (
            &["Sessione", "nuovo", "GIT"],
            &["sessione", "git"],
            &["nuovo"],
        ),
        (
            &["sessione", "riassunto", "git", "test", "nuovo"],
            &["sessione", "riassunto", "git"],
            &[],
        ),
        (
            &["sessione", "uno", "due", "tre"],
            &["sessione"],
            &["uno", "due"],
        ),
        (
            &["sessione", "uno", "Uno", "sessione"],
            &["sessione"],
            &["uno"],
        ),
    ];
    for (tags, known, proposed) in cases {
        let checked = candidate(IF, DO, tags, QUOTE).check(&evidence(USER, &vocabulary));
        assert_eq!(checked.candidate().tags, strings(known), "tags: {tags:?}");
        assert_eq!(
            checked.candidate().proposed_tags,
            strings(proposed),
            "tags: {tags:?}"
        );
    }
}

#[test]
fn dedupe_drops_a_kept_rule_that_repeats_a_kept_quote() {
    let vocabulary = vocabulary();
    let proof = evidence(USER, &vocabulary);
    let rules = vec![
        candidate("  ", DO, &["sessione"], QUOTE).check(&proof),
        candidate(IF, DO, &["sessione"], QUOTE).check(&proof),
        candidate(
            IF,
            "fai un elenco delle decisioni della sessione",
            &["git"],
            "Fammi un riassunto, della sessione",
        )
        .check(&proof),
        candidate(IF, DO, &["git"], "per favore fammi un riassunto").check(&proof),
    ];
    let drops: Vec<Option<Drop>> = Checked::dedupe(rules).iter().map(Checked::drop).collect();
    assert_eq!(
        drops,
        [Some(Drop::Empty), None, Some(Drop::SameQuote), None]
    );
}

#[test]
#[should_panic(expected = "TagVocabulary.of: every tag is not blank")]
fn tag_vocabulary_of_rejects_a_blank_tag() {
    TagVocabulary::of(&strings(&["sessione", "  "]));
}

#[test]
fn known_and_proposed_split_the_tags() {
    let vocabulary = vocabulary();
    let tags = strings(&[
        "SESSIONE",
        "sessione",
        "Git",
        "nuovo tag",
        "nuovo_tag",
        " ",
        "altro",
    ]);
    assert_eq!(vocabulary.known(&tags), strings(&["sessione", "git"]));
    assert_eq!(vocabulary.proposed(&tags), strings(&["nuovo tag", "altro"]));
}

#[test]
#[should_panic(expected = "vocabulary_of: size is positive")]
fn vocabulary_of_rejects_a_zero_size() {
    vocabulary_of(&[], 0);
}

#[test]
fn vocabulary_of_counts_the_tags_of_the_rules() {
    let rule = |tags: &[&str]| Rule {
        id: "00000000-0000-0000-0000-000000000000".to_string(),
        body: RuleBody {
            tags: strings(tags),
            ..RuleBody::default()
        },
    };
    let rules = [
        rule(&["git", "test"]),
        rule(&["test"]),
        rule(&["sessione", "test"]),
        rule(&[]),
    ];
    assert_eq!(vocabulary_of(&rules, 2), strings(&["test", "git"]));
    assert_eq!(
        vocabulary_of(&rules, 10),
        strings(&["test", "git", "sessione"])
    );
    assert_eq!(vocabulary_of(&[], 3), Vec::<String>::new());
}
