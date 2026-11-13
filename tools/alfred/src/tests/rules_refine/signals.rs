use crate::rules::refine::{Signals, counters_start, signals_of, trust_of};

use super::{close, rule, ts};

#[test]
fn signals_of_table() {
    let start = counters_start();
    let hit = signals_of(
        &rule(
            "a",
            "if a",
            Some(7),
            Some("2026-11-01T00:00:00.000Z"),
            Some("2026-11-10T00:00:00.000Z"),
            None,
        ),
        start,
    );
    assert_eq!(hit.hits, 7);
    assert_eq!(hit.last, ts("2026-11-01T00:00:00.000Z"));

    let early_hit = signals_of(
        &rule(
            "b",
            "if b",
            Some(42),
            Some("2026-09-15T00:00:00.000Z"),
            Some("2026-09-10T00:00:00.000Z"),
            None,
        ),
        start,
    );
    assert_eq!(early_hit.hits, 42);
    assert_eq!(early_hit.last, ts("2026-09-15T00:00:00.000Z"));

    let late_when = signals_of(
        &rule(
            "c",
            "if c",
            Some(2),
            None,
            Some("2026-11-10T00:00:00.000Z"),
            None,
        ),
        start,
    );
    assert_eq!(late_when.hits, 2);
    assert_eq!(late_when.last, ts("2026-11-10T00:00:00.000Z"));

    let early_when = signals_of(
        &rule(
            "d",
            "if d",
            Some(5),
            None,
            Some("2026-09-01T00:00:00.000Z"),
            None,
        ),
        start,
    );
    assert_eq!(early_when.hits, 5);
    assert_eq!(early_when.last, start);

    let bare = signals_of(&rule("e", "if e", None, None, None, None), start);
    assert_eq!(bare.hits, 0);
    assert_eq!(bare.last, start);

    let late_start = signals_of(
        &rule(
            "f",
            "if f",
            Some(1),
            None,
            Some("2026-11-10T00:00:00.000Z"),
            None,
        ),
        ts("2026-11-15T00:00:00.000Z"),
    );
    assert_eq!(late_start.hits, 1);
    assert_eq!(late_start.last, ts("2026-11-15T00:00:00.000Z"));
}

#[test]
fn trust_of_table() {
    let now = ts("2026-12-19T00:00:00.000Z");
    close(trust_of(Signals { hits: 0, last: now }, now), 0.5);
    close(
        trust_of(
            Signals {
                hits: 0,
                last: ts("2026-11-19T00:00:00.000Z"),
            },
            now,
        ),
        0.25,
    );
    close(
        trust_of(
            Signals {
                hits: 0,
                last: ts("2026-10-20T00:00:00.000Z"),
            },
            now,
        ),
        0.125,
    );
    close(trust_of(Signals { hits: 9, last: now }, now), 0.95);
    close(
        trust_of(
            Signals {
                hits: 10,
                last: now,
            },
            now,
        ),
        1.0,
    );
    close(
        trust_of(
            Signals {
                hits: 11,
                last: now,
            },
            now,
        ),
        1.0,
    );
    close(
        trust_of(
            Signals {
                hits: 1,
                last: ts("2026-11-19T00:00:00.000Z"),
            },
            now,
        ),
        0.275,
    );
    close(
        trust_of(
            Signals {
                hits: 0,
                last: ts("2026-12-04T00:00:00.000Z"),
            },
            now,
        ),
        0.3535533906,
    );
    close(
        trust_of(
            Signals {
                hits: 0,
                last: ts("2026-12-18T12:00:00.000Z"),
            },
            now,
        ),
        0.4942570102,
    );
    close(
        trust_of(
            Signals {
                hits: 50,
                last: ts("2026-11-19T00:00:00.000Z"),
            },
            now,
        ),
        0.5,
    );
    close(
        trust_of(
            Signals {
                hits: 3,
                last: ts("2026-12-29T00:00:00.000Z"),
            },
            now,
        ),
        0.65,
    );
}
