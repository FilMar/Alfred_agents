use crate::distill::novelty::Judged;
use crate::tests::distill_fake::{candidate, extractor, fake};

#[tokio::test]
async fn of_makes_no_call_when_there_is_no_candidate() {
    let fake = fake(vec![]).await;
    let extractor = extractor(3);
    Judged::of(&fake.chat, &[], &[], &extractor).await;
}

#[tokio::test]
async fn of_gives_one_ruling_per_candidate_on_an_ok_answer() {
    let fake = fake(vec![
        "{\"verdicts\":[{\"cand\":0,\"verdict\":\"new\"},{\"cand\":1,\"verdict\":\"new\"}]}",
    ])
    .await;
    let extractor = extractor(3);
    let one = candidate("quando l'utente chiede un riassunto", "riassumi il testo");
    let two = candidate("quando l'utente chiede la traduzione", "traduci il testo");
    let candidates = [&one, &two];
    Judged::of(&fake.chat, &candidates, &[], &extractor).await;
}

#[tokio::test]
async fn of_gives_no_ruling_on_a_failed_answer() {
    let fake = fake(vec!["{\"verdicts\":[]}", "{\"verdicts\":[]}"]).await;
    let extractor = extractor(3);
    let one = candidate("quando l'utente chiede un riassunto", "riassumi il testo");
    let candidates = [&one];
    Judged::of(&fake.chat, &candidates, &[], &extractor).await;
}

#[tokio::test]
async fn of_settles_the_answer_after_a_correction() {
    let fake = fake(vec![
        "{\"verdicts\":[]}",
        "{\"verdicts\":[{\"cand\":0,\"verdict\":\"duplicate\",\"of\":0,\"reason\":\"gia presente\"}]}",
    ])
    .await;
    let extractor = extractor(3);
    let one = candidate("quando l'utente chiede un riassunto", "riassumi il testo");
    let candidates = [&one];
    let known = [crate::distill::twin::Known::neighbour(
        "11111111-1111-4111-8111-111111111111".to_string(),
        "SE l'utente chiede un riassunto ALLORA riassumi il testo".to_string(),
    )];
    Judged::of(&fake.chat, &candidates, &known, &extractor).await;
}
