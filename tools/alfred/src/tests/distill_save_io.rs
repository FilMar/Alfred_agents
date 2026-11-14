use crate::distill::save::save_rule;

#[tokio::test]
#[should_panic(expected = "save_rule: exchange_id is an exchange id")]
async fn save_rule_rejects_a_blank_exchange_id() {
    let f = crate::tests::distill_fake::fake(vec![]).await;
    let c = crate::tests::distill_fake::candidate(
        "quando l'utente chiede un riassunto",
        "rispondi con un breve riassunto",
    );
    let r = crate::distill::novelty::Ruling::twin("session:1".to_string());
    let _ = save_rule(&f.rules, &c, &r, "", jiff::Timestamp::now()).await;
}

#[tokio::test]
#[should_panic(expected = "save_rule: the ruling writes")]
async fn save_rule_rejects_a_duplicate() {
    let f = crate::tests::distill_fake::fake(vec![]).await;
    let c = crate::tests::distill_fake::candidate(
        "quando l'utente chiede un riassunto",
        "rispondi con un breve riassunto",
    );
    let r = crate::distill::novelty::Ruling::twin("session:1".to_string());
    let _ = save_rule(
        &f.rules,
        &c,
        &r,
        crate::tests::distill_fake::EXCHANGE,
        jiff::Timestamp::now(),
    )
    .await;
}

#[tokio::test]
async fn save_rule_saves_a_new_rule() {
    let f = crate::tests::distill_fake::fake(vec![]).await;
    let c = crate::tests::distill_fake::candidate(
        "quando l'utente chiede un riassunto",
        "rispondi con un breve riassunto",
    );
    let json: serde_json::Value =
        serde_json::from_str(r#"{"verdicts":[{"cand":0,"verdict":"new"}]}"#)
            .expect("the verdicts json parses");
    let rulings = crate::distill::novelty::settle(&json, 1, &[]);
    let _ = save_rule(
        &f.rules,
        &c,
        &rulings[0],
        crate::tests::distill_fake::EXCHANGE,
        jiff::Timestamp::now(),
    )
    .await;
}

#[tokio::test]
async fn save_rule_appends_a_do() {
    let f = crate::tests::distill_fake::fake(vec![]).await;
    crate::tests::distill_fake::seed(
        &f.world,
        "11111111-1111-4111-8111-111111111111",
        "quando l'utente chiede un riassunto",
        &["rispondi in breve"],
    );
    let c = crate::tests::distill_fake::candidate(
        "quando l'utente chiede un riassunto",
        "rispondi con un breve riassunto",
    );
    let known = [crate::distill::twin::Known::neighbour(
        "11111111-1111-4111-8111-111111111111".to_string(),
        "SE quando l'utente chiede un riassunto ALLORA rispondi in breve".to_string(),
    )];
    let json: serde_json::Value = serde_json::from_str(r#"{"verdicts":[{"cand":0,"verdict":"append","of":0,"do":"salva il riassunto nelle note","reason":"una nuova azione per una regola nota"}]}"#).expect("the verdicts json parses");
    let rulings = crate::distill::novelty::settle(&json, 1, &known);
    let _ = save_rule(
        &f.rules,
        &c,
        &rulings[0],
        crate::tests::distill_fake::EXCHANGE,
        jiff::Timestamp::now(),
    )
    .await;
}

#[tokio::test]
async fn save_rule_skips_a_session_append() {
    let f = crate::tests::distill_fake::fake(vec![]).await;
    let c = crate::tests::distill_fake::candidate(
        "quando l'utente chiede un riassunto",
        "rispondi con un breve riassunto",
    );
    let known = [crate::distill::twin::Known::neighbour(
        "session:1".to_string(),
        "SE quando l'utente chiede un elenco ALLORA rispondi con un elenco puntato".to_string(),
    )];
    let json: serde_json::Value = serde_json::from_str(r#"{"verdicts":[{"cand":0,"verdict":"append","of":0,"do":"salva il riassunto nelle note","reason":"una nuova azione per una regola della sessione"}]}"#).expect("the verdicts json parses");
    let rulings = crate::distill::novelty::settle(&json, 1, &known);
    let _ = save_rule(
        &f.rules,
        &c,
        &rulings[0],
        crate::tests::distill_fake::EXCHANGE,
        jiff::Timestamp::now(),
    )
    .await;
}

#[tokio::test]
async fn save_rule_fails_when_the_rule_is_missing() {
    let f = crate::tests::distill_fake::fake(vec![]).await;
    let c = crate::tests::distill_fake::candidate(
        "quando l'utente chiede un riassunto",
        "rispondi con un breve riassunto",
    );
    let known = [crate::distill::twin::Known::neighbour(
        "22222222-2222-4222-8222-222222222222".to_string(),
        "SE quando l'utente chiede un riepilogo ALLORA rispondi in breve".to_string(),
    )];
    let json: serde_json::Value = serde_json::from_str(r#"{"verdicts":[{"cand":0,"verdict":"append","of":0,"do":"salva il riepilogo nelle note","reason":"una nuova azione per una regola nota"}]}"#).expect("the verdicts json parses");
    let rulings = crate::distill::novelty::settle(&json, 1, &known);
    let _ = save_rule(
        &f.rules,
        &c,
        &rulings[0],
        crate::tests::distill_fake::EXCHANGE,
        jiff::Timestamp::now(),
    )
    .await;
}

#[tokio::test]
async fn save_rule_fails_when_the_reread_is_down() {
    let f = crate::tests::distill_fake::fake(vec![]).await;
    f.world.lock().unwrap().down.insert("get");
    let c = crate::tests::distill_fake::candidate(
        "quando l'utente chiede un riassunto",
        "rispondi con un breve riassunto",
    );
    let json: serde_json::Value =
        serde_json::from_str(r#"{"verdicts":[{"cand":0,"verdict":"new"}]}"#)
            .expect("the verdicts json parses");
    let rulings = crate::distill::novelty::settle(&json, 1, &[]);
    let _ = save_rule(
        &f.rules,
        &c,
        &rulings[0],
        crate::tests::distill_fake::EXCHANGE,
        jiff::Timestamp::now(),
    )
    .await;
}
