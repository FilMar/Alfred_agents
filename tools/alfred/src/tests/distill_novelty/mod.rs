mod check;

use crate::distill::novelty::{KNOWN_TEXT_CHARS, Ruling, TWIN_REASON, novelty_prompt, saved_text};
use crate::tests::distill_fake::candidate;

pub(super) fn known(key: &str, text: &str) -> crate::distill::twin::Known {
    crate::distill::twin::Known::neighbour(key.to_string(), text.to_string())
}

#[test]
fn novelty_constants_hold_the_spec_values() {
    assert_eq!(KNOWN_TEXT_CHARS, 400);
    assert_eq!(TWIN_REASON, "same idea as an item of this session");
}

#[test]
#[should_panic(expected = "Ruling.twin: the key is not blank")]
fn twin_rejects_a_blank_key() {
    Ruling::twin("   ".to_string());
}

#[test]
fn twin_is_a_duplicate_of_the_key() {
    let ruling = Ruling::twin("session:2".to_string());
    assert_eq!(ruling.verdict(), crate::distill::record::Verdict::Duplicate);
    assert_eq!(ruling.of(), Some("session:2"));
    assert_eq!(ruling.do_(), None);
    assert_eq!(ruling.reason(), Some(TWIN_REASON));
}

#[test]
fn saved_text_reads_se_if_allora_do() {
    assert_eq!(saved_text(&candidate("a", "b")), "SE a ALLORA b");
    assert_eq!(
        saved_text(&candidate("when it rains", "close the window")),
        "SE when it rains ALLORA close the window"
    );
}

#[test]
#[should_panic(expected = "novelty_prompt: at least one candidate")]
fn novelty_prompt_rejects_no_candidate() {
    novelty_prompt(&[], &[]);
}

#[test]
fn novelty_prompt_numbers_candidates_and_neighbours_in_order() {
    let candidates = [candidate("if one", "do one"), candidate("if two", "do two")];
    let refs = [&candidates[0], &candidates[1]];
    let prompt = novelty_prompt(&refs, &[known("r1", "text one"), known("r2", "text two")]);
    assert!(prompt.ends_with(
        "\n\n## Candidates\nC0 (rule): SE if one ALLORA do one\nC1 (rule): SE if two ALLORA do two\n\n## Neighbours\nN0 (rule): text one\nN1 (rule): text two\n\nUse the integer after C as `cand` and the integer after N as `of`."
    ));
}

#[test]
fn novelty_prompt_keeps_the_neighbours_header_without_neighbours() {
    let candidates = [candidate("a", "b")];
    let refs = [&candidates[0]];
    let prompt = novelty_prompt(&refs, &[]);
    assert!(prompt.ends_with(
        "\n\n## Candidates\nC0 (rule): SE a ALLORA b\n\n## Neighbours\n\nUse the integer after C as `cand` and the integer after N as `of`."
    ));
}

#[test]
fn novelty_prompt_cuts_the_neighbour_text_at_a_char_boundary() {
    let n = KNOWN_TEXT_CHARS as usize;
    let candidates = [candidate("a", "b")];
    let refs = [&candidates[0]];
    let text = format!("{}ààà", "x".repeat(n - 1));
    let prompt = novelty_prompt(&refs, &[known("r1", &text)]);
    assert!(prompt.ends_with(&format!(
        "\n\n## Candidates\nC0 (rule): SE a ALLORA b\n\n## Neighbours\nN0 (rule): {}à\n\nUse the integer after C as `cand` and the integer after N as `of`.",
        "x".repeat(n - 1)
    )));
}
