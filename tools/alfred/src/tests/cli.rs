use crate::vault::TocReply;
use crate::vault::cli::{clean, is_index, render_toc, shows_whole};
use crate::vault::page::Heading;

fn heading(level: u8, id: &str, chars: u32) -> Heading {
    Heading {
        level,
        id: id.into(),
        title: id.into(),
        chars,
    }
}

fn toc(path: &str, chars: u32, headings: Vec<Heading>) -> TocReply {
    TocReply {
        path: path.into(),
        chars,
        headings,
    }
}

#[test]
fn render_toc_of_no_headings() {
    render_toc("p", &toc("p", 0, vec![]));
}

#[test]
fn render_toc_table() {
    let reply = toc(
        "a/p",
        5000,
        vec![heading(1, "alpha", 37), heading(2, "beta", 19)],
    );
    assert_eq!(
        render_toc("p", &reply),
        "p: 5000 characters. Read a section with: alfred vault read p <heading>\n\n# alpha  37\n## beta  19\n"
    );
}

#[test]
fn is_index_table() {
    assert!(is_index("index"));
    assert!(is_index("MoP/MoP"));
    assert!(is_index("wandering_sun/wandering_sun"));
    assert!(!is_index("MoP/chapter_01"));
    assert!(!is_index("MoP"));
    assert!(!is_index("a/index"));
}

#[test]
fn shows_whole_table() {
    let long = || vec![heading(2, "a", 10)];
    assert!(shows_whole(&toc("index", 9000, long())));
    assert!(shows_whole(&toc("x/p", 4000, long())));
    assert!(!shows_whole(&toc("x/p", 4001, long())));
    assert!(shows_whole(&toc("x/p", 9000, vec![])));
}

#[test]
fn clean_table() {
    assert_eq!(
        clean("\nProgetti:\n\n- [[MoP|Meaning of Power]]: romanzo.\n\n"),
        "Progetti:\n\n- Meaning of Power (MoP): romanzo.\n"
    );
    assert_eq!(
        clean("[[logic_xor#Tavola di verità|Tavola]] e [[storia]]"),
        "Tavola (logic_xor#Tavola di verità) e storia\n"
    );
    assert_eq!(clean("open [[ link"), "open [[ link\n");
}
