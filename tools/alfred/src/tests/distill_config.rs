use crate::distill::config::{Config, CriticCheck, DropWhen, Extractor, bad_config};

fn valid_json() -> String {
    let role = |name: &str| {
        format!(r#"{{"model":"qwen3","think":"low","temperature":0.2,"system":"the {name} role"}}"#)
    };
    format!(
        r#"{{"episodes":{},"extract":{},"critic":{},"novelty":{},"checks":[{{"name":"fresh","text":"new","dropWhen":"atLeast","threshold":0.5}},{{"name":"clean","text":"no noise","dropWhen":"under","threshold":0.5}}],"episodeChars":1000,"targetInputChars":2000,"targetOutputChars":3000,"listingChars":4000,"vocabularySize":100,"topK":5}}"#,
        role("episodes"),
        role("extract"),
        role("critic"),
        role("novelty")
    )
}

fn valid() -> Config {
    serde_json::from_str(&valid_json()).unwrap()
}

fn row(config: String) -> crate::hist::Extractor {
    crate::hist::Extractor {
        id: 4,
        parent: None,
        why: "rules only".to_string(),
        active: false,
        config,
        created: "2026-01-01T00:00:00.000Z".to_string(),
    }
}

#[test]
fn drops_follows_its_direction_at_the_edges() {
    let check = |drop_when, threshold| CriticCheck {
        name: "fresh".to_string(),
        text: "new".to_string(),
        drop_when,
        threshold,
    };
    let cases = [
        (DropWhen::AtLeast, 0.5, 0.5, true),
        (DropWhen::AtLeast, 0.5, 0.5 - 1e-9, false),
        (DropWhen::AtLeast, 0.5, 0.5 + 1e-9, true),
        (DropWhen::AtLeast, 0.0, 0.0, true),
        (DropWhen::Under, 0.5, 0.5, false),
        (DropWhen::Under, 0.5, 0.5 - 1e-9, true),
        (DropWhen::Under, 0.5, 0.5 + 1e-9, false),
        (DropWhen::Under, 0.0, 0.0, false),
    ];
    for (drop_when, threshold, p, expected) in cases {
        assert_eq!(
            check(drop_when, threshold).drops(p),
            expected,
            "{drop_when:?} {threshold} {p}"
        );
    }
}

#[test]
#[should_panic(expected = "CriticCheck.drops: p is from 0 to 1")]
fn drops_refuses_a_probability_above_one() {
    valid().checks[0].drops(1.0 + 1e-9);
}

#[test]
fn bad_config_names_the_first_fault() {
    type Case = (fn(&mut Config), Option<&'static str>);
    let cases: Vec<Case> = vec![
        (|_| {}, None),
        (|c| c.checks.clear(), Some("no critic check")),
        (
            |c| c.checks[1].name = "fresh".to_string(),
            Some("check names are not unique"),
        ),
        (
            |c| c.episode_chars = 0,
            Some("episodeChars is not positive"),
        ),
        (
            |c| c.target_input_chars = 0,
            Some("targetInputChars is not positive"),
        ),
        (
            |c| c.target_output_chars = 0,
            Some("targetOutputChars is not positive"),
        ),
        (
            |c| c.listing_chars = 0,
            Some("listingChars is not positive"),
        ),
        (
            |c| c.vocabulary_size = 0,
            Some("vocabularySize is not positive"),
        ),
        (|c| c.top_k = 0, Some("topK is not positive")),
        (
            |c| {
                c.listing_chars = 0;
                c.top_k = 0;
            },
            Some("listingChars is not positive"),
        ),
        (
            |c| c.episodes.model = " ".to_string(),
            Some("episodes model is blank"),
        ),
        (
            |c| c.novelty.model = String::new(),
            Some("novelty model is blank"),
        ),
        (
            |c| c.extract.system = " ".to_string(),
            Some("extract system is blank"),
        ),
        (
            |c| {
                c.critic.system = String::new();
                c.critic.model = String::new();
            },
            Some("critic model is blank"),
        ),
        (
            |c| c.critic.temperature = -1e-6,
            Some("critic temperature is not finite and at least 0"),
        ),
        (
            |c| c.episodes.temperature = f32::NAN,
            Some("episodes temperature is not finite and at least 0"),
        ),
        (
            |c| c.extract.temperature = f32::INFINITY,
            Some("extract temperature is not finite and at least 0"),
        ),
        (|c| c.episodes.temperature = 0.0, None),
        (
            |c| c.checks[0].threshold = -1e-9,
            Some("check fresh threshold is not from 0 to 1"),
        ),
        (
            |c| c.checks[1].threshold = 1.0 + 1e-9,
            Some("check clean threshold is not from 0 to 1"),
        ),
        (
            |c| {
                c.checks[0].threshold = 0.0;
                c.checks[1].threshold = 1.0;
            },
            None,
        ),
        (
            |c| c.checks[0].text = String::new(),
            Some("check fresh text is blank"),
        ),
        (
            |c| {
                c.novelty.temperature = f32::NAN;
                c.checks[0].threshold = 2.0;
            },
            Some("novelty temperature is not finite and at least 0"),
        ),
        (
            |c| {
                c.checks[0].threshold = 2.0;
                c.checks[0].text = String::new();
            },
            Some("check fresh threshold is not from 0 to 1"),
        ),
    ];
    for (at, (spoil, expected)) in cases.into_iter().enumerate() {
        let mut config = valid();
        spoil(&mut config);
        assert_eq!(bad_config(&config).as_deref(), expected, "case {at}");
    }
}

#[test]
fn from_row_keeps_a_good_row() {
    let _ = Extractor::from_row(&row(valid_json()), None);
}

#[test]
fn from_row_puts_the_override_model_in_every_role() {
    let _ = Extractor::from_row(&row(valid_json()), Some("glm-5.3-flash:cloud"));
}

#[test]
fn from_row_refuses_a_row_that_is_not_an_extractor() {
    let cases = [
        r#"{"notes": []}"#.to_string(),
        valid_json().replace(r#""topK":5"#, r#""topK":5,"extra":1"#),
        valid_json().replace(r#""think":"low""#, r#""think":"loud""#),
    ];
    for config in cases {
        let error = Extractor::from_row(&row(config), None).unwrap_err();
        assert!(
            error.starts_with("extractor 4: config is not an extractor: "),
            "{error}"
        );
    }
}

#[test]
fn from_row_reports_a_bad_config() {
    let config = valid_json().replace(r#""topK":5"#, r#""topK":0"#);
    assert_eq!(
        Extractor::from_row(&row(config), None),
        Err("topK is not positive".to_string())
    );
}

#[test]
#[should_panic(expected = "Extractor.from_row: an override model is not blank")]
fn from_row_refuses_a_blank_override_model() {
    let _ = Extractor::from_row(&row(valid_json()), Some("   "));
}
