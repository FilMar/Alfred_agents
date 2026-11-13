#[allow(unused_imports)]
use super::*;

#[test]
#[should_panic(expected = "SessionRead.of: every turn belongs to the session")]
fn of_rejects_a_turn_of_another_session() {
    let stray = turn(&uuid(1), &session(2), &ts(1), "chat", None, "in", "out");
    let _ = SessionRead::of(session(1), vec![stray], vec![]);
}

#[test]
#[should_panic(expected = "SessionRead.of: every earlier turn belongs to the session")]
fn of_rejects_an_earlier_turn_of_another_session() {
    let s = session(1);
    let pending = turn(&uuid(1), &s, &ts(2), "chat", None, "in", "out");
    let stray = turn(&uuid(2), &session(2), &ts(1), "chat", None, "in", "out");
    let _ = SessionRead::of(s, vec![pending], vec![stray]);
}

#[test]
#[should_panic(expected = "SessionRead.of: turn ids are unique, earlier turns included")]
fn of_rejects_a_repeated_id() {
    let s = session(1);
    let id = uuid(1);
    let pending = turn(&id, &s, &ts(2), "chat", None, "in", "out");
    let earlier = turn(&id, &s, &ts(1), "chat", None, "in", "out");
    let _ = SessionRead::of(s, vec![pending], vec![earlier]);
}

#[test]
#[should_panic(expected = "SessionRead.of: an earlier turn is not noise")]
fn of_rejects_a_noisy_earlier_turn() {
    let s = session(1);
    let pending = turn(&uuid(1), &s, &ts(2), "chat", None, "in", "out");
    let noisy = turn(&uuid(2), &s, &ts(1), "subtask", None, "in", "out");
    let _ = SessionRead::of(s, vec![pending], vec![noisy]);
}

#[test]
fn of_sorts_turns_and_keeps_noise_apart() {
    let s = session(1);
    let p3 = turn(&uuid(3), &s, &ts(3), "chat", None, "in", "out");
    let p1 = turn(&uuid(1), &s, &ts(1), "chat", None, "in", "out");
    let p2 = turn(&uuid(2), &s, &ts(2), "subtask", None, "in", "out");
    let e0 = turn(&uuid(0), &s, &ts(0), "chat", None, "in", "out");
    let read = SessionRead::of(s, vec![p3, p1, p2], vec![e0]);
    assert_eq!(ids(read.turns()), vec![uuid(1), uuid(3)]);
    assert_eq!(ids(read.noise()), vec![uuid(2)]);
    assert_eq!(ref_ids(&read.whole()), vec![uuid(0), uuid(1), uuid(3)]);
}

#[test]
fn of_breaks_time_ties_by_id() {
    let s = session(1);
    let b = turn(&uuid(2), &s, &ts(1), "chat", None, "in", "out");
    let a = turn(&uuid(1), &s, &ts(1), "chat", None, "in", "out");
    let read = SessionRead::of(s, vec![b, a], vec![]);
    assert_eq!(ids(read.turns()), vec![uuid(1), uuid(2)]);
}

#[test]
fn whole_orders_the_turns_by_time() {
    let s = session(1);
    let e1 = turn(&uuid(1), &s, &ts(1), "chat", None, "in", "out");
    let e4 = turn(&uuid(4), &s, &ts(4), "chat", None, "in", "out");
    let p2 = turn(&uuid(2), &s, &ts(2), "chat", None, "in", "out");
    let p3 = turn(&uuid(3), &s, &ts(3), "chat", None, "in", "out");
    let read = SessionRead::of(s, vec![p2, p3], vec![e4, e1]);
    assert_eq!(
        ref_ids(&read.whole()),
        vec![uuid(1), uuid(2), uuid(3), uuid(4)]
    );
}
