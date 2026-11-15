use crate::distill::trigger::{Trigger, parse_env};

fn now() -> jiff::Timestamp {
    "2027-06-15T12:00:00Z"
        .parse()
        .expect("distill_trigger: fixed now")
}

fn exchange(id: &str, session: &str, iso: &str) -> crate::hist::Exchange {
    crate::hist::Exchange {
        id: id.to_string(),
        session: session.to_string(),
        parent: None,
        timestamp: iso.to_string(),
        kind: "turn".to_string(),
        actor: "user".to_string(),
        model: None,
        tokens_in: None,
        tokens_out: None,
        tokens_cache_read: None,
        tokens_cache_write: None,
        distilled: None,
        meta: None,
    }
}

fn fresh(id: &str, session: &str) -> crate::hist::Exchange {
    exchange(id, session, "2027-06-15T09:00:00Z")
}

fn exactly_max_age(id: &str, session: &str) -> crate::hist::Exchange {
    exchange(id, session, "2027-06-14T12:00:00Z")
}

fn beyond_max_age(id: &str, session: &str) -> crate::hist::Exchange {
    exchange(id, session, "2027-06-14T11:59:59Z")
}

fn failed(sessions: &[&str]) -> std::collections::HashSet<String> {
    sessions.iter().map(|s| (*s).to_string()).collect()
}

#[test]
fn of_keeps_min_pending() {
    assert_eq!(Trigger::of(3, 24).min_pending(), 3);
}

#[test]
fn of_keeps_max_age() {
    assert_eq!(
        Trigger::of(50, 5).max_age(),
        jiff::SignedDuration::from_hours(5)
    );
}

#[test]
fn of_accepts_one_just_inside_the_edges() {
    Trigger::of(1, 1);
}

#[test]
#[should_panic(expected = "Trigger.of: min_pending is above 0")]
fn of_rejects_zero_min_pending() {
    Trigger::of(0, 24);
}

#[test]
#[should_panic(expected = "Trigger.of: max_age_hours is above 0")]
fn of_rejects_zero_max_age_hours() {
    Trigger::of(50, 0);
}

#[test]
fn due_is_false_with_no_pending() {
    let trigger = Trigger::of(2, 24);
    assert!(!trigger.due(&[], &failed(&[]), now()));
}

#[test]
fn due_is_false_one_exchange_short_of_min_pending() {
    let trigger = Trigger::of(2, 24);
    let pending = [fresh("e1", "s1")];
    assert!(!trigger.due(&pending, &failed(&[]), now()));
}

#[test]
fn due_counts_exchanges_not_sessions() {
    let trigger = Trigger::of(2, 24);
    let pending = [fresh("e1", "s1"), fresh("e2", "s1")];
    assert!(trigger.due(&pending, &failed(&[]), now()));
}

#[test]
fn due_is_true_beyond_min_pending_exchanges() {
    let trigger = Trigger::of(2, 24);
    let pending = [fresh("e1", "s1"), fresh("e2", "s2"), fresh("e3", "s3")];
    assert!(trigger.due(&pending, &failed(&[]), now()));
}

#[test]
fn due_is_false_when_the_oldest_is_exactly_max_age() {
    let trigger = Trigger::of(2, 24);
    let pending = [exactly_max_age("e1", "s1")];
    assert!(!trigger.due(&pending, &failed(&[]), now()));
}

#[test]
fn due_is_true_when_the_oldest_is_beyond_max_age() {
    let trigger = Trigger::of(2, 24);
    let pending = [beyond_max_age("e1", "s1")];
    assert!(trigger.due(&pending, &failed(&[]), now()));
}

#[test]
fn due_is_true_when_the_oldest_of_many_is_beyond_max_age() {
    let trigger = Trigger::of(3, 24);
    let pending = [fresh("e1", "s1"), beyond_max_age("e2", "s2")];
    assert!(trigger.due(&pending, &failed(&[]), now()));
}

#[test]
fn due_excludes_failed_sessions_from_the_count() {
    let trigger = Trigger::of(2, 24);
    let pending = [fresh("e1", "s1"), fresh("e2", "s-bad")];
    assert!(!trigger.due(&pending, &failed(&["s-bad"]), now()));
}

#[test]
fn due_excludes_failed_sessions_from_the_age() {
    let trigger = Trigger::of(2, 24);
    let pending = [beyond_max_age("e1", "s-bad"), fresh("e2", "s1")];
    assert!(!trigger.due(&pending, &failed(&["s-bad"]), now()));
}

#[test]
fn due_is_true_with_failed_sessions_around_the_count() {
    let trigger = Trigger::of(2, 24);
    let pending = [fresh("e1", "s1"), fresh("e2", "s2"), fresh("e3", "s-bad")];
    assert!(trigger.due(&pending, &failed(&["s-bad"]), now()));
}

#[test]
fn due_is_never_due_with_nothing_pending() {
    Trigger::of(2, 24).due(
        &[beyond_max_age("e1", "s-bad"), beyond_max_age("e2", "s-bad")],
        &failed(&["s-bad"]),
        now(),
    );
}

#[test]
fn due_is_due_at_min_pending_exchanges() {
    Trigger::of(1, 24).due(&[fresh("e1", "s1")], &failed(&[]), now());
}

#[test]
fn parse_env_without_the_switch_is_none() {
    assert_eq!(parse_env(None, None, None), Ok(None));
}

#[test]
fn parse_env_with_the_switch_off_is_none() {
    assert_eq!(parse_env(Some("off"), None, None), Ok(None));
}

#[test]
fn parse_env_matches_the_switch_exactly() {
    assert_eq!(parse_env(Some("ON"), None, None), Ok(None));
}

#[test]
fn parse_env_defaults_to_min_pending_50_and_max_age_24() {
    assert_eq!(
        parse_env(Some("on"), None, None),
        Ok(Some(Trigger::of(50, 24)))
    );
}

#[test]
fn parse_env_reads_both_numbers() {
    assert_eq!(
        parse_env(Some("on"), Some("10"), Some("3")),
        Ok(Some(Trigger::of(10, 3)))
    );
}

#[test]
fn parse_env_keeps_the_default_max_age_when_absent() {
    assert_eq!(
        parse_env(Some("on"), Some("10"), None),
        Ok(Some(Trigger::of(10, 24)))
    );
}

#[test]
fn parse_env_keeps_the_default_min_pending_when_absent() {
    assert_eq!(
        parse_env(Some("on"), None, Some("3")),
        Ok(Some(Trigger::of(50, 3)))
    );
}

#[test]
fn parse_env_accepts_one_just_inside_the_edges() {
    assert_eq!(
        parse_env(Some("on"), Some("1"), Some("1")),
        Ok(Some(Trigger::of(1, 1)))
    );
}

#[test]
fn parse_env_rejects_zero_min_pending() {
    let err = parse_env(Some("on"), Some("0"), None).unwrap_err();
    assert!(err.contains("ALFRED_DISTILL_MIN_PENDING"));
}

#[test]
fn parse_env_rejects_non_integer_min_pending() {
    let err = parse_env(Some("on"), Some("abc"), None).unwrap_err();
    assert!(err.contains("ALFRED_DISTILL_MIN_PENDING"));
}

#[test]
fn parse_env_rejects_negative_min_pending() {
    let err = parse_env(Some("on"), Some("-1"), None).unwrap_err();
    assert!(err.contains("ALFRED_DISTILL_MIN_PENDING"));
}

#[test]
fn parse_env_rejects_zero_max_age_hours() {
    let err = parse_env(Some("on"), None, Some("0")).unwrap_err();
    assert!(err.contains("ALFRED_DISTILL_MAX_AGE_HOURS"));
}

#[test]
fn parse_env_rejects_non_integer_max_age_hours() {
    let err = parse_env(Some("on"), None, Some("3.5")).unwrap_err();
    assert!(err.contains("ALFRED_DISTILL_MAX_AGE_HOURS"));
}

#[test]
fn parse_env_only_makes_a_trigger_when_the_switch_is_on() {
    assert_eq!(parse_env(Some("off"), Some("10"), Some("3")), Ok(None));
}
