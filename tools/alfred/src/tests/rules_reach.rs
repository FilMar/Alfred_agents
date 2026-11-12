use crate::rules::reach::{MAX_PROMPTS, ReachReply, ReachRule, SEARCHES_IN_FLIGHT, reach_of};

fn mk_rules(pairs: &[(&str, &str)]) -> Vec<(String, String)> {
    pairs
        .iter()
        .map(|(id, text)| ((*id).to_string(), (*text).to_string()))
        .collect()
}

fn mk_found(prompts: &[&[&str]]) -> Vec<Vec<String>> {
    prompts
        .iter()
        .map(|ids| ids.iter().map(|id| (*id).to_string()).collect())
        .collect()
}

fn mk_rule(id: &str, text: &str, reached: u32) -> ReachRule {
    ReachRule {
        id: id.to_string(),
        if_: text.to_string(),
        reached,
    }
}

fn mk_reply(prompts: u32, rules: Vec<ReachRule>, unreached: Vec<ReachRule>) -> ReachReply {
    ReachReply {
        prompts,
        rules,
        unreached,
    }
}

#[test]
fn reach_of_outcome_table() {
    let cases = vec![
        (mk_rules(&[]), mk_found(&[]), mk_reply(0, vec![], vec![])),
        (
            mk_rules(&[("x", "ex"), ("y", "why")]),
            mk_found(&[]),
            mk_reply(
                0,
                vec![mk_rule("x", "ex", 0), mk_rule("y", "why", 0)],
                vec![mk_rule("x", "ex", 0), mk_rule("y", "why", 0)],
            ),
        ),
        (
            mk_rules(&[("m", "em")]),
            mk_found(&[&[], &[], &[]]),
            mk_reply(3, vec![mk_rule("m", "em", 0)], vec![mk_rule("m", "em", 0)]),
        ),
        (
            mk_rules(&[]),
            mk_found(&[&["x"], &[]]),
            mk_reply(2, vec![], vec![]),
        ),
        (
            mk_rules(&[("r2", "second"), ("r1", "first"), ("r3", "third")]),
            mk_found(&[&["r1", "r2"], &["r1"], &["r3"], &[]]),
            mk_reply(
                4,
                vec![
                    mk_rule("r2", "second", 1),
                    mk_rule("r3", "third", 1),
                    mk_rule("r1", "first", 2),
                ],
                vec![],
            ),
        ),
        (
            mk_rules(&[("a", "alpha"), ("b", "beta")]),
            mk_found(&[&["a"], &["a"]]),
            mk_reply(
                2,
                vec![mk_rule("b", "beta", 0), mk_rule("a", "alpha", 2)],
                vec![mk_rule("b", "beta", 0)],
            ),
        ),
        (
            mk_rules(&[("k", "kay")]),
            mk_found(&[&["zzz"], &["k", "zzz"]]),
            mk_reply(2, vec![mk_rule("k", "kay", 1)], vec![]),
        ),
        (
            mk_rules(&[("d", "dee")]),
            mk_found(&[&["d"], &["d", "d"]]),
            mk_reply(2, vec![mk_rule("d", "dee", 3)], vec![]),
        ),
        (
            mk_rules(&[("a", "ay"), ("ab", "bee")]),
            mk_found(&[&["ab"], &["a"]]),
            mk_reply(
                2,
                vec![mk_rule("a", "ay", 1), mk_rule("ab", "bee", 1)],
                vec![],
            ),
        ),
    ];
    for (i, (rules, found, want)) in cases.into_iter().enumerate() {
        assert_eq!(reach_of(&rules, &found), want, "case {i}");
    }
}

#[test]
fn reach_of_every_rule_once() {
    let rules = mk_rules(&[("one", "first"), ("two", "second")]);
    let found = mk_found(&[&["one", "two"], &["two", "one"], &["one", "two"]]);
    reach_of(&rules, &found);
}

#[test]
fn reach_of_prompts_is_the_number_of_searches() {
    let rules = mk_rules(&[("p", "pi")]);
    let found = mk_found(&[&["p"], &[], &["p"], &[]]);
    reach_of(&rules, &found);
}

#[test]
fn reach_of_unreached_rules_have_zero() {
    let rules = mk_rules(&[("hit", "hard"), ("miss", "soft"), ("gone", "void")]);
    let found = mk_found(&[&["hit"], &["hit"]]);
    reach_of(&rules, &found);
}

#[test]
fn reach_of_sorted_by_reached_then_id() {
    let rules = mk_rules(&[("cc", "see"), ("aa", "ay"), ("bb", "bee")]);
    let found = mk_found(&[&["aa", "bb"], &["aa", "cc"]]);
    reach_of(&rules, &found);
}

#[test]
fn reach_limits_match_spec() {
    assert_eq!(MAX_PROMPTS, 10_000);
    assert_eq!(SEARCHES_IN_FLIGHT, 8);
}
