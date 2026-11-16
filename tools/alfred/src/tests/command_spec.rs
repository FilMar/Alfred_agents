use std::num::NonZeroU32;
use std::path::Path;

use crate::command::spec::{Label, RunParts, RunSpec, SEPARATOR, compose, parse_tools, safe_name};

fn full_parts() -> RunParts {
    RunParts {
        task: "summarize the deck".to_string(),
        role: Some("you are precise".to_string()),
        hat: Some("probe".to_string()),
        hat_text: Some("wear this hat".to_string()),
        skill: Some("pack".to_string()),
        skill_block: Some("<skill name=\"pack\">fold clothes</skill>".to_string()),
        tools: Some("read,write".to_string()),
        thinking: Some("high".to_string()),
        model: Some("anthropic/sonnet".to_string()),
        timeout: NonZeroU32::new(1),
    }
}

fn has_flag(args: &[String], flag: &str) -> bool {
    args.iter().any(|arg| arg == flag)
}

fn has_pair(args: &[String], flag: &str, value: &str) -> bool {
    args.windows(2)
        .any(|pair| pair[0] == flag && pair[1] == value)
}

fn ends_with_task(args: &[String], task: &str) -> bool {
    args.len() >= 2 && args[args.len() - 2] == "--" && args[args.len() - 1] == task
}

#[test]
fn safe_name_classifies_names() {
    let table = [
        ("alfred", true),
        ("Run2", true),
        ("a-b", true),
        ("a_b", true),
        ("-", true),
        ("_", true),
        ("0", true),
        ("a b", false),
        ("a.b", false),
        ("a/b", false),
        ("a:b", false),
        ("a,b", false),
        ("a!b", false),
        ("a\nb", false),
    ];
    for (name, expected) in table {
        assert_eq!(safe_name(name), expected, "safe_name({name:?})");
    }
}

#[test]
fn parse_tools_splits_the_comma_list() {
    let table: [(Option<&str>, &[&str]); 12] = [
        (None, &[]),
        (Some(""), &[]),
        (Some(","), &[]),
        (Some(" , "), &[]),
        (Some("a"), &["a"]),
        (Some("a,"), &["a"]),
        (Some(",a"), &["a"]),
        (Some("a,b"), &["a", "b"]),
        (Some("a, b"), &["a", "b"]),
        (Some(" a , b "), &["a", "b"]),
        (Some("a,,b"), &["a", "b"]),
        (Some("read,write,bash"), &["read", "write", "bash"]),
    ];
    for (raw, expected) in table {
        assert_eq!(parse_tools(raw), expected, "parse_tools({raw:?})");
    }
}

#[test]
#[should_panic(expected = "Label.of: a hat or a skill")]
fn label_of_requires_a_hat_or_a_skill() {
    let _ = Label::of(None, None);
}

#[test]
fn label_of_takes_the_hat() {
    let _ = Label::of(Some("probe"), None);
}

#[test]
fn label_of_falls_back_to_the_skill() {
    let _ = Label::of(None, Some("pack"));
}

#[test]
fn label_of_prefers_the_hat_when_both() {
    let _ = Label::of(Some("probe"), Some("pack"));
}

#[test]
fn label_of_rejects_an_unsafe_hat() {
    let _ = Label::of(Some("not safe!"), None);
}

#[test]
fn label_of_rejects_an_unsafe_skill() {
    let _ = Label::of(None, Some("not safe!"));
}

#[test]
fn compose_puts_role_hat_skill_in_order() {
    compose(Some("the role"), Some("the hat"), Some("the skill"));
}

#[test]
fn compose_without_a_role() {
    compose(None, Some("the hat"), Some("the skill"));
}

#[test]
fn compose_without_a_hat() {
    compose(Some("the role"), None, Some("the skill"));
}

#[test]
fn compose_without_a_skill() {
    compose(Some("the role"), Some("the hat"), None);
}

#[test]
fn compose_role_only() {
    compose(Some("the role"), None, None);
}

#[test]
fn compose_hat_only() {
    compose(None, Some("the hat"), None);
}

#[test]
fn compose_skill_only() {
    compose(None, None, Some("the skill"));
}

#[test]
fn compose_nothing() {
    compose(None, None, None);
}

#[test]
fn compose_drops_an_empty_role() {
    compose(Some(""), Some("the hat"), None);
}

#[test]
fn compose_drops_a_blank_role() {
    compose(Some("   "), None, Some("the skill"));
}

#[test]
fn compose_drops_an_empty_hat_between_blocks() {
    compose(Some("the role"), Some(""), Some("the skill"));
}

#[test]
fn compose_drops_all_blank_blocks() {
    compose(Some(""), Some("   "), Some(" "));
}

#[test]
fn of_labels_with_the_hat() {
    let spec = RunSpec::of(full_parts()).unwrap();
    assert_eq!(spec.label().as_str(), "probe");
}

#[test]
fn of_labels_with_the_skill_when_no_hat() {
    let parts = RunParts {
        task: "fold".to_string(),
        skill: Some("pack".to_string()),
        skill_block: Some("<skill name=\"pack\">fold clothes</skill>".to_string()),
        ..Default::default()
    };
    let spec = RunSpec::of(parts).unwrap();
    assert_eq!(spec.label().as_str(), "pack");
}

#[test]
fn of_composes_the_system_prompt_in_order() {
    let spec = RunSpec::of(full_parts()).unwrap();
    assert_eq!(
        spec.system(),
        format!(
            "you are precise{SEPARATOR}wear this hat{SEPARATOR}<skill name=\"pack\">fold clothes</skill>"
        )
    );
}

#[test]
fn of_drops_blank_blocks_from_the_system() {
    let parts = RunParts {
        task: "fold".to_string(),
        role: Some(String::new()),
        hat: Some("probe".to_string()),
        hat_text: Some("wear this hat".to_string()),
        skill: Some("pack".to_string()),
        skill_block: Some("   ".to_string()),
        ..Default::default()
    };
    let spec = RunSpec::of(parts).unwrap();
    assert_eq!(spec.system(), "wear this hat");
}

#[test]
fn of_keeps_the_task() {
    let spec = RunSpec::of(full_parts()).unwrap();
    assert_eq!(spec.task(), "summarize the deck");
}

#[test]
fn of_keeps_the_skill_name() {
    let spec = RunSpec::of(full_parts()).unwrap();
    assert_eq!(spec.skill(), Some("pack"));
}

#[test]
fn of_keeps_thinking_and_timeout() {
    let spec = RunSpec::of(full_parts()).unwrap();
    assert_eq!(spec.thinking(), Some("high"));
    assert_eq!(spec.timeout(), NonZeroU32::new(1));
}

#[test]
fn of_passes_through_absent_optionals() {
    let parts = RunParts {
        task: "fold".to_string(),
        hat: Some("probe".to_string()),
        hat_text: Some("wear this hat".to_string()),
        ..Default::default()
    };
    let spec = RunSpec::of(parts).unwrap();
    assert_eq!(spec.thinking(), None);
    assert_eq!(spec.timeout(), None);
    assert_eq!(spec.skill(), None);
}

#[test]
#[should_panic(expected = "Label.of: a hat or a skill")]
fn of_rejects_a_run_without_hat_and_skill() {
    let parts = RunParts {
        task: "fold".to_string(),
        ..Default::default()
    };
    let _ = RunSpec::of(parts);
}

#[test]
fn of_rejects_an_unsafe_label() {
    let parts = RunParts {
        task: "fold".to_string(),
        hat: Some("not a label".to_string()),
        hat_text: Some("wear this hat".to_string()),
        ..Default::default()
    };
    RunSpec::of(parts).unwrap_err();
}

#[test]
fn pi_args_launches_pi_in_json_mode() {
    let spec = RunSpec::of(full_parts()).unwrap();
    let args = spec.pi_args(Path::new("/tmp/alfred-probe-42-abcd.system"));
    assert!(has_flag(&args, "-p"));
    assert!(has_pair(&args, "--mode", "json"));
    assert!(has_flag(&args, "--no-session"));
    assert!(has_flag(&args, "--no-extensions"));
    assert!(has_flag(&args, "--no-context-files"));
    assert!(has_flag(&args, "--no-skills"));
    assert!(has_pair(
        &args,
        "--system-prompt",
        "/tmp/alfred-probe-42-abcd.system"
    ));
    assert!(has_pair(&args, "--tools", "read,write"));
    assert!(has_pair(&args, "--model", "anthropic/sonnet"));
    assert!(has_pair(&args, "--thinking", "high"));
    assert!(ends_with_task(&args, "summarize the deck"));
}

#[test]
fn pi_args_omits_the_optionals_when_absent() {
    let base = RunParts {
        task: "fold".to_string(),
        hat: Some("probe".to_string()),
        hat_text: Some("wear this hat".to_string()),
        ..Default::default()
    };
    for tools in [None, Some(""), Some(" , ")] {
        let parts = RunParts {
            tools: tools.map(std::string::ToString::to_string),
            ..base.clone()
        };
        let args = RunSpec::of(parts)
            .unwrap()
            .pi_args(Path::new("/tmp/x.system"));
        assert!(!has_flag(&args, "--tools"), "tools {tools:?}");
        assert!(!has_flag(&args, "--model"));
        assert!(!has_flag(&args, "--thinking"));
        assert!(has_flag(&args, "--no-skills"));
        assert!(has_pair(&args, "--system-prompt", "/tmp/x.system"));
        assert!(ends_with_task(&args, "fold"));
    }
}
