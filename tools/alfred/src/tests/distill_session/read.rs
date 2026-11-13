#[allow(unused_imports)]
use super::*;

#[test]
#[should_panic(expected = "SessionRead.read: the session is not blank")]
fn read_rejects_a_blank_session() {
    let db = temp_db();
    let _ = SessionRead::read(&db, "   ");
}

#[test]
fn read_fails_when_the_contents_are_missing() {
    let db = temp_db();
    let s = session(1);
    let id = uuid(1);
    seed(&db, &[exchange(&id, &s, &ts(1), "chat", None, false)]);
    match SessionRead::read(&db, &s) {
        Err(crate::hist::HistError::NotFound(message)) => {
            assert!(message.contains("contents not found:"));
            assert!(message.contains(id.as_str()));
        }
        other => panic!("expected HistError::NotFound, got {other:?}"),
    }
}

#[test]
fn read_takes_a_session_just_under_the_cap() {
    let db = cap_db(PENDING_CAP - 1, 0);
    assert!(SessionRead::read(&db, &session(1)).is_ok());
}

#[test]
fn read_rejects_a_list_at_the_cap() {
    for (pending, distilled) in [(PENDING_CAP, 0), (PENDING_CAP + 1, 0), (0, PENDING_CAP)] {
        let db = cap_db(pending, distilled);
        let s = session(1);
        match SessionRead::read(&db, &s) {
            Err(crate::hist::HistError::BadInput(message)) => {
                assert_eq!(message, format!("session {s} holds too many exchanges"));
            }
            other => panic!("expected BadInput for {pending}/{distilled}, got {other:?}"),
        }
    }
}

#[test]
fn read_splits_pending_noise_and_earlier() {
    let db = temp_db();
    let s = session(1);
    let other = session(2);
    let e1 = uuid(1);
    let e2 = uuid(2);
    let e3 = uuid(3);
    let e4 = uuid(4);
    let e5 = uuid(5);
    let e6 = uuid(6);
    seed(
        &db,
        &[
            exchange(&e1, &s, "2026-01-01T10:00:00.000Z", "chat", None, false),
            exchange(&e2, &s, "2026-01-01T10:01:00.000Z", "subtask", None, false),
            exchange(&e3, &s, "2026-01-01T09:59:00.000Z", "chat", None, false),
            exchange(&e4, &s, "2026-01-01T08:00:00.000Z", "chat", None, true),
            exchange(&e5, &s, "2026-01-01T08:30:00.000Z", "subtask", None, true),
            exchange(&e6, &other, "2026-01-01T07:00:00.000Z", "chat", None, false),
        ],
    );
    db.upsert_contents(&[
        contents(&e1, "in", "out"),
        contents(&e2, "in", "out"),
        contents(&e3, "in", "out"),
        contents(&e4, "in", "out"),
        contents(&e5, "in", "out"),
        contents(&e6, "in", "out"),
    ])
    .unwrap();
    let read = SessionRead::read(&db, &s).unwrap();
    assert_eq!(read.session(), s.as_str());
    assert_eq!(ids(read.turns()), vec![e3.clone(), e1.clone()]);
    assert_eq!(ids(read.noise()), vec![e2.clone()]);
    assert_eq!(
        ref_ids(&read.whole()),
        vec![e4.clone(), e3.clone(), e1.clone()]
    );
}

#[test]
fn pending_sessions_lists_from_the_oldest() {
    let db = temp_db();
    let s1 = session(1);
    let s2 = session(2);
    let s3 = session(3);
    let s4 = session(4);
    let s5 = session(5);
    seed(
        &db,
        &[
            exchange(
                &uuid(1),
                &s1,
                "2026-01-01T08:00:00.000Z",
                "chat",
                None,
                false,
            ),
            exchange(
                &uuid(2),
                &s2,
                "2026-01-01T09:00:00.000Z",
                "chat",
                None,
                false,
            ),
            exchange(
                &uuid(3),
                &s3,
                "2026-01-01T12:30:00.000Z",
                "chat",
                None,
                false,
            ),
            exchange(
                &uuid(4),
                &s3,
                "2026-01-01T10:00:00.000Z",
                "chat",
                None,
                false,
            ),
            exchange(
                &uuid(5),
                &s4,
                "2026-01-01T07:00:00.000Z",
                "chat",
                None,
                true,
            ),
            exchange(
                &uuid(6),
                &s5,
                "2026-01-01T12:00:00.000Z",
                "subtask",
                None,
                false,
            ),
        ],
    );
    let got = pending_sessions(&db).unwrap();
    assert_eq!(got, vec![s1.clone(), s2.clone(), s3.clone(), s5.clone()]);
}
