use super::critic::Probabilities;
use super::rule::Checked;
use crate::hist::db::HistDb;
use crate::hist::validate::{is_id, is_timestamp};
use crate::hist::{HistError, NewExtraction};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Verdict {
    New,
    Duplicate,
    Append,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Outcome {
    body: String,
    quote: String,
    dropped_by: Option<String>,
    probabilities: Option<Probabilities>,
    verdict: Option<Verdict>,
    of: Option<String>,
    saved_id: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Recorder {
    extractor_id: i64,
    run: String,
}

impl Verdict {
    pub fn name(self) -> &'static str {
        match self {
            Verdict::New => "new",
            Verdict::Duplicate => "duplicate",
            Verdict::Append => "append",
        }
    }
}

impl Outcome {
    pub fn of(checked: &Checked) -> Outcome {
        let result: Outcome = Outcome {
            body: serde_json::to_string(checked.candidate())
                .expect("Outcome.of: the candidate serializes"),
            quote: checked.candidate().quote.clone(),
            dropped_by: checked.drop().map(|d| format!("check:{}", d.name())),
            probabilities: None,
            verdict: None,
            of: None,
            saved_id: None,
        };
        debug_assert!(
            result.is_open() == checked.is_kept(),
            "Outcome.of: open exactly when the checks kept the rule"
        );
        result
    }

    pub fn judged(self, probabilities: Probabilities, drop: Option<&str>) -> Outcome {
        debug_assert!(
            self.is_open(),
            "Outcome.judged: only an open candidate is judged"
        );
        debug_assert!(
            self.probabilities.is_none(),
            "Outcome.judged: a candidate is judged once"
        );
        debug_assert!(
            drop.is_none_or(|d| probabilities.contains_key(d)),
            "Outcome.judged: the drop names a judged check"
        );
        let result: Outcome = Outcome {
            probabilities: Some(probabilities),
            dropped_by: drop.map(|d| format!("critic:{d}")),
            ..self
        };
        debug_assert!(
            result.is_open() == drop.is_none(),
            "Outcome.judged: a critic drop closes the candidate"
        );
        result
    }

    pub fn decided(self, verdict: Verdict, of: Option<String>) -> Outcome {
        debug_assert!(
            self.is_open(),
            "Outcome.decided: only an open candidate gets a verdict"
        );
        debug_assert!(
            self.verdict.is_none(),
            "Outcome.decided: a candidate gets one verdict"
        );
        debug_assert!(
            of.as_deref().is_none_or(|o| !o.trim().is_empty()),
            "Outcome.decided: of is none or not blank"
        );
        Outcome {
            verdict: Some(verdict),
            of,
            ..self
        }
    }

    pub fn saved(self, id: String) -> Outcome {
        debug_assert!(
            self.verdict.is_some(),
            "Outcome.saved: only a candidate with a verdict is saved"
        );
        debug_assert!(
            self.saved_id.is_none(),
            "Outcome.saved: a candidate is saved once"
        );
        debug_assert!(!id.trim().is_empty(), "Outcome.saved: the id is not blank");
        Outcome {
            saved_id: Some(id),
            ..self
        }
    }

    pub fn is_open(&self) -> bool {
        self.dropped_by.is_none()
    }

    pub fn is_judged(&self) -> bool {
        self.probabilities.is_some()
    }

    pub fn verdict(&self) -> Option<Verdict> {
        self.verdict
    }

    pub fn saved_id(&self) -> Option<&str> {
        self.saved_id.as_deref()
    }

    fn row(&self, recorder: &Recorder, exchange_id: &str, created: &str) -> NewExtraction {
        let result: NewExtraction = NewExtraction {
            extractor_id: recorder.extractor_id(),
            run: recorder.run().to_string(),
            exchange_id: exchange_id.to_string(),
            kind: "rule".to_string(),
            body: self.body.clone(),
            quote: self.quote.clone(),
            dropped_by: self.dropped_by.clone(),
            probabilities: self
                .probabilities
                .as_ref()
                .map(|p| serde_json::to_string(p).expect("Outcome.row: probabilities serialize")),
            verdict: self.verdict.map(|v| v.name().to_string()),
            of: self.of.clone(),
            saved_id: self.saved_id.clone(),
            created: created.to_string(),
        };
        debug_assert!(
            passes_tl(&result),
            "Outcome.row: the row passes the tl checks"
        );
        result
    }
}

impl Recorder {
    pub fn start(extractor_id: i64, run: String) -> Recorder {
        debug_assert!(extractor_id > 0, "Recorder.start: extractor_id is a row id");
        debug_assert!(
            is_timestamp(&run),
            "Recorder.start: the run is an ISO-8601 UTC time"
        );
        Recorder { extractor_id, run }
    }

    pub fn run(&self) -> &str {
        &self.run
    }

    pub fn extractor_id(&self) -> i64 {
        self.extractor_id
    }

    pub fn rows(
        &self,
        exchange_id: &str,
        outcomes: &[Outcome],
        created: &str,
    ) -> Vec<NewExtraction> {
        debug_assert!(
            is_id(exchange_id),
            "Recorder.rows: exchange_id is an exchange id"
        );
        debug_assert!(
            is_timestamp(created),
            "Recorder.rows: created is an ISO-8601 UTC time"
        );
        let result: Vec<NewExtraction> = outcomes
            .iter()
            .map(|o| o.row(self, exchange_id, created))
            .collect();
        result
    }

    pub fn write(
        &self,
        db: &HistDb,
        exchange_id: &str,
        outcomes: &[Outcome],
        created: &str,
    ) -> Result<(), HistError> {
        let result: Result<(), HistError> = match self.rows(exchange_id, outcomes, created) {
            rows if rows.is_empty() => Ok(()),
            rows => db.insert_extractions(&rows).map(|_| ()),
        };
        result
    }
}

fn passes_tl(row: &NewExtraction) -> bool {
    serde_json::to_value(row).is_ok_and(|v| crate::hist::validate::new_extraction(&v).is_none())
}
