use crate::command::skill::Skill;

fn temp(name: &str) -> std::path::PathBuf {
    let dir = std::env::temp_dir().join(format!("command-skill-{name}"));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).unwrap();
    dir
}

fn write_skill(root: &std::path::Path, name: &str, body: &str) -> std::path::PathBuf {
    let dir = root.join(name);
    std::fs::create_dir_all(&dir).unwrap();
    std::fs::write(dir.join("SKILL.md"), body).unwrap();
    dir
}

#[test]
fn roots_lists_cwd_skills_then_home_agent_skills() {
    let roots = Skill::roots(
        std::path::Path::new("/proj"),
        std::path::Path::new("/home/u"),
    );
    assert_eq!(
        roots,
        vec![
            std::path::PathBuf::from("/proj/.pi/skills"),
            std::path::PathBuf::from("/home/u/.pi/agent/skills"),
        ]
    );
}

#[test]
fn find_takes_the_first_root_with_the_skill() {
    let first = temp("first_a");
    let second = temp("first_b");
    write_skill(&first, "ritchie", "first body");
    write_skill(&second, "ritchie", "second body");
    let skill = Skill::find("ritchie", &[first.clone(), second]).unwrap();
    assert_eq!(skill.name(), "ritchie");
    assert_eq!(skill.file(), first.join("ritchie").join("SKILL.md"));
}

#[test]
fn find_skips_a_root_without_the_skill() {
    let empty = temp("skip_empty");
    let filled = temp("skip_filled");
    write_skill(&filled, "ritchie", "body");
    let skill = Skill::find("ritchie", &[empty, filled.clone()]).unwrap();
    assert_eq!(skill.file(), filled.join("ritchie").join("SKILL.md"));
}

#[test]
fn find_wants_the_skill_md_not_its_folder() {
    let root = temp("folder_only");
    std::fs::create_dir_all(root.join("ritchie")).unwrap();
    let error = Skill::find("ritchie", &[root]).unwrap_err();
    assert_eq!(error.to_string(), "Skill \"ritchie\" not found");
}

#[test]
fn find_errors_when_the_skill_is_nowhere() {
    let empty = temp("nowhere");
    let ghost = std::env::temp_dir().join("command-skill-nowhere-ghost");
    let error = Skill::find("nope", &[empty, ghost]).unwrap_err();
    assert_eq!(error.to_string(), "Skill \"nope\" not found");
}

#[test]
fn find_errors_without_roots() {
    let error = Skill::find("nope", &[]).unwrap_err();
    assert_eq!(error.to_string(), "Skill \"nope\" not found");
}

#[test]
fn block_wraps_name_location_base_and_body() {
    let root = temp("block_wraps");
    let dir = write_skill(&root, "ritchie", "hello");
    let skill = Skill::find("ritchie", &[root]).unwrap();
    let block = skill.block("hello");
    assert_eq!(
        block,
        format!(
            "<skill name=\"ritchie\" location=\"{file}\">\nReferences inside this skill are relative to {base} — resolve them against it.\n\n{body}\n</skill>",
            file = dir.join("SKILL.md").display(),
            base = dir.display(),
            body = "hello",
        )
    );
}

#[test]
fn block_trims_the_body() {
    let root = temp("block_trims");
    let dir = write_skill(&root, "edison", "  line one\nline two  \n");
    let skill = Skill::find("edison", &[root]).unwrap();
    let block = skill.block("  line one\nline two  \n");
    assert_eq!(
        block,
        format!(
            "<skill name=\"edison\" location=\"{file}\">\nReferences inside this skill are relative to {base} — resolve them against it.\n\n{body}\n</skill>",
            file = dir.join("SKILL.md").display(),
            base = dir.display(),
            body = "line one\nline two",
        )
    );
}
