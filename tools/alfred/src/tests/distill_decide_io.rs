use crate::distill::decide::{Carry, Tools, decide, neighbours_of};
use crate::tests::distill_fake::Fake;

fn tools<'a>(
    f: &'a Fake,
    extractor: &'a crate::distill::config::Extractor,
    mode: crate::distill::save::Mode,
    cutoff: Option<f32>,
) -> Tools<'a> {
    Tools {
        chat: &f.chat,
        rules: &f.rules,
        embedder: &f.embedder,
        extractor,
        mode,
        cutoff,
    }
}

fn carry(max: Option<u32>) -> Carry {
    Carry {
        list: crate::distill::twin::SessionList::empty(),
        budget: crate::distill::save::Budget::of(max),
    }
}

#[tokio::test]
#[should_panic(expected = "decide: exchange_id is an exchange id")]
async fn decide_rejects_a_non_exchange_id() {
    let f = crate::tests::distill_fake::fake(vec![]).await;
    let extractor = crate::tests::distill_fake::extractor(1);
    let tools = tools(&f, &extractor, crate::distill::save::Mode::Shadow, None);
    let kept = vec![crate::tests::distill_fake::checked(
        "quando l'utente chiede un riassunto",
        "fai un riassunto breve",
    )];
    let outcomes = vec![crate::tests::distill_fake::judged(&kept[0], 0.3)];
    let carry = carry(None);
    decide(
        &tools,
        "not an id",
        &kept,
        outcomes,
        carry,
        jiff::Timestamp::now(),
    )
    .await;
}

#[tokio::test]
#[should_panic(expected = "decide: one outcome per checked rule")]
async fn decide_rejects_more_checked_than_outcomes() {
    let f = crate::tests::distill_fake::fake(vec![]).await;
    let extractor = crate::tests::distill_fake::extractor(1);
    let tools = tools(&f, &extractor, crate::distill::save::Mode::Shadow, None);
    let kept = vec![crate::tests::distill_fake::checked(
        "quando l'utente chiede un riassunto",
        "fai un riassunto breve",
    )];
    let carry = carry(None);
    decide(
        &tools,
        crate::tests::distill_fake::EXCHANGE,
        &kept,
        vec![],
        carry,
        jiff::Timestamp::now(),
    )
    .await;
}

#[tokio::test]
async fn decide_keeps_one_outcome_per_checked_rule() {
    let f = crate::tests::distill_fake::fake(vec![
        r#"{"verdicts":[{"cand":0,"verdict":"new","do":"fai un riassunto breve","reason":"no neighbour matches"}]}"#,
    ])
    .await;
    let extractor = crate::tests::distill_fake::extractor(1);
    let tools = tools(
        &f,
        &extractor,
        crate::distill::save::Mode::Shadow,
        Some(0.1),
    );
    let kept = vec![
        crate::tests::distill_fake::checked(
            "quando l'utente chiede un riassunto",
            "fai un riassunto breve",
        ),
        crate::tests::distill_fake::checked(
            "quando l'utente chiede una traduzione",
            "traduci il testo",
        ),
    ];
    let outcomes = vec![
        crate::tests::distill_fake::judged(&kept[0], 0.3),
        crate::tests::distill_fake::judged(&kept[1], 0.9),
    ];
    let carry = carry(None);
    decide(
        &tools,
        crate::tests::distill_fake::EXCHANGE,
        &kept,
        outcomes,
        carry,
        jiff::Timestamp::now(),
    )
    .await;
}

#[tokio::test]
async fn decide_one_ruling_per_judgeable() {
    let f = crate::tests::distill_fake::fake(vec![
        r#"{"verdicts":[{"cand":0,"verdict":"new","do":"fai un riassunto breve","reason":"no neighbour matches"},{"cand":1,"verdict":"new","do":"traduci il testo","reason":"no neighbour matches"}]}"#,
    ])
    .await;
    let extractor = crate::tests::distill_fake::extractor(1);
    let tools = tools(
        &f,
        &extractor,
        crate::distill::save::Mode::Active,
        Some(1.0),
    );
    let kept = vec![
        crate::tests::distill_fake::checked(
            "quando l'utente chiede un riassunto",
            "fai un riassunto breve",
        ),
        crate::tests::distill_fake::checked(
            "quando l'utente chiede una traduzione",
            "traduci il testo",
        ),
    ];
    let outcomes = vec![
        crate::tests::distill_fake::judged(&kept[0], 0.3),
        crate::tests::distill_fake::judged(&kept[1], 0.2),
    ];
    let carry = carry(Some(2));
    decide(
        &tools,
        crate::tests::distill_fake::EXCHANGE,
        &kept,
        outcomes,
        carry,
        jiff::Timestamp::now(),
    )
    .await;
}

#[tokio::test]
async fn decide_judgeables_with_no_ruling_carry_a_failure() {
    let f = crate::tests::distill_fake::fake(vec!["nope", "nope"]).await;
    let extractor = crate::tests::distill_fake::extractor(1);
    let tools = tools(&f, &extractor, crate::distill::save::Mode::Active, None);
    let kept = vec![crate::tests::distill_fake::checked(
        "quando l'utente chiede un riassunto",
        "fai un riassunto breve",
    )];
    let outcomes = vec![crate::tests::distill_fake::judged(&kept[0], 0.3)];
    let carry = carry(None);
    decide(
        &tools,
        crate::tests::distill_fake::EXCHANGE,
        &kept,
        outcomes,
        carry,
        jiff::Timestamp::now(),
    )
    .await;
}

#[tokio::test]
async fn decide_shadow_saves_nothing() {
    let f = crate::tests::distill_fake::fake(vec![
        r#"{"verdicts":[{"cand":0,"verdict":"new","do":"fai un riassunto breve","reason":"no neighbour matches"}]}"#,
    ])
    .await;
    let extractor = crate::tests::distill_fake::extractor(1);
    let tools = tools(
        &f,
        &extractor,
        crate::distill::save::Mode::Shadow,
        Some(0.75),
    );
    let kept = vec![crate::tests::distill_fake::checked(
        "quando l'utente chiede un riassunto",
        "fai un riassunto breve",
    )];
    let outcomes = vec![crate::tests::distill_fake::judged(&kept[0], 0.3)];
    let carry = carry(Some(1));
    decide(
        &tools,
        crate::tests::distill_fake::EXCHANGE,
        &kept,
        outcomes,
        carry,
        jiff::Timestamp::now(),
    )
    .await;
}

#[tokio::test]
async fn decide_no_failure_is_blank() {
    let f = crate::tests::distill_fake::fake(vec!["nope", "nope"]).await;
    let extractor = crate::tests::distill_fake::extractor(1);
    let tools = tools(&f, &extractor, crate::distill::save::Mode::Shadow, None);
    let kept = vec![
        crate::tests::distill_fake::checked(
            "quando l'utente chiede un riassunto",
            "fai un riassunto breve",
        ),
        crate::tests::distill_fake::checked(
            "quando l'utente chiede una traduzione",
            "traduci il testo",
        ),
    ];
    let outcomes = vec![
        crate::tests::distill_fake::judged(&kept[0], 0.3),
        crate::distill::record::Outcome::of(&kept[1]),
    ];
    let carry = carry(None);
    decide(
        &tools,
        crate::tests::distill_fake::EXCHANGE,
        &kept,
        outcomes,
        carry,
        jiff::Timestamp::now(),
    )
    .await;
}

#[tokio::test]
#[should_panic(expected = "neighbours_of: top_k is above 0")]
async fn neighbours_of_rejects_zero_top_k() {
    let f = crate::tests::distill_fake::fake(vec![]).await;
    let c = crate::tests::distill_fake::candidate(
        "quando l'utente chiede un riassunto",
        "fai un riassunto breve",
    );
    let _ = neighbours_of(&f.rules, &c, 0).await;
}

#[tokio::test]
async fn neighbours_of_returns_at_most_top_k() {
    let f = crate::tests::distill_fake::fake(vec![]).await;
    crate::tests::distill_fake::seed(
        &f.world,
        "11111111-1111-4111-8111-111111111111",
        "quando l'utente chiede un riassunto",
        &["fai un riassunto breve"],
    );
    crate::tests::distill_fake::seed(
        &f.world,
        "22222222-2222-4222-8222-222222222222",
        "l'utente chiede un riassunto quando",
        &["fai un riassunto"],
    );
    let c = crate::tests::distill_fake::candidate(
        "quando l'utente chiede un riassunto",
        "fai un riassunto breve",
    );
    let _ = neighbours_of(&f.rules, &c, 1).await;
}
