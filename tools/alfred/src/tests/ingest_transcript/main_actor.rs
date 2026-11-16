use serde_json::json;

use super::*;

#[test]
fn text_and_tools_of_a_line_per_harness() {
    let claude = l(json!({"message": {"role": "user", "content": [
        {"type": "text", "text": "a"}, {"type": "text", "text": ""}, {"type": "text", "text": "b"},
        {"type": "tool_use", "name": "grep", "input": {"q": "x", "a": 1}}, {"type": "tool_result", "content": "out"}
    ]}}));
    assert_eq!(Harness::Claude.text_of(&claude), "a\nb");
    assert_eq!(
        Harness::Claude.tools_of(&claude),
        "[tool grep] {\"q\":\"x\",\"a\":1}\n[result] out"
    );
    let pi_result =
        l(json!({"message": {"role": "toolResult", "content": [{"type": "text", "text": "r"}]}}));
    assert_eq!(Harness::Pi.text_of(&pi_result), "");
    assert_eq!(Harness::Pi.tools_of(&pi_result), "[result] r");
    let pi_call = l(
        json!({"message": {"role": "assistant", "content": [{"type": "toolCall", "name": "ls", "arguments": null, "input": {"p": "."}}]}}),
    );
    assert_eq!(Harness::Pi.tools_of(&pi_call), "[tool ls] {\"p\":\".\"}");
    let plain = l(json!({"message": {"role": "user", "content": "as is"}}));
    assert_eq!(Harness::Claude.text_of(&plain), "as is");
    assert_eq!(Harness::Claude.tools_of(&plain), "");
}

#[test]
fn spans_split_on_openers_and_count_leading_answers() {
    let kind = |k: &str| match k {
        "o" => json!({"type": "user", "origin": {"kind": "human"}}),
        "a" => json!({"type": "assistant"}),
        _ => json!({"type": "system"}),
    };
    let cases: &[(&str, &[usize], u32)] = &[
        ("", &[], 0),
        ("aa", &[], 2),
        ("xa", &[], 1),
        ("oax", &[2], 0),
        ("oaox", &[1, 1], 0),
        ("aoa", &[1], 1),
    ];
    for &(seq, bodies, orphans) in cases {
        let lines = ls(&seq
            .chars()
            .map(|c| kind(&c.to_string()))
            .collect::<Vec<_>>());
        let (found, counted) = spans(&lines, Harness::Claude);
        assert_eq!(
            found.iter().map(|s| s.body.len()).collect::<Vec<_>>(),
            bodies,
            "spans of {seq:?}"
        );
        assert_eq!(counted, orphans, "orphans of {seq:?}");
    }
}

#[test]
fn parse_lines_reads_one_object_per_line_and_skips_the_rest() {
    let cases: &[(&str, usize)] = &[
        ("", 0),
        ("\n\n", 0),
        ("not json", 0),
        ("{\"a\":1}", 1),
        ("{\"a\":1}\n", 1),
        ("{\"a\":1}\n\nbad\n  \n{\"b\":2}", 2),
        ("5", 0),
    ];
    for &(text, count) in cases {
        assert_eq!(parse_lines(text).len(), count, "parse_lines({text:?})");
    }
}
