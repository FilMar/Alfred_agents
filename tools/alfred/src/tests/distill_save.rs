use crate::distill::record::Verdict;
use crate::distill::save::{Action, Budget, action_of};

#[test]
#[should_panic(expected = "Budget.of: max is none or above 0")]
fn of_rejects_zero() {
    Budget::of(Some(0));
}

#[test]
fn take_at_the_cap() {
    Budget::of(Some(1)).take().0.take();
}

#[test]
fn spent_table() {
    assert_eq!(Budget::of(None).spent(), 0);
    assert_eq!(Budget::of(Some(1)).spent(), 0);
    assert_eq!(Budget::of(None).take().0.spent(), 1);
    assert_eq!(Budget::of(Some(1)).take().0.spent(), 1);
}

#[test]
fn is_spent_table() {
    assert!(!Budget::of(None).is_spent());
    assert!(!Budget::of(Some(1)).is_spent());
    assert!(Budget::of(Some(1)).take().0.is_spent());
}

#[test]
fn action_of_table() {
    assert_eq!(action_of(Verdict::New), Action::AddRule);
    assert_eq!(action_of(Verdict::Append), Action::AppendDo);
    assert_eq!(action_of(Verdict::Duplicate), Action::Nothing);
}
