use jiff::Timestamp;

use super::novelty::Ruling;
use super::record::Verdict;
use super::rule::RuleCandidate;
use crate::rules::store::Rules;

pub const CAP_FAILURE: &str = "cap: max saved reached";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Mode {
    Shadow,
    Active,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Action {
    AddRule,
    AppendDo,
    Nothing,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Budget {
    max: Option<u32>,
    spent: u32,
}

impl Budget {
    pub fn of(max: Option<u32>) -> Budget {
        debug_assert!(
            max.is_none_or(|m| m > 0),
            "Budget.of: max is none or above 0"
        );
        Budget { max, spent: 0 }
    }

    pub fn take(self) -> (Budget, bool) {
        let taken = !self.is_spent();
        let result: (Budget, bool) = (
            Budget {
                max: self.max,
                spent: self.spent + u32::from(taken),
            },
            taken,
        );
        debug_assert!(
            result.0.spent == self.spent + u32::from(result.1),
            "Budget.take: one is spent only when taken"
        );
        debug_assert!(
            result.0.max.is_none_or(|m| result.0.spent <= m),
            "Budget.take: never past the max"
        );
        result
    }

    pub fn spent(self) -> u32 {
        self.spent
    }

    pub fn is_spent(self) -> bool {
        self.max.is_some_and(|m| self.spent >= m)
    }
}

pub fn action_of(verdict: Verdict) -> Action {
    let result: Action = match verdict {
        Verdict::New => Action::AddRule,
        Verdict::Append => Action::AppendDo,
        Verdict::Duplicate => Action::Nothing,
    };
    debug_assert!(
        (result == Action::Nothing) == (verdict == Verdict::Duplicate),
        "action_of: only a duplicate does nothing"
    );
    result
}

pub async fn save_rule(
    rules: &Rules,
    candidate: &RuleCandidate,
    ruling: &Ruling,
    exchange_id: &str,
    now: Timestamp,
) -> Result<Option<String>, String> {
    debug_assert!(
        crate::hist::validate::is_id(exchange_id),
        "save_rule: exchange_id is an exchange id"
    );
    debug_assert!(
        action_of(ruling.verdict()) != Action::Nothing,
        "save_rule: the ruling writes"
    );
    debug_assert!(
        ruling.verdict() != Verdict::Append || ruling.of().is_some(),
        "save_rule: an append names its of"
    );
    let result: Result<Option<String>, String> = match action_of(ruling.verdict()) {
        Action::Nothing => unreachable!("save_rule: the ruling writes"),
        Action::AddRule => {
            let tags = [
                candidate.tags.as_slice(),
                candidate.proposed_tags.as_slice(),
            ]
            .concat();
            let exchange = Some(exchange_id.to_string());
            match rules
                .add(&candidate.if_, &candidate.do_, tags, exchange, now)
                .await
            {
                Err(f) => Err(f.to_string()),
                Ok(added) => match rules.get(&added.id).await {
                    Ok(reread) if reread.body.do_ == [candidate.do_.as_str()] => Ok(Some(added.id)),
                    Ok(_) | Err(crate::rules::RulesError::NoRule(_)) => Err(format!(
                        "save_rule: the rule is not in the store, id={}",
                        added.id
                    )),
                    Err(f) => Err(f.to_string()),
                },
            }
        }
        Action::AppendDo if is_session_append(ruling) => Ok(None),
        Action::AppendDo => {
            let of = ruling.of().expect("save_rule: an append names its of");
            let do_ = ruling.do_().expect("save_rule: an append carries a do");
            match rules.append_do(of, do_).await {
                Err(f) => Err(f.to_string()),
                Ok(_) => match rules.get(of).await {
                    Ok(reread) if reread.body.do_.last().is_some_and(|d| d == do_) => {
                        Ok(Some(of.to_string()))
                    }
                    Ok(_) | Err(crate::rules::RulesError::NoRule(_)) => {
                        Err(format!("save_rule: the do is not in the store, id={of}"))
                    }
                    Err(f) => Err(f.to_string()),
                },
            }
        }
    };
    debug_assert!(
        result
            .as_ref()
            .map_or(true, |id| id.is_none() == is_session_append(ruling)),
        "save_rule: no id exactly when it skips a session item"
    );
    debug_assert!(
        result.as_ref().err().is_none_or(|f| !f.trim().is_empty()),
        "save_rule: a failure is not blank"
    );
    result
}

fn is_session_append(ruling: &Ruling) -> bool {
    ruling.verdict() == Verdict::Append && ruling.of().is_some_and(|of| of.starts_with("session:"))
}
