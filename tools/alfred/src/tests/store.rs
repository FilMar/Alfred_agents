use crate::vault::VaultError;
use crate::vault::store::{Vault, check_name, is_published};

fn dir(name: &str) -> std::path::PathBuf {
    let root = std::env::temp_dir().join(format!("alfred-store-{}-{}", std::process::id(), name));
    let _ = std::fs::remove_dir_all(&root);
    std::fs::create_dir_all(&root).unwrap();
    root
}

fn file(root: &std::path::Path, rel: &str, text: &str) {
    let path = root.join(rel);
    std::fs::create_dir_all(path.parent().unwrap()).unwrap();
    std::fs::write(path, text).unwrap();
}

#[test]
#[should_panic(expected = "Vault.new: root is absolute")]
fn new_rejects_a_relative_root() {
    Vault::new(std::path::PathBuf::from("notes"));
}

#[test]
#[should_panic(expected = "is_published: path is relative")]
fn is_published_rejects_an_absolute_path() {
    is_published(std::path::Path::new("/notes/page.md"));
}

#[test]
fn is_published_classifies_quartz_exclusions() {
    assert!(is_published(std::path::Path::new("page.md")));
    assert!(is_published(std::path::Path::new("dir/page.md")));
    assert!(is_published(std::path::Path::new("a/b/c/page.md")));
    assert!(is_published(std::path::Path::new("templates.md")));
    assert!(!is_published(std::path::Path::new("page.txt")));
    assert!(!is_published(std::path::Path::new("page")));
    assert!(!is_published(std::path::Path::new("page.md.txt")));
    assert!(!is_published(std::path::Path::new("private/page.md")));
    assert!(!is_published(std::path::Path::new("templates/page.md")));
    assert!(!is_published(std::path::Path::new(".obsidian/page.md")));
    assert!(!is_published(std::path::Path::new("notes/private/page.md")));
    assert!(!is_published(std::path::Path::new("a/b/templates/page.md")));
    assert!(!is_published(std::path::Path::new("a/.obsidian/page.md")));
    assert!(!is_published(std::path::Path::new("README.md")));
    assert!(!is_published(std::path::Path::new("CLAUDE.md")));
    assert!(!is_published(std::path::Path::new("ROADMAP.md")));
    assert!(!is_published(std::path::Path::new("dir/README.md")));
    assert!(!is_published(std::path::Path::new("a/b/CLAUDE.md")));
    assert!(!is_published(std::path::Path::new("a/ROADMAP.md")));
}

#[test]
fn check_name_classifies_bad_names() {
    assert!(check_name("page").is_ok());
    assert!(check_name("dir/page").is_ok());
    assert!(check_name("a/b/c/page").is_ok());
    assert!(check_name("a..b").is_ok());
    assert!(check_name("..").is_err());
    assert!(check_name("../page").is_err());
    assert!(check_name("dir/../page").is_err());
    assert!(check_name("a/../../b").is_err());
    assert!(check_name("/page").is_err());
    assert!(check_name("/dir/page").is_err());
}

#[test]
fn pages_are_relative_to_the_root() {
    let root = dir("pages-relative");
    file(&root, "page.md", "# Page\n");
    file(&root, "a/b/nested.md", "# Nested\n");
    let vault = Vault::new(root);
    let _ = vault.toc("page");
}

#[test]
fn find_paths_stay_inside_the_root() {
    let root = dir("find-inside");
    file(&root, "dir/sub/page.md", "# Page\n");
    let vault = Vault::new(root);
    let _ = vault.read("dir/sub/page", Some("page"));
}

#[test]
fn find_paths_are_published() {
    let root = dir("find-published");
    file(&root, "page.md", "# Page\n");
    file(&root, "private/page.md", "# Private\n");
    file(&root, "templates/page.md", "# Template\n");
    file(&root, ".obsidian/page.md", "# Config\n");
    let vault = Vault::new(root);
    let _ = vault.toc("page");
}

#[test]
fn page_is_never_a_draft() {
    let root = dir("never-draft");
    file(&root, "page.md", "---\ndraft: true\n---\n# Page\n");
    let vault = Vault::new(root);
    let _ = vault.toc("page");
}

#[test]
fn read_outcome_table() {
    let root = dir("outcomes");
    file(&root, "page.md", "---\ntitle: P\n---\n# Page\n\nText.\n");
    file(&root, "draft.md", "---\ndraft: true\n---\n# Draft\n");
    file(&root, "private/hidden.md", "# Hidden\n");
    file(&root, "a/storia.md", "# A\n");
    file(&root, "b/storia.md", "# B\n");
    let vault = Vault::new(root);
    assert_eq!(vault.read("page", None).unwrap(), "# Page\n\nText.\n");
    assert_eq!(
        vault.read("page", Some("page")).unwrap(),
        "# Page\n\nText.\n"
    );
    assert_eq!(vault.read("a/storia", None).unwrap(), "# A\n");
    assert!(matches!(
        vault.read("page", Some("nope")),
        Err(VaultError::NoSection { .. })
    ));
    assert!(matches!(
        vault.read("missing", None),
        Err(VaultError::NoPage(_))
    ));
    assert!(matches!(
        vault.read("draft", None),
        Err(VaultError::NoPage(_))
    ));
    assert!(matches!(
        vault.read("hidden", None),
        Err(VaultError::NoPage(_))
    ));
    assert!(matches!(
        vault.read("private/hidden", None),
        Err(VaultError::NoPage(_))
    ));
    assert!(matches!(
        vault.read("../page", None),
        Err(VaultError::BadName(_))
    ));
    match vault.read("storia", None) {
        Err(VaultError::Ambiguous { paths, .. }) => assert_eq!(paths, vec!["a/storia", "b/storia"]),
        other => panic!("expected Ambiguous, got {other:?}"),
    }
}
