use crate::rules::cli::{GUIDE, prompts_of, render_blocks};

#[test]
fn guide_is_compiled_in() {
    assert!(!GUIDE.is_empty());
}

#[test]
fn render_blocks_no_rules_gives_no_output() {
    assert_eq!(render_blocks(&[]), "");
}

#[test]
fn render_blocks_reaches_one_block_per_rule_contract() {
    let _ = render_blocks(&[]);
}

#[test]
fn prompts_of_empty_list_gives_no_prompts() {
    assert_eq!(prompts_of("[]"), Ok(Vec::<String>::new()));
}

#[test]
fn prompts_of_single_text() {
    assert_eq!(prompts_of(r#"[{"text":"a"}]"#), Ok(vec!["a".to_string()]));
}

#[test]
fn prompts_of_keeps_order() {
    assert_eq!(
        prompts_of(r#"[{"text":"a"},{"text":"b"},{"text":"c"}]"#),
        Ok(vec!["a".to_string(), "b".to_string(), "c".to_string()])
    );
}

#[test]
fn prompts_of_trims_each_text() {
    assert_eq!(
        prompts_of("[{\"text\":\"  hello world  \"}]"),
        Ok(vec!["hello world".to_string()])
    );
}

#[test]
fn prompts_of_discards_blank_texts() {
    assert_eq!(
        prompts_of(r#"[{"text":"   "},{"text":"a"},{"text":""}]"#),
        Ok(vec!["a".to_string()])
    );
}

#[test]
fn prompts_of_all_blank_gives_no_prompts() {
    assert_eq!(
        prompts_of("[{\"text\":\"\"},{\"text\":\" \\t \"},{\"text\":\"\\n\"}]"),
        Ok(Vec::<String>::new())
    );
}

#[test]
fn prompts_of_keeps_duplicates() {
    assert_eq!(
        prompts_of(r#"[{"text":"a"},{"text":"a"}]"#),
        Ok(vec!["a".to_string(), "a".to_string()])
    );
}

#[test]
fn prompts_of_tolerates_trailing_newline() {
    assert_eq!(
        prompts_of("[{\"text\":\"a\"}]\n"),
        Ok(vec!["a".to_string()])
    );
}

#[test]
fn prompts_of_rejects_not_json() {
    assert!(prompts_of("not json").is_err());
}

#[test]
fn prompts_of_rejects_object_instead_of_list() {
    assert!(prompts_of(r#"{"text":"a"}"#).is_err());
}

#[test]
fn prompts_of_rejects_list_of_strings() {
    assert!(prompts_of(r#"["a"]"#).is_err());
}

#[test]
fn prompts_of_rejects_null() {
    assert!(prompts_of("null").is_err());
}

#[test]
fn prompts_of_reaches_no_blank_prompt_contract() {
    let _ = prompts_of(r#"[{"text":"  "},{"text":"a"}]"#);
}
