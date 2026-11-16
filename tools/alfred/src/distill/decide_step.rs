use jiff::Timestamp;

use super::ask::Answer;
use super::decide::{Carry, Tools, known_for, neighbours_of};
use super::novelty::{Judged, Ruling, saved_text};
use super::record::{Outcome, Verdict};
use super::rule::RuleCandidate;
use super::save::{Action, CAP_FAILURE, Mode, action_of, save_rule};
use super::twin::{Known, SessionList, Twins};

pub(super) struct Judgement {
    pub(super) answer: Option<Answer>,
    pub(super) rulings: Vec<Ruling>,
    pub(super) vectors: Vec<Option<Vec<f32>>>,
}

pub(super) struct Step<'a> {
    pub(super) exchange_id: &'a str,
    pub(super) judgeables: &'a [usize],
    pub(super) candidates: &'a [&'a RuleCandidate],
    pub(super) now: Timestamp,
}

pub(super) struct Applied {
    pub(super) outcomes: Vec<Outcome>,
    pub(super) failures: Vec<String>,
    pub(super) carry: Carry,
}

pub(super) async fn judge(
    tools: &Tools<'_>,
    candidates: &[&RuleCandidate],
    list: &SessionList,
) -> Result<Judgement, String> {
    let result: Result<Judgement, String> = async {
        let twins = Twins::of(tools.embedder, candidates, list, tools.cutoff)
            .await
            .map_err(|e| format!("twins: {e}"))?;
        let rest: Vec<usize> = (0..candidates.len())
            .filter(|&at| twins.ruling(at).is_none())
            .collect();
        let mut neighbours: Vec<Known> = Vec::new();
        for &at in &rest {
            let found = neighbours_of(tools.rules, candidates[at], tools.extractor.config().top_k)
                .await
                .map_err(|e| format!("neighbours: {e}"))?;
            neighbours.extend(found);
        }
        let known = known_for(neighbours, list);
        let asked: Vec<&RuleCandidate> = rest.iter().map(|&at| candidates[at]).collect();
        let judged = Judged::of(tools.chat, &asked, &known, tools.extractor).await;
        let ruling_at = |at: usize| {
            twins.ruling(at).cloned().unwrap_or_else(|| {
                let k = rest
                    .iter()
                    .position(|&r| r == at)
                    .expect("judge: a non twin was asked");
                judged.rulings()[k].clone()
            })
        };
        match judged.answer().and_then(Answer::failure) {
            Some(failure) => Err(format!("novelty: {failure}")),
            None => Ok(Judgement {
                answer: judged.answer().cloned(),
                rulings: (0..candidates.len()).map(ruling_at).collect(),
                vectors: (0..candidates.len())
                    .map(|at| twins.vector(at).map(<[f32]>::to_vec))
                    .collect(),
            }),
        }
    }
    .await;
    debug_assert!(
        result
            .as_ref()
            .map_or(true, |j| j.rulings.len() == candidates.len()),
        "judge: one ruling per candidate"
    );
    result
}

pub(super) async fn apply(
    tools: &Tools<'_>,
    step: &Step<'_>,
    judged: &Judgement,
    outcomes: Vec<Outcome>,
    carry: Carry,
) -> Applied {
    let mut outcomes = outcomes;
    let mut budget = carry.budget;
    let mut list = carry.list;
    let mut failures: Vec<String> = Vec::new();
    for (k, &at) in step.judgeables.iter().enumerate() {
        let ruling = &judged.rulings[k];
        let decided = outcomes[at]
            .clone()
            .decided(ruling.verdict(), ruling.of().map(str::to_string));
        let writes = tools.mode == Mode::Active && action_of(ruling.verdict()) != Action::Nothing;
        let (next, taken) = if writes {
            budget.take()
        } else {
            (budget, false)
        };
        budget = next;
        let saved = if taken {
            save_rule(
                tools.rules,
                step.candidates[k],
                ruling,
                step.exchange_id,
                step.now,
            )
            .await
        } else {
            Ok(None)
        };
        let capped = writes && !taken && !failures.iter().any(|f| f == CAP_FAILURE);
        failures.extend(capped.then(|| CAP_FAILURE.to_string()));
        failures.extend(saved.as_ref().err().map(|e| format!("save: {e}")));
        let id = saved.ok().flatten();
        outcomes[at] = id.clone().map_or(decided.clone(), |id| decided.saved(id));
        if ruling.verdict() == Verdict::New {
            list = list.with(
                saved_text(step.candidates[k]),
                id,
                judged.vectors[k].clone(),
            );
        }
    }
    Applied {
        outcomes,
        failures,
        carry: Carry { list, budget },
    }
}
