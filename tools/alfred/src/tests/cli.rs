use crate::vault::cli::render_toc;
use crate::vault::page::Heading;

fn heading(level: u8, id: &str, title: &str, chars: u32) -> Heading {
    Heading {
        level,
        id: id.into(),
        title: title.into(),
        chars,
    }
}

#[test]
fn render_toc_of_no_headings() {
    render_toc(&[]);
}

#[test]
fn render_toc_table() {
    let rows = [
        heading(1, "alpha", "Alpha", 37),
        heading(2, "beta", "Beta", 19),
    ];
    assert_eq!(render_toc(&rows), "# alpha  37\n## beta  19\n");
}
