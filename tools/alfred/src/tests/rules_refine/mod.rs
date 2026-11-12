pub(super) fn ts(s: &str) -> jiff::Timestamp {
    s.parse().expect("test timestamp parses")
}

pub(super) fn rule(
    id: &str,
    if_: &str,
    hits: Option<u32>,
    last_hit: Option<&str>,
    when: Option<&str>,
    archived_at: Option<&str>,
) -> crate::rules::Rule {
    crate::rules::Rule {
        id: id.to_string(),
        body: crate::rules::RuleBody {
            if_: if_.to_string(),
            hits,
            when: when.map(std::string::ToString::to_string),
            last_hit: last_hit.map(std::string::ToString::to_string),
            archived_at: archived_at.map(std::string::ToString::to_string),
            ..crate::rules::RuleBody::default()
        },
    }
}

pub(super) fn close(got: f64, want: f64) {
    assert!((got - want).abs() < 1e-9, "expected {want}, got {got}");
}

mod report;
mod signals;
mod spread;
