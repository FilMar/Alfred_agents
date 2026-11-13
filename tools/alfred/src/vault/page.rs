use std::collections::HashSet;
use std::ops::Range;

use pulldown_cmark::{Event, Parser, Tag, TagEnd};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Heading {
    pub level: u8,
    pub id: String,
    pub title: String,
    pub chars: u32,
}

#[derive(Debug)]
pub struct Page {
    body: String,
    draft: bool,
}

struct Span {
    heading: Heading,
    range: Range<usize>,
}

impl Page {
    pub fn parse(text: &str) -> Page {
        let result: Page = {
            let mut draft = false;
            let mut body_start = 0;
            if text.starts_with("---\n") {
                let mut pos = 4;
                for line in text[pos..].split_inclusive('\n') {
                    if line == "---\n" || line == "---" {
                        body_start = pos + line.len();
                        draft = text[4..pos]
                            .lines()
                            .filter_map(|l| l.trim().strip_prefix("draft:"))
                            .any(|value| matches!(value.trim(), "true" | "'true'"));
                        break;
                    }
                    pos += line.len();
                }
            }
            Page {
                body: text[body_start..].to_string(),
                draft,
            }
        };
        debug_assert!(
            text.ends_with(&result.body),
            "Page.parse: body is the text after the frontmatter"
        );
        result
    }

    pub fn body(&self) -> &str {
        &self.body
    }

    pub fn is_draft(&self) -> bool {
        self.draft
    }

    pub fn toc(&self) -> Vec<Heading> {
        let result: Vec<Heading> = self.spans().into_iter().map(|span| span.heading).collect();
        debug_assert!(ids_unique(&result), "Page.toc: ids are unique");
        debug_assert!(
            chars_fit(&result, &self.body),
            "Page.toc: no section is longer than the body"
        );
        result
    }

    pub fn section(&self, id: &str) -> Option<&str> {
        let key = heading_id(id, &HashSet::new());
        let result = self
            .spans()
            .into_iter()
            .find(|s| s.heading.id == key)
            .map(|s| &self.body[s.range]);
        debug_assert!(
            result.is_none_or(|s| is_slice_of(s, &self.body)),
            "Page.section: section is a slice of the body"
        );
        result
    }

    fn spans(&self) -> Vec<Span> {
        let body = self.body.as_str();
        let mut heads: Vec<(u8, String, usize)> = Vec::new();
        let mut open: Option<(u8, String, usize)> = None;
        for (event, range) in Parser::new(body).into_offset_iter() {
            match event {
                Event::Start(Tag::Heading { level, .. }) => {
                    open = Some((level as u8, String::new(), range.start));
                }
                Event::Text(text) | Event::Code(text) => {
                    if let Some((_, title, _)) = open.as_mut() {
                        title.push_str(&text);
                    }
                }
                Event::End(TagEnd::Heading(_)) => heads.extend(open.take()),
                _ => {}
            }
        }
        let mut seen: HashSet<String> = HashSet::new();
        let mut result: Vec<Span> = Vec::with_capacity(heads.len());
        for (i, (level, title, start)) in heads.iter().enumerate() {
            let end = heads[i + 1..]
                .iter()
                .find(|(next, _, _)| next <= level)
                .map_or(body.len(), |(_, _, from)| *from);
            let id = heading_id(title, &seen);
            seen.insert(id.clone());
            let chars = u32::try_from(body[*start..end].chars().count()).unwrap_or(u32::MAX);
            let heading = Heading {
                level: *level,
                id,
                title: title.trim().to_string(),
                chars,
            };
            result.push(Span {
                heading,
                range: *start..end,
            });
        }
        debug_assert!(
            result.iter().all(|s| s.range.end <= self.body.len()),
            "Page.spans: ranges inside the body"
        );
        result
    }
}

pub(crate) fn heading_id(title: &str, seen: &HashSet<String>) -> String {
    let base: String = title
        .chars()
        .filter(|c| c.is_alphanumeric() || c.is_whitespace() || matches!(c, '-' | '_'))
        .flat_map(|c| {
            if c.is_whitespace() {
                vec!['-']
            } else {
                c.to_lowercase().collect()
            }
        })
        .collect();
    let result = if seen.contains(&base) {
        (1..=seen.len() + 1)
            .map(|n| format!("{base}-{n}"))
            .find(|id| !seen.contains(id))
            .unwrap_or(base)
    } else {
        base
    };
    debug_assert!(!seen.contains(&result), "heading_id: id not seen before");
    debug_assert!(
        !result.contains(char::is_whitespace),
        "heading_id: no whitespace"
    );
    result
}

fn ids_unique(headings: &[Heading]) -> bool {
    let mut seen = HashSet::new();
    headings.iter().all(|h| seen.insert(h.id.as_str()))
}

fn chars_fit(headings: &[Heading], body: &str) -> bool {
    let total = body.chars().count();
    headings.iter().all(|h| h.chars as usize <= total)
}

fn is_slice_of(part: &str, whole: &str) -> bool {
    let start = part.as_ptr() as usize;
    let base = whole.as_ptr() as usize;
    start >= base && start + part.len() <= base + whole.len()
}
