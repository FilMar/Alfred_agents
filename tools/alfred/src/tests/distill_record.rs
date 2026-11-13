use crate::distill::critic::Probabilities;
use crate::distill::record::{Outcome, Recorder, Verdict};
use crate::distill::rule::{Checked, Evidence, RuleCandidate, TagVocabulary};
use crate::hist::NewExtraction;

const RUN: &str = "2026-11-13T10:15:30.000Z";
const LATER: &str = "2026-11-13T10:16:00.000Z";
const EXCHANGE: &str = "0b7c4a2e-1f3d-4c5b-9a8e-7d6c5b4a3f21";
const SAVED: &str = "a1b2c3d4-0000-4000-8000-000000000001";
const IF: &str = "quando l'utente chiede un riassunto della sessione";
const DO: &str = "scrivi il riassunto alla fine";
const QUOTE: &str = "fammi un riassunto della sessione";

fn checked(if_: &str) -> Checked {
    let vocabulary = TagVocabulary::of(&["sessione".to_string()]);
    let evidence = Evidence {
        user: "fammi un riassunto della sessione di oggi",
        vocabulary: &vocabulary,
    };
    let candidate = RuleCandidate {
        if_: if_.to_string(),
        do_: DO.to_string(),
        tags: vec!["Sessione".to_string(), "nuovo".to_string()],
        proposed_tags: Vec::new(),
        quote: QUOTE.to_string(),
    };
    candidate.check(&evidence)
}

fn probabilities(a: f64) -> Probabilities {
    serde_json::json!({"a": a})
        .as_object()
        .cloned()
        .unwrap_or_default()
}

fn recorder() -> Recorder {
    Recorder::start(4, RUN.to_string())
}

fn row(outcome: &Outcome) -> NewExtraction {
    recorder()
        .rows(EXCHANGE, std::slice::from_ref(outcome), LATER)
        .remove(0)
}

#[test]
fn name_names_each_verdict() {
    let cases = [
        (Verdict::New, "new"),
        (Verdict::Duplicate, "duplicate"),
        (Verdict::Append, "append"),
    ];
    for (verdict, name) in cases {
        assert_eq!(verdict.name(), name);
    }
}

#[test]
#[should_panic(expected = "Recorder.start: extractor_id is a row id")]
fn start_rejects_extractor_id_zero() {
    Recorder::start(0, RUN.to_string());
}

#[test]
#[should_panic(expected = "Recorder.start: the run is an ISO-8601 UTC time")]
fn start_rejects_a_run_that_is_not_a_timestamp() {
    Recorder::start(1, "2026-11-13T10:15:30Z".to_string());
}

#[test]
#[should_panic(expected = "Recorder.rows: exchange_id is an exchange id")]
fn rows_rejects_an_exchange_id_that_is_not_one() {
    recorder().rows("e1", &[], LATER);
}

#[test]
#[should_panic(expected = "Recorder.rows: created is an ISO-8601 UTC time")]
fn rows_rejects_a_created_that_is_not_a_timestamp() {
    recorder().rows(EXCHANGE, &[], "");
}

#[test]
fn rows_map_each_step_of_an_outcome() {
    let body = r#"{"if":"quando l'utente chiede un riassunto della sessione","do":"scrivi il riassunto alla fine","tags":["sessione"],"proposedTags":["nuovo"],"quote":"fammi un riassunto della sessione"}"#;
    let base = NewExtraction {
        extractor_id: 4,
        run: RUN.to_string(),
        exchange_id: EXCHANGE.to_string(),
        kind: "rule".to_string(),
        body: body.to_string(),
        quote: QUOTE.to_string(),
        dropped_by: None,
        probabilities: None,
        verdict: None,
        of: None,
        saved_id: None,
        created: LATER.to_string(),
    };
    let open = Outcome::of(&checked(IF));
    let saved = open
        .clone()
        .judged(probabilities(0.25), None)
        .decided(Verdict::Append, Some(SAVED.to_string()))
        .saved(SAVED.to_string());
    let cases = [
        (open.clone(), base.clone()),
        (
            open.clone().judged(probabilities(0.75), Some("a")),
            NewExtraction {
                dropped_by: Some("critic:a".into()),
                probabilities: Some(r#"{"a":0.75}"#.into()),
                ..base.clone()
            },
        ),
        (
            saved,
            NewExtraction {
                probabilities: Some(r#"{"a":0.25}"#.into()),
                verdict: Some("append".into()),
                of: Some(SAVED.into()),
                saved_id: Some(SAVED.into()),
                ..base.clone()
            },
        ),
    ];
    for (outcome, want) in cases {
        assert_eq!(row(&outcome), want);
    }
    let dropped = row(&Outcome::of(&checked("  ")));
    assert_eq!(dropped.dropped_by.as_deref(), Some("check:empty"));
    assert_eq!(
        dropped.body,
        body.replace(IF, "  ").replace(
            r#""tags":["sessione"],"proposedTags":["nuovo"]"#,
            r#""tags":["Sessione","nuovo"],"proposedTags":[]"#
        )
    );
}

#[test]
#[should_panic(expected = "Outcome.judged: only an open candidate is judged")]
fn judged_rejects_a_dropped_candidate() {
    Outcome::of(&checked("  ")).judged(probabilities(0.5), None);
}

#[test]
#[should_panic(expected = "Outcome.judged: a candidate is judged once")]
fn judged_rejects_a_second_judgement() {
    Outcome::of(&checked(IF))
        .judged(probabilities(0.5), None)
        .judged(probabilities(0.5), None);
}

#[test]
#[should_panic(expected = "Outcome.judged: the drop names a judged check")]
fn judged_rejects_a_drop_of_no_check() {
    Outcome::of(&checked(IF)).judged(probabilities(0.5), Some("b"));
}

#[test]
#[should_panic(expected = "Outcome.decided: only an open candidate gets a verdict")]
fn decided_rejects_a_dropped_candidate() {
    Outcome::of(&checked("  ")).decided(Verdict::New, None);
}

#[test]
#[should_panic(expected = "Outcome.decided: a candidate gets one verdict")]
fn decided_rejects_a_second_verdict() {
    Outcome::of(&checked(IF))
        .decided(Verdict::New, None)
        .decided(Verdict::New, None);
}

#[test]
#[should_panic(expected = "Outcome.decided: of is none or not blank")]
fn decided_rejects_a_blank_of() {
    Outcome::of(&checked(IF)).decided(Verdict::Append, Some(" ".into()));
}

#[test]
#[should_panic(expected = "Outcome.saved: only a candidate with a verdict is saved")]
fn saved_rejects_a_candidate_without_verdict() {
    Outcome::of(&checked(IF)).saved(SAVED.to_string());
}

#[test]
#[should_panic(expected = "Outcome.saved: a candidate is saved once")]
fn saved_rejects_a_second_save() {
    Outcome::of(&checked(IF))
        .decided(Verdict::New, None)
        .saved(SAVED.into())
        .saved(SAVED.into());
}

#[test]
#[should_panic(expected = "Outcome.saved: the id is not blank")]
fn saved_rejects_a_blank_id() {
    Outcome::of(&checked(IF))
        .decided(Verdict::New, None)
        .saved(" ".into());
}

#[test]
fn write_puts_one_row_per_outcome() {
    use crate::tests::hist_db::{SID1, T1, XID1, db, extractor_row, write_exchange, write_session};
    let db = db("distill_record_write");
    write_session(&db, SID1, T1);
    write_exchange(&db, XID1, SID1, T1, "chat");
    let id = db.insert_extractor(&extractor_row("record")).unwrap();
    let recorder = Recorder::start(id, RUN.to_string());
    let outcomes = [Outcome::of(&checked(IF)), Outcome::of(&checked("  "))];
    recorder.write(&db, XID1, &outcomes, LATER).unwrap();
    recorder.write(&db, XID1, &[], LATER).unwrap();
    let rows = db
        .list_extractions(&crate::hist::ExtractionQuery::default())
        .unwrap();
    assert_eq!(rows.len(), 2);
}
