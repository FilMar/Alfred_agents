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
