use serde_json::{Value, json};

use crate::chat::{Chat, Think};
use crate::distill::config::{Config, CriticCheck, DropWhen, Extractor, Role};
use crate::distill::episodes::{Episode, SessionMap};
use crate::distill::extract::{
    Extraction, QUALITY_BAR_HEAD, RULE_GUIDE, Target, candidates_check, check_candidates,
    extraction_prompt, quality_bar,
};
use crate::distill::rule::Drop;
use crate::distill::session::{SessionRead, Turn};
use crate::hist::{Contents, Exchange};
use crate::tests::distill_ask::fake::{fake, said};

fn turn(id: &str, timestamp: &str, input: &str, output: &str) -> Turn {
    Turn::of(
        Exchange {
            id: id.to_string(),
            session: String::from("s1"),
            parent: None,
            timestamp: timestamp.to_string(),
            kind: String::from("task"),
            actor: String::from("user"),
            model: None,
            tokens_in: None,
            tokens_out: None,
            tokens_cache_read: None,
            tokens_cache_write: None,
            distilled: None,
            meta: None,
        },
        Contents {
            exchange_id: id.to_string(),
            input: input.to_string(),
            output: output.to_string(),
            tools: None,
        },
    )
}

fn turns() -> Vec<Turn> {
    vec![
        turn(
            "e0",
            "2026-01-01T00:00:00",
            "salva questo link su kara",
            "salvato",
        ),
        turn(
            "e1",
            "2026-01-01T00:01:00",
            "anzi salvalo su karakeep",
            "salvato di nuovo",
        ),
    ]
}

fn session() -> SessionMap {
    let read = SessionRead::of(String::from("s1"), turns(), Vec::new());
    let episodes = json!({"episodes": [{"from": 0, "to": 1, "summary": "the user saves a link"}]});
    SessionMap::from_json(&episodes, &read)
}

fn target(map: &SessionMap, index: u32) -> Target<'_> {
    Target::of(map, &map.episodes()[0], index)
}

fn extractor() -> Extractor {
    let role = |model: &str| Role {
        model: model.to_string(),
        think: Think::Off,
        temperature: 0.0,
        system: String::from("you extract rules"),
    };
    let config = Config {
        episodes: role("episodes"),
        extract: role("extract"),
        critic: role("critic"),
        novelty: role("novelty"),
        checks: vec![CriticCheck {
            name: String::from("clear"),
            text: String::from("is the rule clear?"),
            drop_when: DropWhen::Under,
            threshold: 0.5,
        }],
        episode_chars: 4000,
        target_input_chars: 2000,
        target_output_chars: 2000,
        listing_chars: 400,
        vocabulary_size: 12,
        top_k: 4,
    };
    let row = crate::hist::Extractor {
        id: 1,
        parent: None,
        why: String::from("fixture"),
        active: true,
        config: serde_json::to_string(&config).unwrap(),
        created: String::from("2026-01-01T00:00:00"),
    };
    Extractor::from_row(&row, None).unwrap()
}

fn dead_chat() -> Chat {
    Chat::new(String::from("http://127.0.0.1:1"), reqwest::Client::new())
}

fn rule() -> Value {
    json!({"if": "i", "do": "d", "tags": ["t"], "quote": "q"})
}

fn not_a_rule(index: usize) -> String {
    format!(
        "rules[{index}] is not a rule: it needs if, do and quote as strings, and tags as a list of strings"
    )
}

#[test]
#[should_panic(expected = "Target.of: the episode is in the map")]
fn of_rejects_an_episode_outside_the_map() {
    let map = session();
    let outside = Episode::of(0, 1, String::from("outside the map"), turns());
    Target::of(&map, &outside, 0);
}

#[test]
#[should_panic(expected = "Target.of: the index is a turn of the episode")]
fn of_rejects_an_index_past_the_turns() {
    let map = session();
    Target::of(&map, &map.episodes()[0], 2);
}

#[test]
fn of_holds_the_last_turn() {
    let map = session();
    let episode = &map.episodes()[0];
    let target = Target::of(&map, episode, 1);
    assert!(std::ptr::eq(target.map(), &raw const map));
    assert!(std::ptr::eq(target.episode(), episode));
    assert!(std::ptr::eq(target.turn(), &raw const episode.turns()[1]));
}

#[test]
#[should_panic(expected = "Target.episode_text: episode_chars is positive")]
fn episode_text_rejects_zero_chars() {
    let map = session();
    target(&map, 1).episode_text(0);
}

#[test]
fn episode_text_and_text_are_the_td_template() {
    let map = session();
    assert_eq!(
        target(&map, 1).episode_text(400),
        "[0] USER: salva questo link su kara\nAGENT: salvato\n\n[1] <<< TARGET USER: anzi salvalo su karakeep\nAGENT: salvato di nuovo"
    );
    assert_eq!(
        target(&map, 0).episode_text(3),
        "[0] <<< TARGET USER: sal\nAGENT: sal\n\n[1] USER: anz\nAGENT: sal"
    );
    assert_eq!(target(&map, 0).text(5, 4), "USER: salva\n\nAGENT: salv");
}

#[test]
#[should_panic(expected = "Target.text: input_chars is positive")]
fn text_rejects_zero_input_chars() {
    let map = session();
    target(&map, 0).text(0, 1);
}

#[test]
#[should_panic(expected = "Target.text: output_chars is positive")]
fn text_rejects_zero_output_chars() {
    let map = session();
    target(&map, 0).text(1, 0);
}

#[tokio::test]
#[should_panic(expected = "Extraction.from: the vocabulary is not empty")]
async fn from_rejects_an_empty_vocabulary() {
    let chat = dead_chat();
    let map = session();
    let target = target(&map, 0);
    let extractor = extractor();
    Extraction::from(&chat, &target, &[], &extractor).await;
}

#[tokio::test]
async fn from_leaves_no_rule_of_a_failed_answer() {
    let chat = dead_chat();
    let map = session();
    let target = target(&map, 0);
    let extractor = extractor();
    let vocabulary = vec![String::from("karakeep")];
    Extraction::from(&chat, &target, &vocabulary, &extractor).await;
}

#[test]
fn quality_bar_is_the_head_then_the_guide() {
    let bar = quality_bar();
    assert!(bar.starts_with(QUALITY_BAR_HEAD));
    assert!(bar[QUALITY_BAR_HEAD.len()..].starts_with("\n\n"));
    assert!(bar.ends_with(RULE_GUIDE.trim_end()));
    assert_eq!(bar, bar.trim_end());
}

#[test]
#[should_panic(expected = "extraction_prompt: the vocabulary is not empty")]
fn extraction_prompt_rejects_an_empty_vocabulary() {
    let map = session();
    let target = target(&map, 0);
    let extractor = extractor();
    extraction_prompt(&target, &[], &extractor);
}

#[test]
fn extraction_prompt_is_the_td_template() {
    let map = session();
    let target = target(&map, 0);
    let vocabulary = vec![String::from("karakeep"), String::from("git")];
    let want = format!(
        "{}\n\nTag vocabulary: karakeep, git\n\n{}\n\n## How this episode ended\nthe user saves a link\n\n## The episode (context)\n{}\n\n## >>> TARGET: extract only from this exchange <<<\n{}",
        quality_bar(),
        map.text(),
        target.episode_text(4000),
        target.text(2000, 2000),
    );
    assert_eq!(extraction_prompt(&target, &vocabulary, &extractor()), want);
}

#[tokio::test]
async fn from_checks_the_rules_of_a_good_answer() {
    let answer = r#"{"rules": [{"if": "quando l'utente chiede di salvare un link", "do": "salva il link su karakeep", "tags": ["karakeep"], "quote": "salva questo link su kara"}, {"if": "x", "do": "", "tags": [], "quote": "x"}]}"#;
    let (chat, _) = fake(vec![said(answer, 10, 5)]).await;
    let map = session();
    let vocabulary = vec![String::from("karakeep")];
    let extraction = Extraction::from(&chat, &target(&map, 0), &vocabulary, &extractor()).await;
    let drops: Vec<Option<Drop>> = extraction
        .rules()
        .iter()
        .map(crate::distill::rule::Checked::drop)
        .collect();
    assert_eq!(drops, [None, Some(Drop::Empty)]);
}

#[test]
fn candidates_check_judges_the_shape_of_the_answer() {
    let need_rules = || Some(String::from("need a list `rules`"));
    assert_eq!(candidates_check(&json!(null)), need_rules());
    assert_eq!(candidates_check(&json!(3)), need_rules());
    assert_eq!(candidates_check(&json!("rules")), need_rules());
    assert_eq!(candidates_check(&json!([])), need_rules());
    assert_eq!(candidates_check(&json!({})), need_rules());
    assert_eq!(candidates_check(&json!({"rules": 3})), need_rules());
    assert_eq!(candidates_check(&json!({"rules": "x"})), need_rules());
    assert_eq!(candidates_check(&json!({"rules": {}})), need_rules());

    assert_eq!(candidates_check(&json!({"rules": []})), None);
    assert_eq!(candidates_check(&json!({"rules": [rule()]})), None);
    assert_eq!(candidates_check(&json!({"rules": [rule(), rule()]})), None);

    let blank = json!({"rules": [{"if": "", "do": "", "tags": [], "quote": ""}]});
    assert_eq!(candidates_check(&blank), None);
    let extra = json!({
        "rules": [{"if": "i", "do": "d", "tags": [], "proposedTags": ["p"], "why": "w", "quote": "q"}]
    });
    assert_eq!(candidates_check(&extra), None);

    let no_if = json!({"rules": [{"do": "d", "tags": ["t"], "quote": "q"}]});
    assert_eq!(candidates_check(&no_if), Some(not_a_rule(0)));
    let if_number = json!({"rules": [{"if": 3, "do": "d", "tags": ["t"], "quote": "q"}]});
    assert_eq!(candidates_check(&if_number), Some(not_a_rule(0)));
    let no_do = json!({"rules": [{"if": "i", "tags": ["t"], "quote": "q"}]});
    assert_eq!(candidates_check(&no_do), Some(not_a_rule(0)));
    let do_number = json!({"rules": [{"if": "i", "do": 3, "tags": ["t"], "quote": "q"}]});
    assert_eq!(candidates_check(&do_number), Some(not_a_rule(0)));
    let no_quote = json!({"rules": [{"if": "i", "do": "d", "tags": ["t"]}]});
    assert_eq!(candidates_check(&no_quote), Some(not_a_rule(0)));
    let quote_number = json!({"rules": [{"if": "i", "do": "d", "tags": ["t"], "quote": 3}]});
    assert_eq!(candidates_check(&quote_number), Some(not_a_rule(0)));
    let no_tags = json!({"rules": [{"if": "i", "do": "d", "quote": "q"}]});
    assert_eq!(candidates_check(&no_tags), Some(not_a_rule(0)));
    let tags_string = json!({"rules": [{"if": "i", "do": "d", "tags": "t", "quote": "q"}]});
    assert_eq!(candidates_check(&tags_string), Some(not_a_rule(0)));
    let tags_number = json!({"rules": [{"if": "i", "do": "d", "tags": [3], "quote": "q"}]});
    assert_eq!(candidates_check(&tags_number), Some(not_a_rule(0)));
    let not_an_object = json!({"rules": ["nope"]});
    assert_eq!(candidates_check(&not_an_object), Some(not_a_rule(0)));

    let second = json!({"rules": [rule(), {"if": "i", "do": "d", "tags": ["t"]}]});
    assert_eq!(candidates_check(&second), Some(not_a_rule(1)));
    let first = json!({"rules": [{"if": "i", "tags": ["t"]}, rule()]});
    assert_eq!(candidates_check(&first), Some(not_a_rule(0)));
}

#[test]
#[should_panic(expected = "check_candidates: the json passes the check")]
fn check_candidates_rejects_a_json_that_fails_the_check() {
    let map = session();
    let target = target(&map, 0);
    let vocabulary = vec![String::from("karakeep")];
    let broken = json!({"rules": "x"});
    check_candidates(&broken, &target, &vocabulary);
}

#[test]
fn check_candidates_makes_one_checked_per_rule() {
    let map = session();
    let target = target(&map, 0);
    let vocabulary = vec![String::from("karakeep")];
    let answer = json!({
        "rules": [
            {
                "if": "if the user asks to save a link",
                "do": "save it with kara",
                "tags": ["karakeep"],
                "quote": "salva questo link su kara"
            }
        ]
    });
    check_candidates(&answer, &target, &vocabulary);
}
