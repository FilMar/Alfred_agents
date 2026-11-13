use crate::hist::ingest::{MAX_FILES, Roots, Summary, hostname, looks_like_pi, modified_at, parse};

struct Scratch(std::path::PathBuf);

impl Scratch {
    fn new(name: &str) -> Scratch {
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let dir = std::env::temp_dir().join(format!(
            "ingest_mod_{name}_{}_{}",
            std::process::id(),
            nanos
        ));
        std::fs::create_dir_all(&dir).unwrap();
        Scratch(dir)
    }
}

impl Drop for Scratch {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.0);
    }
}

fn root_with_files(base: &std::path::Path, files: usize) -> Roots {
    let claude = base.join("claude");
    let project = claude.join("project");
    std::fs::create_dir_all(&project).unwrap();
    for index in 0..files {
        std::fs::write(project.join(format!("t{index}.jsonl")), b"").unwrap();
    }
    Roots {
        claude,
        pi: base.join("missing"),
    }
}

#[test]
fn summary_add_transcripts_add_up() {
    let one = Summary {
        transcripts: 12,
        sessions: 3,
        exchanges: 40,
        known: 5,
        orphans: 2,
    };
    let two = Summary {
        transcripts: 7,
        sessions: 1,
        exchanges: 9,
        known: 1,
        orphans: 0,
    };
    let _ = one.plus(two);
}

#[test]
fn summary_add_transcripts_add_up_at_the_edge() {
    let full = Summary {
        transcripts: u32::MAX,
        ..Summary::default()
    };
    let _ = full.plus(Summary::default());
}

#[test]
fn summary_add_transcripts_add_up_just_inside() {
    let almost = Summary {
        transcripts: u32::MAX - 2,
        ..Summary::default()
    };
    let one = Summary {
        transcripts: 1,
        ..Summary::default()
    };
    let _ = almost.plus(one);
}

#[test]
fn roots_from_env_does_not_panic() {
    let _ = Roots::from_env();
}

#[test]
fn roots_all_at_most_max_files() {
    let scratch = Scratch::new("all_cap");
    let roots = root_with_files(scratch.0.as_path(), 2);
    let _ = roots.all();
}

#[test]
fn roots_all_at_most_max_files_at_the_edge() {
    let scratch = Scratch::new("all_edge");
    let roots = root_with_files(scratch.0.as_path(), MAX_FILES);
    let _ = roots.all();
}

#[test]
fn roots_all_at_most_max_files_just_inside() {
    let scratch = Scratch::new("all_inside");
    let roots = root_with_files(scratch.0.as_path(), MAX_FILES - 1);
    let _ = roots.all();
}

#[test]
fn roots_all_at_most_max_files_just_outside() {
    let scratch = Scratch::new("all_outside");
    let roots = root_with_files(scratch.0.as_path(), MAX_FILES + 1);
    let _ = roots.all();
}

#[test]
fn roots_all_only_jsonl_files() {
    let scratch = Scratch::new("all_jsonl");
    let claude = scratch.0.join("claude");
    let project = claude.join("project");
    std::fs::create_dir_all(&project).unwrap();
    std::fs::write(project.join("a.jsonl"), b"").unwrap();
    std::fs::write(project.join("b.txt"), b"").unwrap();
    std::fs::write(project.join("c.json"), b"").unwrap();
    std::fs::create_dir_all(project.join("nested")).unwrap();
    std::fs::write(project.join("nested").join("d.jsonl"), b"").unwrap();
    std::fs::write(claude.join("loose.jsonl"), b"").unwrap();
    let pi = scratch.0.join("pi");
    std::fs::create_dir_all(pi.join("project")).unwrap();
    std::fs::write(pi.join("project").join("e.jsonl"), b"").unwrap();
    let roots = Roots { claude, pi };
    let _ = roots.all();
}

#[test]
fn roots_find_exact_and_suffix_session_file() {
    let scratch = Scratch::new("find_hit");
    let claude = scratch.0.join("claude");
    let project = claude.join("project");
    std::fs::create_dir_all(&project).unwrap();
    std::fs::write(project.join("s-42.jsonl"), b"").unwrap();
    std::fs::write(project.join("laptop_s-42.jsonl"), b"").unwrap();
    std::fs::write(project.join("xs-42y.jsonl"), b"").unwrap();
    let pi = scratch.0.join("pi");
    std::fs::create_dir_all(pi.join("project")).unwrap();
    std::fs::write(pi.join("project").join("s-43.jsonl"), b"").unwrap();
    let roots = Roots { claude, pi };
    let _ = roots.find("s-42");
    let _ = roots.find("s-43");
}

#[test]
fn roots_find_missing_or_hostile_session() {
    let scratch = Scratch::new("find_miss");
    let claude = scratch.0.join("claude");
    std::fs::create_dir_all(claude.join("project")).unwrap();
    std::fs::write(claude.join("project").join("a.jsonl"), b"").unwrap();
    let roots = Roots {
        claude,
        pi: scratch.0.join("missing"),
    };
    let _ = roots.find("no-such-session");
    let _ = roots.find("");
    let _ = roots.find("../outside");
    let nowhere = Roots {
        claude: scratch.0.join("no"),
        pi: scratch.0.join("nope"),
    };
    let _ = nowhere.find("any");
}

#[test]
fn looks_like_pi_outcome_table() {
    let cases: &[(&str, bool)] = &[
        (r#"{"type":"session"}"#, true),
        (
            r#"{"type":"session","id":"pi-1","timestamp":"2026-01-01T00:00:00.000Z"}"#,
            true,
        ),
        ("\n\n{\"type\":\"session\"}\n", true),
        ("   \n{\"type\":\"session\"}", true),
        ("not json\n{\"type\":\"session\"}", true),
        (
            "garbage line\n\n{\"type\":\"session\",\"id\":\"x\"}\n{\"type\":\"message\"}",
            true,
        ),
        (
            r#"{"type":"user","uuid":"u-1","timestamp":"2026-01-01T00:00:01.000Z","sessionId":"s-1","origin":{"kind":"human"}}"#,
            false,
        ),
        (r#"{"type":"assistant"}"#, false),
        (
            r#"{"type":"message","id":"m-1","message":{"role":"assistant"}}"#,
            false,
        ),
        (
            r#"{"id":"pi-1","timestamp":"2026-01-01T00:00:00.000Z"}"#,
            false,
        ),
        (r#"{"type":"sessionx"}"#, false),
        ("{\"type\":\"user\"}\n{\"type\":\"session\"}", false),
        ("", false),
        ("\n\n\n", false),
        ("plain text without json", false),
    ];
    for &(text, expected) in cases {
        assert_eq!(looks_like_pi(text), expected, "looks_like_pi({text:?})");
    }
}

#[test]
fn parse_claude_transcript() {
    let text = r#"{"sessionId":"sess-1","timestamp":"2026-01-01T00:00:00.000Z","cwd":"/tmp/proj"}
{"type":"assistant","uuid":"a-0","timestamp":"2026-01-01T00:00:01.000Z","sessionId":"sess-1","message":{"content":"stray answer"}}
{"type":"user","uuid":"u-1","timestamp":"2026-01-01T00:00:02.000Z","sessionId":"sess-1","origin":{"kind":"human"},"message":{"content":"hello there"}}
{"type":"assistant","uuid":"a-1","timestamp":"2026-01-01T00:00:03.000Z","sessionId":"sess-1","message":{"model":"claude-sonnet-4","content":[{"type":"text","text":"hi back"}],"usage":{"input_tokens":10,"output_tokens":20,"cache_read_input_tokens":5,"cache_creation_input_tokens":0}}}
{"type":"assistant","uuid":"a-2","timestamp":"2026-01-01T00:00:04.000Z","sessionId":"sess-1","message":{"model":"<synthetic>","content":[{"type":"tool_use","name":"Bash","input":{"command":"ls"}},{"type":"tool_result","content":"file list"}]}}
"#;
    let _ = parse(text, None);
}

#[test]
fn parse_pi_transcript() {
    let text = r#"{"type":"session","id":"pi-1","timestamp":"2026-01-01T00:00:00.000Z","cwd":"/tmp/proj"}
{"type":"message","id":"m-1","timestamp":"2026-01-01T00:00:01.000Z","message":{"role":"user","content":"hello pi"}}
{"type":"message","id":"m-2","timestamp":"2026-01-01T00:00:02.000Z","message":{"role":"assistant","model":"gpt-5.2","provider":"openai","content":[{"type":"text","text":"hi"}],"usage":{"input":1,"output":2,"cacheRead":3,"cacheWrite":4,"cost":{"total":0.01}}}}
{"type":"message","id":"m-3","timestamp":"2026-01-01T00:00:03.000Z","message":{"role":"assistant","content":[{"type":"toolCall","name":"Read","arguments":{"path":"/tmp/a"}},{"type":"text","role":"toolResult","text":"contents here"}]}}
{"type":"compaction","id":"c-1","timestamp":"2026-01-01T00:00:04.000Z","usage":{"input":5,"output":0,"cacheRead":0,"cacheWrite":0}}
"#;
    let _ = parse(text, Some("portatile"));
}

#[test]
fn parse_transcript_without_session() {
    let claude = r#"{"type":"user","uuid":"u-9","timestamp":"2026-01-01T00:00:01.000Z","origin":{"kind":"human"},"message":{"content":"hello"}}
{"type":"assistant","uuid":"a-9","timestamp":"2026-01-01T00:00:02.000Z","message":{"content":"back"},"usage":{"input_tokens":1,"output_tokens":1,"cache_read_input_tokens":0,"cache_creation_input_tokens":0}}
"#;
    let _ = parse(claude, None);
    let pi = r#"{"type":"message","id":"m-9","timestamp":"2026-01-01T00:00:01.000Z","message":{"role":"user","content":"hello"}}
"#;
    let _ = parse(pi, Some("laptop"));
}

#[test]
fn parse_malformed_text() {
    let _ = parse("", None);
    let _ = parse("\n\n   \n", None);
    let _ = parse("not json at all\n", Some("host"));
    let _ = parse(
        r#"null
42
"just a string"
[]
"#,
        None,
    );
    let _ = parse(r#"{"type":"session"}"#, None);
    let _ = parse(r#"{"type":"session","id":"x","timestamp":42}"#, None);
}

#[test]
fn modified_at_iso_with_milliseconds() {
    let scratch = Scratch::new("mtime_hit");
    let file = scratch.0.join("t.jsonl");
    std::fs::write(&file, b"").unwrap();
    let _ = modified_at(&file);
}

#[test]
fn modified_at_none_for_missing_path() {
    let scratch = Scratch::new("mtime_miss");
    let _ = modified_at(&scratch.0.join("no_such_file.jsonl"));
}

#[test]
fn hostname_no_empty_name_no_newline() {
    let _ = hostname();
}

#[test]
fn pi_exchange_id_matches_tl() {
    let opener = serde_json::json!({"type": "message", "id": "02bbcab0", "timestamp": "2026-06-21T17:21:18.789Z", "message": {"role": "user", "content": "x"}});
    let id = (crate::hist::ingest::formats::PI.exchange_id)(
        "019eeb1e-91c0-72e1-8280-9176550a7def",
        &opener,
    );
    assert_eq!(id.as_deref(), Some("1d3a3193-3890-d4e8-34de-a7d0ce92a67f"));
}

#[test]
fn split_known_counts_the_exchanges_already_archived() {
    let row = |id: &str| {
        let exchange: crate::hist::Exchange = serde_json::from_value(serde_json::json!({"id": id, "session": "s", "timestamp": "t", "kind": "chat", "actor": "a"})).unwrap();
        let contents = crate::hist::Contents {
            exchange_id: id.into(),
            input: String::new(),
            output: String::new(),
            tools: None,
        };
        (exchange, contents)
    };
    let (fresh, known) = crate::hist::ingest::split_known(
        vec![row("a"), row("b"), row("c")],
        &["b".into(), "z".into()],
    );
    assert_eq!(known, 1);
    assert_eq!(
        fresh.iter().map(|(e, _)| e.id.as_str()).collect::<Vec<_>>(),
        vec!["a", "c"]
    );
}
