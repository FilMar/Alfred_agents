use crate::rules::refine::{LOW_TEXT_CHARS, refine_report};

use super::{close, rule, ts};

#[test]
fn refine_report_spread_counts_every_rule() {
    let now = ts("2026-12-19T00:00:00.000Z");
    let rules = vec![
        rule(
            "almost",
            "almost if",
            Some(6),
            Some("2026-10-21T00:00:00.000Z"),
            Some("2026-10-21T00:00:00.000Z"),
            None,
        ),
        rule(
            "gone",
            "gone if",
            Some(6),
            Some("2026-10-20T00:00:00.000Z"),
            Some("2026-10-20T00:00:00.000Z"),
            Some("2026-11-01T00:00:00.000Z"),
        ),
        rule(
            "fresh",
            "fresh if",
            Some(10),
            Some("2026-12-19T00:00:00.000Z"),
            Some("2026-12-19T00:00:00.000Z"),
            None,
        ),
    ];
    let _ = refine_report(&rules, now);
}

#[test]
fn refine_report_archive_live_restore_archived() {
    let now = ts("2026-12-19T00:00:00.000Z");
    let rules = vec![
        rule(
            "hitless",
            "hitless if",
            Some(0),
            Some("2026-10-20T00:00:00.000Z"),
            Some("2026-10-20T00:00:00.000Z"),
            None,
        ),
        rule(
            "fresh",
            "fresh if",
            Some(10),
            Some("2026-12-19T00:00:00.000Z"),
            Some("2026-12-19T00:00:00.000Z"),
            None,
        ),
        rule(
            "oldarch",
            "oldarch if",
            Some(0),
            Some("2026-10-20T00:00:00.000Z"),
            Some("2026-10-20T00:00:00.000Z"),
            Some("2026-10-25T00:00:00.000Z"),
        ),
        rule(
            "edgefloor",
            "edgefloor if",
            Some(6),
            Some("2026-10-20T00:00:00.000Z"),
            Some("2026-10-20T00:00:00.000Z"),
            None,
        ),
        rule(
            "gone",
            "gone if",
            Some(6),
            Some("2026-10-20T00:00:00.000Z"),
            Some("2026-10-20T00:00:00.000Z"),
            Some("2026-11-01T00:00:00.000Z"),
        ),
        rule(
            "risen",
            "risen if",
            Some(20),
            Some("2026-12-19T00:00:00.000Z"),
            Some("2026-12-19T00:00:00.000Z"),
            Some("2026-11-20T00:00:00.000Z"),
        ),
        rule("nowhen", "nowhen if", Some(0), None, None, None),
    ];
    let _ = refine_report(&rules, now);
}

#[test]
fn refine_report_low_under_floor() {
    let now = ts("2026-12-19T00:00:00.000Z");
    let rules = vec![
        rule(
            "caplow",
            "caplow if",
            Some(6),
            Some("2026-10-19T00:00:00.000Z"),
            Some("2026-10-19T00:00:00.000Z"),
            None,
        ),
        rule(
            "edgefloor",
            "edgefloor if",
            Some(6),
            Some("2026-10-20T00:00:00.000Z"),
            Some("2026-10-20T00:00:00.000Z"),
            None,
        ),
        rule(
            "hitless",
            "hitless if",
            Some(0),
            Some("2026-10-20T00:00:00.000Z"),
            Some("2026-10-20T00:00:00.000Z"),
            None,
        ),
    ];
    let _ = refine_report(&rules, now);
}

#[test]
fn refine_report_low_text_cut() {
    let now = ts("2026-12-19T00:00:00.000Z");
    let rules = vec![rule(
        "wordy",
        &"z".repeat(200),
        Some(0),
        Some("2026-10-20T00:00:00.000Z"),
        Some("2026-10-20T00:00:00.000Z"),
        None,
    )];
    let _ = refine_report(&rules, now);
}

#[test]
fn refine_report_no_rules() {
    let no_rules: [crate::rules::Rule; 0] = [];
    let report = refine_report(&no_rules, ts("2026-12-19T00:00:00.000Z"));
    assert_eq!(report.spread.total, 0);
    assert_eq!(report.spread.below_floor, 0);
    assert_eq!(report.spread.bins, vec![0u32; 10]);
    assert!(report.low.is_empty());
    assert!(report.plan.archive.is_empty());
    assert!(report.plan.restore.is_empty());
}

#[test]
fn refine_report_table() {
    let now = ts("2026-12-19T00:00:00.000Z");
    let rules = vec![
        rule(
            "almost",
            "almost if",
            Some(6),
            Some("2026-10-21T00:00:00.000Z"),
            Some("2026-10-21T00:00:00.000Z"),
            None,
        ),
        rule(
            "caplow",
            "caplow if",
            Some(6),
            Some("2026-10-19T00:00:00.000Z"),
            Some("2026-10-19T00:00:00.000Z"),
            None,
        ),
        rule(
            "edgefloor",
            "edgefloor if",
            Some(6),
            Some("2026-10-20T00:00:00.000Z"),
            Some("2026-10-20T00:00:00.000Z"),
            None,
        ),
        rule(
            "fresh",
            "fresh if",
            Some(10),
            Some("2026-12-19T00:00:00.000Z"),
            Some("2026-12-19T00:00:00.000Z"),
            None,
        ),
        rule(
            "gone",
            "gone if",
            Some(6),
            Some("2026-10-20T00:00:00.000Z"),
            Some("2026-10-20T00:00:00.000Z"),
            Some("2026-11-01T00:00:00.000Z"),
        ),
        rule(
            "halfgone",
            "halfgone if",
            Some(0),
            Some("2026-11-19T00:00:00.000Z"),
            Some("2026-11-19T00:00:00.000Z"),
            None,
        ),
        rule(
            "hitless",
            &"h".repeat(LOW_TEXT_CHARS),
            Some(0),
            Some("2026-10-20T00:00:00.000Z"),
            Some("2026-10-20T00:00:00.000Z"),
            None,
        ),
        rule(
            "longone",
            &"l".repeat(LOW_TEXT_CHARS + 1),
            Some(0),
            Some("2026-10-20T00:00:00.000Z"),
            Some("2026-10-20T00:00:00.000Z"),
            None,
        ),
        rule(
            "neverhit",
            "neverhit if",
            Some(0),
            None,
            Some("2026-10-18T00:00:00.000Z"),
            None,
        ),
        rule(
            "oldarch",
            "oldarch if",
            Some(0),
            Some("2026-10-20T00:00:00.000Z"),
            Some("2026-10-20T00:00:00.000Z"),
            Some("2026-10-25T00:00:00.000Z"),
        ),
        rule(
            "risen",
            "risen if",
            Some(20),
            Some("2026-12-19T00:00:00.000Z"),
            Some("2026-12-19T00:00:00.000Z"),
            Some("2026-11-20T00:00:00.000Z"),
        ),
        rule(
            "tiny",
            &"t".repeat(LOW_TEXT_CHARS - 1),
            Some(15),
            Some("2026-09-20T00:00:00.000Z"),
            Some("2026-09-20T00:00:00.000Z"),
            None,
        ),
    ];
    let report = refine_report(&rules, now);

    assert_eq!(report.spread.total, 12);
    assert_eq!(report.spread.below_floor, 6);
    assert_eq!(report.spread.bins, vec![0u32, 6, 4, 0, 0, 0, 0, 0, 0, 2]);

    let low_ids: Vec<&str> = report.low.iter().map(|l| l.id.as_str()).collect();
    assert_eq!(
        low_ids,
        [
            "hitless", "longone", "neverhit", "oldarch", "tiny", "caplow"
        ]
    );
    assert!(report.low.iter().all(|l| l.hits_related == 0));

    close(report.low[0].trust, 0.125);
    assert_eq!(report.low[0].text, "h".repeat(LOW_TEXT_CHARS));
    assert_eq!(report.low[0].when, "2026-10-20T00:00:00.000Z");
    assert_eq!(report.low[0].hits, 0);

    close(report.low[1].trust, 0.125);
    assert_eq!(report.low[1].text, "l".repeat(LOW_TEXT_CHARS));
    assert_eq!(report.low[1].when, "2026-10-20T00:00:00.000Z");
    assert_eq!(report.low[1].hits, 0);

    close(report.low[2].trust, 0.125);
    assert_eq!(report.low[2].text, "neverhit if");
    assert_eq!(report.low[2].when, "2026-10-18T00:00:00.000Z");
    assert_eq!(report.low[2].hits, 0);

    close(report.low[3].trust, 0.125);
    assert_eq!(report.low[3].text, "oldarch if");
    assert_eq!(report.low[3].when, "2026-10-20T00:00:00.000Z");
    assert_eq!(report.low[3].hits, 0);

    close(report.low[4].trust, 0.125);
    assert_eq!(report.low[4].text, "t".repeat(LOW_TEXT_CHARS - 1));
    assert_eq!(report.low[4].when, "2026-09-20T00:00:00.000Z");
    assert_eq!(report.low[4].hits, 15);

    close(report.low[5].trust, 0.1954319936);
    assert_eq!(report.low[5].text, "caplow if");
    assert_eq!(report.low[5].when, "2026-10-19T00:00:00.000Z");
    assert_eq!(report.low[5].hits, 6);

    let archive_ids: Vec<&str> = report.plan.archive.iter().map(|l| l.id.as_str()).collect();
    assert_eq!(
        archive_ids,
        ["hitless", "longone", "neverhit", "tiny", "caplow"]
    );
    assert!(report.plan.archive.iter().all(|l| l.hits_related == 0));
    close(report.plan.archive[0].trust, 0.125);
    close(report.plan.archive[1].trust, 0.125);
    assert_eq!(report.plan.archive[1].text, "l".repeat(LOW_TEXT_CHARS));
    close(report.plan.archive[2].trust, 0.125);
    close(report.plan.archive[3].trust, 0.125);
    assert_eq!(report.plan.archive[3].hits, 15);
    close(report.plan.archive[4].trust, 0.1954319936);
    assert_eq!(report.plan.archive[4].when, "2026-10-19T00:00:00.000Z");
    assert_eq!(report.plan.archive[4].hits, 6);

    let restore_ids: Vec<&str> = report.plan.restore.iter().map(|l| l.id.as_str()).collect();
    assert_eq!(restore_ids, ["gone", "risen"]);
    assert!(report.plan.restore.iter().all(|l| l.hits_related == 0));
    close(report.plan.restore[0].trust, 0.2);
    assert_eq!(report.plan.restore[0].when, "2026-10-20T00:00:00.000Z");
    assert_eq!(report.plan.restore[0].hits, 6);
    close(report.plan.restore[1].trust, 1.0);
    assert_eq!(report.plan.restore[1].hits, 20);
}
