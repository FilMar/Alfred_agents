use std::fmt::Write;

use crate::client::{Client, ClientError};

use super::{ReadReply, TocReply};

const SHORT_PAGE_CHARS: u32 = 4000;

pub async fn read(
    client: &Client,
    name: &str,
    heading: Option<&str>,
    all: bool,
) -> Result<String, ClientError> {
    let toc: Option<TocReply> = if heading.is_none() && !all {
        Some(client.get("/vault/toc", &[("name", name)]).await?)
    } else {
        None
    };
    let result: Result<String, ClientError> = match toc {
        Some(toc) if !shows_whole(&toc) => Ok(render_toc(name, &toc)),
        _ => {
            let mut query = vec![("name", name)];
            query.extend(heading.map(|h| ("id", h)));
            let reply: ReadReply = client.get("/vault/read", &query).await?;
            Ok(clean(&reply.text))
        }
    };
    result
}

pub(crate) fn shows_whole(toc: &TocReply) -> bool {
    is_index(&toc.path) || toc.chars <= SHORT_PAGE_CHARS || toc.headings.is_empty()
}

pub(crate) fn is_index(path: &str) -> bool {
    let mut parts = path.rsplit('/');
    let file = parts.next();
    let folder = parts.next();
    path == "index" || (folder.is_some() && folder == file)
}

pub(crate) fn render_toc(name: &str, toc: &TocReply) -> String {
    let mut result = format!(
        "{name}: {} characters. Read a section with: alfred vault read {name} <heading>\n\n",
        toc.chars
    );
    for h in &toc.headings {
        let (hashes, id, chars) = ("#".repeat(usize::from(h.level)), &h.id, h.chars);
        let _ = writeln!(result, "{hashes} {id}  {chars}");
    }
    debug_assert!(
        result.lines().count() == toc.headings.len() + 2,
        "render_toc: header, blank line, one line per heading"
    );
    result
}

pub(crate) fn clean(text: &str) -> String {
    let mut result = String::with_capacity(text.len());
    let mut rest = text.trim_matches('\n');
    while let Some(start) = rest.find("[[") {
        let Some(len) = rest[start + 2..].find("]]") else {
            break;
        };
        result.push_str(&rest[..start]);
        result.push_str(&readable(&rest[start + 2..start + 2 + len]));
        rest = &rest[start + len + 4..];
    }
    result.push_str(rest);
    result.push('\n');
    debug_assert!(!result.starts_with('\n'), "clean: no blank line at the top");
    result
}

fn readable(link: &str) -> String {
    match link.split_once('|') {
        Some((target, text)) => format!("{text} ({target})"),
        None => link.to_string(),
    }
}
