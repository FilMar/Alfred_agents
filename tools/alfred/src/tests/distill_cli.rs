use crate::distill::cli::{DistillArgs, config_of, finished, options_of};

fn args(extractor: &str, max_saved: Option<u32>) -> DistillArgs {
    DistillArgs {
        session: None,
        extractor: extractor.to_string(),
        active: false,
        max_saved,
        same_session_cutoff: 1.0,
        status: false,
    }
}

#[test]
fn options_of_accepts_the_active_extractor() {
    assert!(options_of(&args("active", None)).is_ok());
}

#[test]
fn options_of_accepts_an_extractor_id() {
    assert!(options_of(&args("4", None)).is_ok());
}

#[test]
fn options_of_rejects_an_extractor_that_is_not_active_or_an_id() {
    assert!(options_of(&args("bogus", None)).is_err());
}

#[test]
fn options_of_rejects_max_saved_zero() {
    assert!(options_of(&args("active", Some(0))).is_err());
}

#[test]
fn options_of_accepts_max_saved_one() {
    assert!(options_of(&args("active", Some(1))).is_ok());
}

#[test]
fn options_of_leaves_the_cutoff_to_the_server() {
    let asked = DistillArgs {
        same_session_cutoff: 0.0,
        ..args("active", None)
    };
    assert!(options_of(&asked).is_ok());
}

#[test]
fn options_of_keeps_the_mode_asked() {
    let asked = DistillArgs {
        active: true,
        ..args("active", None)
    };
    let _ = options_of(&asked);
}

#[test]
fn options_of_keeps_the_session_asked() {
    let asked = DistillArgs {
        session: Some("abc".to_string()),
        ..args("active", None)
    };
    let _ = options_of(&asked);
}

#[test]
fn finished_returns_last_when_nothing_is_running() {
    let status = serde_json::json!({"running": null, "last": {"run": "r1", "sessions": 2}});
    assert_eq!(
        finished(&status, "r1"),
        Some(serde_json::json!({"run": "r1", "sessions": 2}))
    );
}

#[test]
fn finished_returns_last_while_another_run_goes() {
    let status = serde_json::json!({"running": {"run": "r2"}, "last": {"run": "r1"}});
    assert_eq!(
        finished(&status, "r1"),
        Some(serde_json::json!({"run": "r1"}))
    );
}

#[test]
fn finished_returns_none_while_the_run_goes() {
    let status = serde_json::json!({"running": {"run": "r1"}, "last": {"run": "r1"}});
    assert_eq!(finished(&status, "r1"), None);
}

#[test]
fn finished_returns_none_when_last_is_of_another_run() {
    let status = serde_json::json!({"running": null, "last": {"run": "r2"}});
    assert_eq!(finished(&status, "r1"), None);
}

#[test]
fn finished_returns_none_when_the_run_is_neither_running_nor_last() {
    let status = serde_json::json!({"running": {"run": "r9"}, "last": {"run": "r2"}});
    assert_eq!(finished(&status, "r1"), None);
}

#[test]
fn finished_returns_none_without_a_last() {
    let status = serde_json::json!({"running": null, "last": null});
    assert_eq!(finished(&status, "r1"), None);
}

#[test]
fn config_of_reads_a_valid_config() {
    let text = crate::tests::distill_bench::config(3);
    assert!(config_of(&text).is_ok());
}

#[test]
fn config_of_refuses_an_unknown_field() {
    let mut value: serde_json::Value =
        serde_json::from_str(&crate::tests::distill_bench::config(3)).unwrap();
    value["connection"] = serde_json::json!("old");
    assert!(config_of(&value.to_string()).is_err());
}

#[test]
fn config_of_refuses_a_config_that_fails_the_check() {
    let mut value: serde_json::Value =
        serde_json::from_str(&crate::tests::distill_bench::config(3)).unwrap();
    value["checks"] = serde_json::json!([]);
    assert!(config_of(&value.to_string()).is_err());
}
