use std::collections::HashSet;

use jiff::{SignedDuration, Timestamp};

use crate::hist::Exchange;

pub const TRIGGER_ENV: &str = "ALFRED_DISTILL_TRIGGER";
pub const MIN_PENDING_ENV: &str = "ALFRED_DISTILL_MIN_PENDING";
pub const MAX_AGE_ENV: &str = "ALFRED_DISTILL_MAX_AGE_HOURS";
pub const MIN_PENDING: u32 = 50;
pub const MAX_AGE_HOURS: u32 = 24;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Trigger {
    min_pending: u32,
    max_age_hours: u32,
}

impl Trigger {
    pub fn of(min_pending: u32, max_age_hours: u32) -> Trigger {
        debug_assert!(min_pending > 0, "Trigger.of: min_pending is above 0");
        debug_assert!(max_age_hours > 0, "Trigger.of: max_age_hours is above 0");
        Trigger {
            min_pending,
            max_age_hours,
        }
    }

    pub fn from_env() -> Result<Option<Trigger>, String> {
        let var = |name: &str| std::env::var(name).ok();
        parse_env(
            var(TRIGGER_ENV).as_deref(),
            var(MIN_PENDING_ENV).as_deref(),
            var(MAX_AGE_ENV).as_deref(),
        )
    }

    pub fn due(&self, pending: &[Exchange], failed: &HashSet<String>, now: Timestamp) -> bool {
        let counted: Vec<&Exchange> = pending
            .iter()
            .filter(|e| !failed.contains(&e.session))
            .collect();
        let old = counted.iter().any(|e| {
            e.timestamp
                .parse::<Timestamp>()
                .is_ok_and(|at| now.duration_since(at) > self.max_age())
        });
        let result: bool = counted.len() as u64 >= u64::from(self.min_pending) || old;
        debug_assert!(
            !result || !counted.is_empty(),
            "Trigger.due: never due with nothing pending"
        );
        debug_assert!(
            result || (counted.len() as u64) < u64::from(self.min_pending),
            "Trigger.due: due at min_pending exchanges"
        );
        result
    }

    pub fn max_age(&self) -> SignedDuration {
        SignedDuration::from_hours(i64::from(self.max_age_hours))
    }
}

pub fn parse_env(
    on: Option<&str>,
    min_pending: Option<&str>,
    max_age_hours: Option<&str>,
) -> Result<Option<Trigger>, String> {
    let number = |name: &str, value: Option<&str>, default: u32| match value {
        None => Ok(default),
        Some(text) => text
            .trim()
            .parse::<u32>()
            .ok()
            .filter(|n| *n > 0)
            .ok_or_else(|| format!("{name} must be a positive integer, got {text}")),
    };
    let result: Result<Option<Trigger>, String> = if on == Some("on") {
        number(MIN_PENDING_ENV, min_pending, MIN_PENDING).and_then(|min| {
            number(MAX_AGE_ENV, max_age_hours, MAX_AGE_HOURS).map(|age| Some(Trigger::of(min, age)))
        })
    } else {
        Ok(None)
    };
    debug_assert!(
        result
            .as_ref()
            .map_or(true, |t| t.is_none() || on == Some("on")),
        "parse_env: a trigger only when the switch is on"
    );
    result
}
