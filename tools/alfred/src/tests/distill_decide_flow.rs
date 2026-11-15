use crate::distill::config::Extractor;
use crate::distill::decide::{Carry, Decision, decide};
use crate::distill::record::{Outcome, Verdict};
use crate::distill::rule::Checked;
use crate::distill::save::{Budget, CAP_FAILURE, Mode};
use crate::distill::twin::SessionList;
use crate::tests::distill_fake::{
    EXCHANGE, Fake, carry, checked, extractor, fake, judged, seed, tools, vector_of,
};

const OLD: &str = "11111111-1111-4111-8111-111111111111";
const RAIN: (&str, &str) = ("quando piove forte fuori", "chiudi la finestra");
const TRAIN: (&str, &str) = ("quando il treno tarda molto", "avvisa il capo");
const SNOW: (&str, &str) = ("quando nevica sulla strada", "metti le catene");

async fn run(
    f: &Fake,
    mode: Mode,
    cutoff: Option<f32>,
    rules: &[Checked],
    carry: Carry,
) -> Decision {
    let ex: Extractor = extractor(3);
    let tools = tools(f, &ex, mode, cutoff);
    let outcomes: Vec<Outcome> = rules.iter().map(|c| judged(c, 0.1)).collect();
    decide(
        &tools,
        EXCHANGE,
        rules,
        outcomes,
        carry,
        jiff::Timestamp::now(),
    )
    .await
}

fn verdicts(d: &Decision) -> Vec<Option<Verdict>> {
    d.outcomes().iter().map(Outcome::verdict).collect()
}

#[tokio::test]
async fn a_new_rule_is_saved_read_back_and_listed() {
    let f = fake(vec![r#"{"verdicts":[{"cand":0,"verdict":"new"}]}"#]).await;
    let d = run(
        &f,
        Mode::Active,
        Some(0.75),
        &[checked(RAIN.0, RAIN.1)],
        carry(None),
    )
    .await;
    assert_eq!(d.failures(), &[] as &[String]);
    let id = d.outcomes()[0].saved_id().unwrap().to_string();
    assert!(f.world.lock().unwrap().points.contains_key(&id));
    let carry = d.into_carry();
    assert_eq!(carry.budget.spent(), 1);
    assert_eq!(carry.list.items()[0].key(), id);
}

#[tokio::test]
async fn shadow_judges_but_writes_nothing() {
    let f = fake(vec![r#"{"verdicts":[{"cand":0,"verdict":"new"}]}"#]).await;
    let d = run(
        &f,
        Mode::Shadow,
        None,
        &[checked(RAIN.0, RAIN.1)],
        carry(Some(1)),
    )
    .await;
    assert_eq!(verdicts(&d), [Some(Verdict::New)]);
    assert!(f.world.lock().unwrap().points.is_empty());
    let carry = d.into_carry();
    assert_eq!(
        (carry.budget.spent(), carry.list.items()[0].key()),
        (0, "session:0")
    );
}

#[tokio::test]
async fn a_twin_of_the_session_skips_the_judge() {
    let f = fake(vec![]).await;
    let text = format!("SE {} ALLORA {}", RAIN.0, RAIN.1);
    let list = SessionList::default().with(text.clone(), None, Some(vector_of(&text)));
    let d = run(
        &f,
        Mode::Active,
        Some(0.75),
        &[checked(RAIN.0, RAIN.1)],
        Carry {
            list,
            budget: Budget::of(None),
        },
    )
    .await;
    assert_eq!(verdicts(&d), [Some(Verdict::Duplicate)]);
    assert!(f.world.lock().unwrap().prompts.is_empty());
}

#[tokio::test]
async fn an_append_adds_a_do_to_the_neighbour_without_counting_a_hit() {
    let f = fake(vec![
        r#"{"verdicts":[{"cand":0,"verdict":"append","of":0,"do":"spegni la luce"}]}"#,
    ])
    .await;
    seed(&f.world, OLD, RAIN.0, &[RAIN.1]);
    let d = run(
        &f,
        Mode::Active,
        None,
        &[checked(RAIN.0, RAIN.1)],
        carry(None),
    )
    .await;
    assert_eq!(d.outcomes()[0].saved_id(), Some(OLD));
    let world = f.world.lock().unwrap();
    assert_eq!(
        world.points[OLD].1["do"],
        serde_json::json!([RAIN.1, "spegni la luce"])
    );
    assert!(world.points[OLD].1.get("hits").is_none());
}

#[tokio::test]
async fn a_spent_budget_says_cap_once() {
    let f = fake(vec![r#"{"verdicts":[{"cand":0,"verdict":"new"},{"cand":1,"verdict":"new"},{"cand":2,"verdict":"new"}]}"#]).await;
    let rules = [
        checked(RAIN.0, RAIN.1),
        checked(TRAIN.0, TRAIN.1),
        checked(SNOW.0, SNOW.1),
    ];
    let d = run(&f, Mode::Active, None, &rules, carry(Some(1))).await;
    assert_eq!(d.failures(), [CAP_FAILURE.to_string()]);
    assert_eq!(f.world.lock().unwrap().points.len(), 1);
}

#[tokio::test]
async fn a_failed_search_stops_before_the_judge() {
    let f = fake(vec![]).await;
    f.world.lock().unwrap().down.insert("query");
    let d = run(
        &f,
        Mode::Active,
        None,
        &[checked(RAIN.0, RAIN.1)],
        carry(None),
    )
    .await;
    assert!(d.failures()[0].starts_with("neighbours: "));
    assert_eq!(verdicts(&d), [None]);
}

#[tokio::test]
async fn a_failed_answer_is_a_novelty_failure() {
    let f = fake(vec!["nope", "nope"]).await;
    let d = run(
        &f,
        Mode::Active,
        None,
        &[checked(RAIN.0, RAIN.1)],
        carry(None),
    )
    .await;
    assert!(d.failures()[0].starts_with("novelty: "));
    assert!(d.rulings().is_empty());
}

#[tokio::test]
async fn an_open_outcome_without_probabilities_is_a_critic_failure() {
    let f = fake(vec![]).await;
    let ex = extractor(3);
    let tools = tools(&f, &ex, Mode::Active, None);
    let rules = [checked(RAIN.0, RAIN.1)];
    let d = decide(
        &tools,
        EXCHANGE,
        &rules,
        vec![Outcome::of(&rules[0])],
        carry(None),
        jiff::Timestamp::now(),
    )
    .await;
    assert_eq!(d.failures(), ["critic failed".to_string()]);
}

#[tokio::test]
async fn a_duplicate_of_a_neighbour_stays_out_of_the_list() {
    let f = fake(vec![
        r#"{"verdicts":[{"cand":0,"verdict":"duplicate","of":0}]}"#,
    ])
    .await;
    seed(&f.world, OLD, RAIN.0, &[RAIN.1]);
    let d = run(
        &f,
        Mode::Active,
        None,
        &[checked(RAIN.0, RAIN.1)],
        carry(None),
    )
    .await;
    assert_eq!(verdicts(&d), [Some(Verdict::Duplicate)]);
    assert!(d.into_carry().list.items().is_empty());
}

#[tokio::test]
async fn a_rule_read_back_with_another_do_is_a_save_failure() {
    let f = fake(vec![r#"{"verdicts":[{"cand":0,"verdict":"new"}]}"#]).await;
    f.world.lock().unwrap().down.insert("garble");
    let d = run(
        &f,
        Mode::Active,
        None,
        &[checked(RAIN.0, RAIN.1)],
        carry(None),
    )
    .await;
    assert!(d.failures()[0].starts_with("save: save_rule: the rule is not in the store"));
    assert_eq!(d.outcomes()[0].saved_id(), None);
}
