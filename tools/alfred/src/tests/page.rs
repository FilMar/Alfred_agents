use crate::vault::page::{Page, heading_id};

fn seen(ids: &[&str]) -> std::collections::HashSet<String> {
    ids.iter().copied().map(String::from).collect()
}

#[test]
fn parse_body_is_the_text_after_the_frontmatter() {
    let _ = Page::parse(
        r"---
title: Nota
draft: false
---
# Nota

Corpo.
",
    );
}

#[test]
fn parse_body_without_frontmatter() {
    let _ = Page::parse(
        r"# Nota

Corpo.
",
    );
}

#[test]
fn parse_body_with_empty_frontmatter() {
    let _ = Page::parse(
        r"---
---
# Nota
",
    );
}

#[test]
fn parse_body_with_unterminated_frontmatter() {
    let _ = Page::parse(
        r"---
title: Nota
# Corpo
",
    );
}

#[test]
fn parse_body_with_a_break_inside() {
    let _ = Page::parse(
        r"# Nota

---

Corpo.
",
    );
}

#[test]
fn toc_ids_are_unique() {
    let page = Page::parse(
        r"# A B

# a-b

# Alpha

# Alpha
",
    );
    let _ = page.toc();
}

#[test]
fn toc_levels_at_the_edges() {
    let page = Page::parse(
        r"# Uno

###### Sei
",
    );
    let _ = page.toc();
}

#[test]
fn toc_levels_just_inside_the_edges() {
    let page = Page::parse(
        r"## Due

##### Cinque
",
    );
    let _ = page.toc();
}

#[test]
fn toc_level_seven_is_outside() {
    let page = Page::parse("####### Sette\n");
    let _ = page.toc();
}

#[test]
fn toc_chars_fit_the_body() {
    let page = Page::parse(&format!("# Titolo\n{}", "à".repeat(60)));
    let _ = page.toc();
}

#[test]
fn toc_of_a_page_without_headings() {
    let page = Page::parse("Solo testo, nessun titolo.\n");
    let _ = page.toc();
}

#[test]
fn section_is_a_slice_of_the_body() {
    let page = Page::parse(
        r"# Alpha

Prima.

## Beta

Seconda.

# Gamma

Terza.
",
    );
    let _ = page.section("alpha");
}

#[test]
fn section_of_a_missing_id() {
    let page = Page::parse(
        r"# Alpha

Prima.
",
    );
    let _ = page.section("non-esiste");
}

#[test]
fn heading_id_is_not_seen_before() {
    let taken = seen(&["titolo"]);
    let _ = heading_id("Titolo", &taken);
}

#[test]
fn heading_id_has_no_whitespace() {
    let taken = seen(&[]);
    let _ = heading_id("Due parole", &taken);
}

#[test]
fn heading_id_table() {
    assert_eq!(
        heading_id("2. I Pianeti Gemelli", &seen(&[])),
        "2-i-pianeti-gemelli"
    );
    assert_eq!(
        heading_id("3. La Fusione: L’Evento Fondante", &seen(&[])),
        "3-la-fusione-levento-fondante"
    );
    assert_eq!(
        heading_id("WANDERING SUN ESSENTIALS", &seen(&[])),
        "wandering-sun-essentials"
    );
    assert_eq!(heading_id("Titolo", &seen(&["titolo"])), "titolo-1");
    assert_eq!(
        heading_id("Titolo", &seen(&["titolo", "titolo-1"])),
        "titolo-2"
    );
    assert_eq!(heading_id("a b", &seen(&[])), "a-b");
    assert_eq!(heading_id("a-b_c", &seen(&[])), "a-b_c");
    assert_eq!(heading_id("Caffè 2", &seen(&[])), "caffè-2");
    assert_eq!(heading_id("punto, virgola!", &seen(&[])), "punto-virgola");
}

#[test]
fn is_draft_table() {
    assert!(Page::parse("---\ndraft: true\n---\n# Nota\n").is_draft());
    assert!(Page::parse("---\ndraft: 'true'\n---\n# Nota\n").is_draft());
    assert!(Page::parse("---\ntitle: Nota\ndraft: true\n---\n# Nota\n").is_draft());
    assert!(!Page::parse("---\ndraft: false\n---\n# Nota\n").is_draft());
    assert!(!Page::parse("---\ntitle: Nota\n---\n# Nota\n").is_draft());
    assert!(!Page::parse("# Nota\n").is_draft());
}

const SECTIONS: &str = "Intro.\n\n# Alpha\n\nPrima.\n\n## Beta\n\nSeconda.\n\n# Gamma\n\nTerza.\n\n## Titolo Doppio\n\nUno.\n\n## Titolo Doppio\n\nDue.\n";

#[test]
fn section_table() {
    let page = Page::parse(SECTIONS);
    assert_eq!(
        page.section("alpha"),
        Some("# Alpha\n\nPrima.\n\n## Beta\n\nSeconda.\n\n")
    );
    assert_eq!(page.section("beta"), Some("## Beta\n\nSeconda.\n\n"));
    assert_eq!(page.section("titolo-doppio"), page.section("Titolo Doppio"));
    assert_eq!(page.section("intro"), None);
    assert_eq!(page.section("Beta"), page.section("beta"));
    assert_eq!(
        page.section("Titolo Doppio"),
        Some("## Titolo Doppio\n\nUno.\n\n")
    );
    assert_eq!(
        page.section("titolo-doppio-1"),
        Some("## Titolo Doppio\n\nDue.\n")
    );
}

#[test]
fn toc_table() {
    let rows: Vec<(u8, String, String, u32)> = Page::parse(SECTIONS)
        .toc()
        .into_iter()
        .map(|h| (h.level, h.id, h.title, h.chars))
        .collect();
    assert_eq!(
        rows,
        vec![
            (1, "alpha".into(), "Alpha".into(), 36),
            (2, "beta".into(), "Beta".into(), 19),
            (1, "gamma".into(), "Gamma".into(), 64),
            (2, "titolo-doppio".into(), "Titolo Doppio".into(), 24),
            (2, "titolo-doppio-1".into(), "Titolo Doppio".into(), 23),
        ]
    );
}

#[test]
fn parse_drops_the_frontmatter() {
    assert_eq!(
        Page::parse("---\ntitle: Nota\n---\n# Nota\n").body(),
        "# Nota\n"
    );
    assert_eq!(
        Page::parse("# Nota\n\n---\n\nCorpo.\n").body(),
        "# Nota\n\n---\n\nCorpo.\n"
    );
}

#[test]
fn toc_skips_hashes_in_code_and_reads_setext() {
    let ids: Vec<String> =
        Page::parse("Titolo\n======\n\n```bash\n# non un titolo\n```\n\n## `codice` e testo\n")
            .toc()
            .into_iter()
            .map(|h| h.id)
            .collect();
    assert_eq!(ids, vec!["titolo", "codice-e-testo"]);
}
