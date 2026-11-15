use jiff::Timestamp;

use crate::distill::run::{Options, RunError, RunReport};
use crate::distill::runner::Runner;
use crate::distill::trigger::Trigger;
use crate::hist::{ExtractionQuery, NewExtractor};
use crate::serve::Shared;
use crate::tests::distill_bench::{
    Bench, CRITIC_KEEPS, NO_RULES, NOVELTY_NEW, USER, bench, distilled, one_rule, seed_session,
    split, tag_rule, ts, uuid,
};

const TAGGED: &str = "22222222-2222-4222-8222-222222222222";

fn options(b: &Bench, active: bool) -> Options {
    Options {
        extractor: Some(b.extractor),
        active,
        ..Options::trigger()
    }
}

fn now() -> Timestamp {
    ts(3600).parse().unwrap()
}

async fn finish(app: &Shared) -> RunReport {
    for _ in 0..200 {
        let status = app.runner.status();
        if let (None, Some(last)) = (status.running, status.last) {
            tokio::time::sleep(std::time::Duration::from_millis(20)).await;
            return last;
        }
        tokio::time::sleep(std::time::Duration::from_millis(20)).await;
    }
    panic!("finish: the run did not end");
}

async fn rainy(replies: Vec<&str>, trigger: Option<Trigger>) -> Bench {
    let b = bench(replies, trigger).await;
    tag_rule(&b.world, TAGGED);
    seed_session(&b.app, 1, &[(10, 10, USER, false)]);
    b
}

fn saving() -> Vec<String> {
    vec![
        split(0),
        one_rule(),
        CRITIC_KEEPS.to_string(),
        NOVELTY_NEW.to_string(),
    ]
}

async fn run(b: &Bench, active: bool) -> RunReport {
    Runner::start(b.app.clone(), &options(b, active), now())
        .await
        .unwrap();
    finish(&b.app).await
}

#[tokio::test]
async fn shadow_records_the_rows_and_writes_nothing_else() {
    let replies = saving();
    let b = rainy(replies.iter().map(String::as_str).collect(), None).await;
    let report = run(&b, false).await;
    let rows = b
        .app
        .hist
        .list_extractions(&ExtractionQuery {
            run: Some(report.run.clone()),
            ..ExtractionQuery::default()
        })
        .unwrap();
    let world = b.world.lock().unwrap();
    assert_eq!((report.sessions.len(), report.saved, rows.len()), (1, 0, 1));
    assert_eq!((world.points.len(), world.episodes.len()), (1, 0));
    assert_eq!(distilled(&b.app, 10), None);
}

#[tokio::test]
async fn active_saves_the_rule_writes_the_episodes_and_closes() {
    let replies = saving();
    let b = rainy(replies.iter().map(String::as_str).collect(), None).await;
    let report = run(&b, true).await;
    let world = b.world.lock().unwrap();
    assert_eq!((report.saved, report.sessions[0].closed), (1, 1));
    assert_eq!((world.points.len(), world.episodes.len()), (2, 1));
    assert_eq!(distilled(&b.app, 10), Some(report.run.clone()));
    assert!(report.failed.is_empty());
}

#[tokio::test]
async fn a_failed_split_keeps_the_session_pending_and_failed() {
    let b = rainy(vec!["not json", "still not json"], None).await;
    let report = run(&b, true).await;
    assert_eq!(report.sessions[0].split, "failed");
    assert!(report.sessions[0].exchanges.is_empty());
    assert!(report.failed.contains(&uuid(1)));
    assert_eq!(distilled(&b.app, 10), None);
}

#[tokio::test]
async fn only_the_pending_turns_are_distilled() {
    let b = bench(vec![&split(1), NO_RULES], None).await;
    tag_rule(&b.world, TAGGED);
    seed_session(
        &b.app,
        1,
        &[(10, 10, "prima domanda", true), (11, 20, USER, false)],
    );
    let report = run(&b, true).await;
    let exchanges: Vec<&str> = report.sessions[0]
        .exchanges
        .iter()
        .map(|e| e.exchange.as_str())
        .collect();
    assert_eq!(exchanges, vec![uuid(11).as_str()]);
    assert_eq!(distilled(&b.app, 11), Some(report.run.clone()));
}

#[tokio::test]
async fn the_run_stops_between_sessions_when_the_budget_is_spent() {
    let replies = saving();
    let b = rainy(replies.iter().map(String::as_str).collect(), None).await;
    seed_session(&b.app, 2, &[(20, 30, USER, false)]);
    let options = Options {
        max_saved: Some(1),
        ..options(&b, true)
    };
    Runner::start(b.app.clone(), &options, now()).await.unwrap();
    let report = finish(&b.app).await;
    assert_eq!((report.saved, report.sessions.len()), (1, 1));
    assert_eq!(distilled(&b.app, 20), None);
}

#[tokio::test]
async fn a_second_start_while_running_is_busy() {
    let replies = saving();
    let b = rainy(replies.iter().map(String::as_str).collect(), None).await;
    b.world.lock().unwrap().down.insert("slow");
    Runner::start(b.app.clone(), &options(&b, false), now())
        .await
        .unwrap();
    let second = Runner::start(b.app.clone(), &options(&b, false), now()).await;
    assert_eq!(second, Err(RunError::Busy));
    finish(&b.app).await;
}

#[tokio::test]
async fn a_started_run_shows_in_the_status_then_in_last() {
    let replies = saving();
    let b = rainy(replies.iter().map(String::as_str).collect(), None).await;
    let progress = Runner::start(b.app.clone(), &options(&b, false), now())
        .await
        .unwrap();
    let report = finish(&b.app).await;
    assert_eq!(report.run, progress.run);
    assert_eq!(progress.sessions, 1);
}

#[tokio::test]
async fn start_refuses_a_bad_cutoff() {
    let b = rainy(Vec::new(), None).await;
    let options = Options {
        same_session_cutoff: Some(1.5),
        ..options(&b, false)
    };
    let started = Runner::start(b.app.clone(), &options, now()).await;
    assert!(matches!(started, Err(RunError::BadInput(_))));
}

#[tokio::test]
async fn start_refuses_a_missing_row() {
    let b = rainy(Vec::new(), None).await;
    let options = Options {
        extractor: Some(999),
        ..options(&b, false)
    };
    let started = Runner::start(b.app.clone(), &options, now()).await;
    assert!(matches!(started, Err(RunError::NotFound(_))));
}

#[tokio::test]
async fn start_refuses_a_row_of_the_old_shape() {
    let b = rainy(Vec::new(), None).await;
    let old = b
        .app
        .hist
        .insert_extractor(&NewExtractor {
            parent: None,
            why: "row 3".to_string(),
            config: r#"{"episodes": {"thinking": "low"}}"#.to_string(),
            created: ts(0),
        })
        .unwrap();
    let options = Options {
        extractor: Some(old),
        ..options(&b, false)
    };
    let started = Runner::start(b.app.clone(), &options, now()).await;
    assert!(matches!(started, Err(RunError::BadInput(_))));
}

#[tokio::test]
async fn start_refuses_an_empty_vocabulary() {
    let b = bench(Vec::new(), None).await;
    seed_session(&b.app, 1, &[(10, 10, USER, false)]);
    let started = Runner::start(b.app.clone(), &options(&b, false), now()).await;
    assert!(matches!(started, Err(RunError::BadInput(_))));
}

#[tokio::test]
async fn no_trigger_no_run() {
    let b = rainy(Vec::new(), None).await;
    assert!(Runner::on_ingest(b.app.clone(), now()).await.is_none());
}

#[tokio::test]
async fn the_trigger_starts_a_run_at_min_pending() {
    let replies = saving();
    let b = rainy(
        replies.iter().map(String::as_str).collect(),
        Some(Trigger::of(1, 24)),
    )
    .await;
    b.app.hist.set_active_extractor(b.extractor).unwrap();
    let started = Runner::on_ingest(b.app.clone(), now()).await;
    assert!(matches!(started, Some(Ok(_))));
    assert_eq!(finish(&b.app).await.saved, 1);
}

#[tokio::test]
async fn the_trigger_waits_below_min_pending_when_young() {
    let b = rainy(Vec::new(), Some(Trigger::of(5, 24))).await;
    assert!(Runner::on_ingest(b.app.clone(), now()).await.is_none());
}

#[tokio::test]
async fn the_trigger_skips_the_sessions_failed_last_time() {
    let b = rainy(vec!["not json", "still not json"], Some(Trigger::of(1, 24))).await;
    Runner::on_ingest(b.app.clone(), now()).await;
    assert!(finish(&b.app).await.failed.contains(&uuid(1)));
    assert!(Runner::on_ingest(b.app.clone(), now()).await.is_none());
}

#[tokio::test]
async fn the_exchange_report_counts_the_saved_rule() {
    let replies = saving();
    let b = rainy(replies.iter().map(String::as_str).collect(), None).await;
    let report = run(&b, true).await;
    let e = &report.sessions[0].exchanges[0];
    assert_eq!(
        (
            e.extraction,
            e.rules,
            e.kept,
            e.passed,
            e.critic_failed,
            e.twins
        ),
        ("ok", 1, 1, 1, 0, 0)
    );
    assert_eq!((e.verdicts.clone(), e.saved.len()), (vec!["new"], 1));
}

#[tokio::test]
async fn a_failed_extraction_is_a_failure_and_keeps_the_session_pending() {
    let b = rainy(vec![&split(0), "not json", "still not json"], None).await;
    let report = run(&b, true).await;
    let e = &report.sessions[0].exchanges[0];
    assert_eq!((e.extraction, e.rules), ("failed", 0));
    assert_eq!(e.failures, vec![format!("extraction failed: {}", uuid(10))]);
    assert_eq!(distilled(&b.app, 10), None);
}

#[tokio::test]
async fn a_failed_critic_is_reported_and_keeps_the_session_pending() {
    let one = one_rule();
    let b = rainy(vec![&split(0), &one, "not json", "still not json"], None).await;
    let report = run(&b, true).await;
    let e = &report.sessions[0].exchanges[0];
    assert_eq!((e.passed, e.critic_failed), (1, 1));
    assert!(
        report.sessions[0]
            .failures
            .contains(&"critic failed".to_string())
    );
    assert_eq!(distilled(&b.app, 10), None);
}

#[tokio::test]
async fn a_failed_episodes_write_keeps_the_session_pending() {
    let replies = saving();
    let b = rainy(replies.iter().map(String::as_str).collect(), None).await;
    b.world.lock().unwrap().down.insert("episodes");
    let report = run(&b, true).await;
    assert!(report.sessions[0].failures[0].starts_with("episodes: "));
    assert_eq!(distilled(&b.app, 10), None);
}

#[tokio::test]
async fn start_takes_the_cutoff_edges() {
    let b = rainy(Vec::new(), None).await;
    let at = |c: Option<f32>| Options {
        same_session_cutoff: c,
        session: Some(uuid(99)),
        ..options(&b, false)
    };
    let zero = Runner::start(b.app.clone(), &at(Some(0.0)), now()).await;
    assert!(matches!(zero, Err(RunError::BadInput(_))));
    for ok in [None, Some(1.0)] {
        Runner::start(b.app.clone(), &at(ok), now()).await.unwrap();
        finish(&b.app).await;
    }
}

#[tokio::test]
async fn a_rule_dropped_by_the_critic_does_not_pass() {
    let one = one_rule();
    let b = rainy(vec![&split(0), &one, r#"{"a": 0.9}"#], None).await;
    let report = run(&b, true).await;
    let e = &report.sessions[0].exchanges[0];
    assert_eq!((e.kept, e.passed, e.saved.len()), (1, 0, 0));
    assert_eq!(distilled(&b.app, 10), Some(report.run.clone()));
}

#[tokio::test]
async fn the_trigger_skips_while_a_run_goes() {
    let replies = saving();
    let b = rainy(
        replies.iter().map(String::as_str).collect(),
        Some(Trigger::of(1, 24)),
    )
    .await;
    b.world.lock().unwrap().down.insert("slow");
    Runner::start(b.app.clone(), &options(&b, false), now())
        .await
        .unwrap();
    assert!(Runner::on_ingest(b.app.clone(), now()).await.is_none());
    finish(&b.app).await;
}
