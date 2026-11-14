use crate::distill::novelty::saved_text;
use crate::distill::record::Verdict;
use crate::distill::twin::{SessionList, Twins};
use crate::tests::distill_fake::{candidate, fake, vector_of};

fn listed(texts: &[&str]) -> SessionList {
    texts.iter().fold(SessionList::empty(), |list, t| {
        list.with((*t).to_string(), None, Some(vector_of(t)))
    })
}

#[tokio::test]
async fn of_without_a_cutoff_embeds_nothing() {
    let f = fake(vec![]).await;
    let c = candidate("quando piove forte", "chiudi la finestra");
    let twins = Twins::of(
        &f.embedder,
        &[&c],
        &listed(&["SE quando piove forte ALLORA chiudi la finestra"]),
        None,
    )
    .await
    .unwrap();
    assert_eq!((twins.vector(0), twins.ruling(0)), (None, None));
    assert!(f.world.lock().unwrap().embedded.is_empty());
}

#[tokio::test]
async fn of_marks_a_paraphrase_of_the_list_as_a_duplicate() {
    let f = fake(vec![]).await;
    let same = candidate("quando piove forte", "chiudi la finestra");
    let other = candidate("se il treno tarda", "avvisa il capo");
    let list = listed(&["SE quando piove forte ALLORA chiudi la finestra"]);
    let twins = Twins::of(&f.embedder, &[&same, &other], &list, Some(0.75))
        .await
        .unwrap();
    let first = twins.ruling(0).unwrap();
    assert_eq!(
        (first.verdict(), first.of()),
        (Verdict::Duplicate, Some("session:0"))
    );
    assert_eq!(twins.ruling(1), None);
    assert_eq!(
        twins.vector(1),
        Some(vector_of(&saved_text(&other)).as_slice())
    );
}

#[tokio::test]
async fn of_with_an_empty_list_still_gives_the_vectors() {
    let f = fake(vec![]).await;
    let c = candidate("quando piove forte", "chiudi la finestra");
    let twins = Twins::of(&f.embedder, &[&c], &SessionList::empty(), Some(0.75))
        .await
        .unwrap();
    assert!(twins.vector(0).is_some());
    assert_eq!(twins.ruling(0), None);
}

#[tokio::test]
async fn of_returns_the_embed_error() {
    let f = fake(vec![]).await;
    f.world.lock().unwrap().down.insert("embed");
    let c = candidate("quando piove forte", "chiudi la finestra");
    assert!(
        Twins::of(&f.embedder, &[&c], &SessionList::empty(), Some(0.75))
            .await
            .is_err()
    );
}

#[tokio::test]
#[should_panic(expected = "Twins.of: the cutoff is above 0 and at most 1")]
async fn of_rejects_a_cutoff_above_one() {
    let f = fake(vec![]).await;
    let _ = Twins::of(&f.embedder, &[], &SessionList::empty(), Some(1.5)).await;
}
