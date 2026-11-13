use crate::distill::rule::RULE_QUOTE_MIN;
use crate::distill::text::{is_italian, norm_text, quote_in, tag_key};

#[test]
fn tag_key_lowercases_and_strips_the_accents() {
    assert_eq!(tag_key("Summary"), "summary");
    assert_eq!(tag_key("CITTÀ"), "citta");
    assert_eq!(tag_key("àèéìòù"), "aeeiou");
}

#[test]
fn tag_key_hyphenates_the_spaces_and_the_underscores() {
    assert_eq!(tag_key("Project Terms"), "project-terms");
    assert_eq!(tag_key("project_terms"), "project-terms");
}

#[test]
fn tag_key_collapses_and_trims_the_hyphens() {
    assert_eq!(tag_key("  spaced   out  "), "spaced-out");
    assert_eq!(tag_key("a - b"), "a-b");
}

#[test]
fn tag_key_keeps_a_blank_tag_blank() {
    assert_eq!(tag_key(""), "");
}

#[test]
fn norm_text_lowercases_the_text() {
    assert_eq!(norm_text("MiXeD CaSe"), "mixed case");
    assert_eq!(norm_text(""), "");
}

#[test]
fn norm_text_turns_the_signs_into_spaces() {
    assert_eq!(
        norm_text("a\"b'c`d«e»f“g”h.i,j;k:l!m?n(o)p[q]r"),
        "a b c d e f g h i j k l m n o p q r"
    );
}

#[test]
fn norm_text_compresses_and_trims_the_spaces() {
    assert_eq!(norm_text("Hello, World!"), "hello world");
    assert_eq!(norm_text("  Don't  «panic»  "), "don t panic");
}

#[test]
fn norm_text_keeps_the_characters_that_are_not_signs() {
    assert_eq!(
        norm_text("under_scored-and.dotted"),
        "under_scored-and dotted"
    );
}

#[test]
#[should_panic(expected = "quote_in: min is positive")]
fn quote_in_rejects_a_zero_min() {
    quote_in("x", "x", 0);
}

#[test]
fn quote_in_finds_a_quote_of_the_minimum_length() {
    let quote = "b".repeat(RULE_QUOTE_MIN);
    let text = format!("she said {quote} twice");
    assert!(quote_in(&quote, &text, RULE_QUOTE_MIN));
    assert!(quote_in("x", "hex", 1));
}

#[test]
fn quote_in_rejects_a_quote_shorter_than_the_min() {
    let quote = "b".repeat(RULE_QUOTE_MIN - 1);
    let text = format!("she said {quote} and more");
    assert!(!quote_in(&quote, &text, RULE_QUOTE_MIN));
    assert!(!quote_in("the user asked", "the user asked for it", 15));
}

#[test]
fn quote_in_finds_a_quote_inside_the_text() {
    assert!(quote_in(
        "the user asked for a summary",
        "she said: the user asked for a summary, twice",
        RULE_QUOTE_MIN
    ));
    assert!(quote_in(
        "Hello, World!",
        "he said hello world twice",
        RULE_QUOTE_MIN
    ));
    assert!(quote_in("the user asked", "the user asked for it", 14));
}

#[test]
fn quote_in_rejects_a_quote_outside_the_text() {
    assert!(!quote_in(
        "the user asked for a summary",
        "the project went well overall",
        RULE_QUOTE_MIN
    ));
    assert!(!quote_in("", "the user asked for it", RULE_QUOTE_MIN));
}

#[test]
fn is_italian_recognizes_the_italian_text() {
    assert!(is_italian(
        "di che il non una sono questo quando anche della gli"
    ));
}

#[test]
fn is_italian_rejects_the_english_text() {
    assert!(!is_italian("the user asks for a summary and provides it"));
}

#[test]
fn is_italian_rejects_the_uppercase_english_text() {
    assert!(!is_italian("THE USER ASKS FOR A SUMMARY"));
}

#[test]
fn is_italian_wins_a_tie() {
    assert!(is_italian(""));
    assert!(is_italian("il the"));
    assert!(!is_italian("il the and"));
}
