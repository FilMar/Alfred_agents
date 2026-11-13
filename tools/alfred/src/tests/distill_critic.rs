use crate::distill::critic::{
    Judgement, Probabilities, critic_prompt, drop_of, probabilities_check,
};
use crate::tests::distill_ask::fake::{fake, said};

#[test]
#[should_panic(expected = "probabilities_check: at least one check")]
fn probabilities_check_needs_a_check() {
    probabilities_check(&serde_json::json!({"a": 0.5}), &[]);
}

#[test]
fn probabilities_check_table() {
    let wrong = "need exactly these keys, each a number from 0 to 1: a, b";
    let cases = [
        (serde_json::json!({"a": 0.2, "b": 0.9}), None),
        (serde_json::json!({"b": 0.9, "a": 0.2}), None),
        (serde_json::json!({"a": 0, "b": 1}), None),
        (serde_json::json!({"a": 0.01, "b": 0.99}), None),
        (serde_json::json!({"a": -0.01, "b": 0.9}), Some(wrong)),
        (serde_json::json!({"a": 1.01, "b": 0.9}), Some(wrong)),
        (serde_json::json!({"a": 0.2}), Some(wrong)),
        (serde_json::json!({}), Some(wrong)),
        (
            serde_json::json!({"a": 0.2, "b": 0.9, "c": 0.4}),
            Some(wrong),
        ),
        (serde_json::json!({"a": "high", "b": 0.9}), Some(wrong)),
        (serde_json::json!({"a": true, "b": 0.9}), Some(wrong)),
        (serde_json::json!({"a": null, "b": 0.9}), Some(wrong)),
        (serde_json::json!([0.2, 0.9]), Some(wrong)),
        (serde_json::json!("high"), Some(wrong)),
        (serde_json::json!(5), Some(wrong)),
        (serde_json::json!(null), Some(wrong)),
    ];
    for (json, expected) in cases {
        assert_eq!(probabilities_check(&json, &checks()).as_deref(), expected);
    }
}

#[test]
#[should_panic(expected = "drop_of: every check has a probability")]
fn drop_of_needs_every_probability() {
    drop_of(&probabilities(&serde_json::json!({"b": 0.9})), &checks());
}

#[test]
fn drop_of_table() {
    let cases = [
        (
            probabilities(&serde_json::json!({"a": 0.9, "b": 0.9})),
            Some("a"),
        ),
        (
            probabilities(&serde_json::json!({"a": 0.2, "b": 0.1})),
            Some("b"),
        ),
        (
            probabilities(&serde_json::json!({"a": 0.9, "b": 0.1})),
            Some("a"),
        ),
        (
            probabilities(&serde_json::json!({"a": 0.2, "b": 0.9})),
            None,
        ),
        (
            probabilities(&serde_json::json!({"a": 0.5, "b": 0.9})),
            Some("a"),
        ),
        (
            probabilities(&serde_json::json!({"a": 0.49, "b": 0.9})),
            None,
        ),
        (
            probabilities(&serde_json::json!({"a": 0.51, "b": 0.9})),
            Some("a"),
        ),
        (
            probabilities(&serde_json::json!({"a": 0.2, "b": 0.3})),
            None,
        ),
        (
            probabilities(&serde_json::json!({"a": 0.2, "b": 0.29})),
            Some("b"),
        ),
        (
            probabilities(&serde_json::json!({"a": 0.2, "b": 0.31})),
            None,
        ),
        (
            probabilities(&serde_json::json!({"a": 0.0, "b": 1.0})),
            None,
        ),
        (
            probabilities(&serde_json::json!({"a": 1.0, "b": 0.0})),
            Some("a"),
        ),
        (
            probabilities(&serde_json::json!({"b": 0.1, "a": 0.9})),
            Some("a"),
        ),
        (
            probabilities(&serde_json::json!({"a": 0.2, "b": 0.9, "c": 0.0})),
            None,
        ),
    ];
    for (given, expected) in cases {
        assert_eq!(drop_of(&given, &checks()).as_deref(), expected);
    }
}

#[test]
fn critic_prompt_is_the_td_template() {
    let read = session_read();
    let map = map_of(&read);
    let target = target_of(&map);
    let candidate = candidate();
    let want = format!(
        "{}\n\n## How this episode ended\nthe user asks and the agent answers\n\n## The episode (context)\n{}\n\n## The exchange the candidate comes from\n{}\n\n## The candidate (rule)\n{}\n\n## Questions\nAnswer with one JSON object. Each key is a question name. Each value is a probability from 0.0 to 1.0 that the answer is yes.\n- a: the rule is confused\n- b: the rule is off topic",
        map.text(),
        target.episode_text(4000),
        target.text(400, 400),
        r#"{"if":"the user asks about a thing","do":"answer about the thing","tags":["things"],"proposedTags":[],"quote":"the user asks thing 0"}"#,
    );
    assert_eq!(critic_prompt(&target, &candidate, &extractor()), want);
}

#[tokio::test]
async fn judgement_of_an_answer() {
    let replies: [(&[&str], bool); 3] = [
        (&[r#"{"a": 0.2, "b": 0.9}"#], true),
        (&[r#"{"a": 0.9, "b": 0.9}"#], true),
        (&["I have no JSON for you.", "Still no JSON."], false),
    ];
    for (texts, ok) in replies {
        let (chat, _) = fake(texts.iter().map(|t| said(t, 10, 5)).collect()).await;
        let read = session_read();
        let map = map_of(&read);
        let judgement = Judgement::of(&chat, &target_of(&map), &candidate(), &extractor()).await;
        assert_eq!(judgement.answer().is_ok(), ok, "texts: {texts:?}");
    }
}

fn checks() -> Vec<crate::distill::config::CriticCheck> {
    vec![
        crate::distill::config::CriticCheck {
            name: "a".to_string(),
            text: "the rule is confused".to_string(),
            drop_when: crate::distill::config::DropWhen::AtLeast,
            threshold: 0.5,
        },
        crate::distill::config::CriticCheck {
            name: "b".to_string(),
            text: "the rule is off topic".to_string(),
            drop_when: crate::distill::config::DropWhen::Under,
            threshold: 0.3,
        },
    ]
}

fn probabilities(json: &serde_json::Value) -> Probabilities {
    json.as_object().cloned().unwrap_or_default()
}

fn turn(n: u32) -> crate::distill::session::Turn {
    let id = format!("s-{n}");
    let exchange = crate::hist::Exchange {
        id: id.clone(),
        session: "s".to_string(),
        parent: None,
        timestamp: format!("2026-01-01T0{n}:00:00Z"),
        kind: "chat".to_string(),
        actor: "user".to_string(),
        model: None,
        tokens_in: None,
        tokens_out: None,
        tokens_cache_read: None,
        tokens_cache_write: None,
        distilled: None,
        meta: None,
    };
    let contents = crate::hist::Contents {
        exchange_id: id,
        input: format!("the user asks thing {n}"),
        output: format!("the agent answers thing {n}"),
        tools: None,
    };
    crate::distill::session::Turn::of(exchange, contents)
}

fn session_read() -> crate::distill::session::SessionRead {
    crate::distill::session::SessionRead::of("s".to_string(), vec![turn(0), turn(1)], Vec::new())
}

fn map_of(read: &crate::distill::session::SessionRead) -> crate::distill::episodes::SessionMap {
    let json = serde_json::json!({
        "episodes": [{"from": 0, "to": 1, "summary": "the user asks and the agent answers"}]
    });
    crate::distill::episodes::SessionMap::from_json(&json, read)
}

fn target_of(map: &crate::distill::episodes::SessionMap) -> crate::distill::extract::Target<'_> {
    crate::distill::extract::Target::of(map, &map.episodes()[0], 1)
}

fn candidate() -> crate::distill::rule::RuleCandidate {
    crate::distill::rule::RuleCandidate {
        if_: "the user asks about a thing".to_string(),
        do_: "answer about the thing".to_string(),
        tags: vec!["things".to_string()],
        proposed_tags: Vec::new(),
        quote: "the user asks thing 0".to_string(),
    }
}

fn extractor() -> crate::distill::config::Extractor {
    let role = |name: &str| {
        serde_json::json!({
            "model": "fake",
            "think": "off",
            "temperature": 0.2,
            "system": format!("you are the {name} role of the distiller")
        })
    };
    let config = serde_json::json!({
        "episodes": role("episodes"),
        "extract": role("extract"),
        "critic": role("critic"),
        "novelty": role("novelty"),
        "checks": [
            {"name": "a", "text": "the rule is confused", "dropWhen": "atLeast", "threshold": 0.5},
            {"name": "b", "text": "the rule is off topic", "dropWhen": "under", "threshold": 0.3}
        ],
        "episodeChars": 4000,
        "targetInputChars": 400,
        "targetOutputChars": 400,
        "listingChars": 300,
        "vocabularySize": 20,
        "topK": 8
    })
    .to_string();
    let row = crate::hist::Extractor {
        id: 7,
        parent: None,
        why: "the critic tests".to_string(),
        active: true,
        config,
        created: "2026-11-13T00:00:00Z".to_string(),
    };
    crate::distill::config::Extractor::from_row(&row, None)
        .expect("extractor: the test config is valid")
}
