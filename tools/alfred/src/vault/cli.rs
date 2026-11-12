use std::fmt::Write;

use crate::client::{Client, ClientError};

use super::page::Heading;
use super::{ReadReply, TocReply};

pub async fn toc(client: &Client, name: &str) -> Result<String, ClientError> {
    let reply: Result<TocReply, ClientError> = client.get("/vault/toc", &[("name", name)]).await;
    let result: Result<String, ClientError> = reply.map(|r| render_toc(&r.headings));
    result
}

pub async fn read(client: &Client, name: &str, id: Option<&str>) -> Result<String, ClientError> {
    let mut query = vec![("name", name)];
    query.extend(id.map(|id| ("id", id)));
    let reply: Result<ReadReply, ClientError> = client.get("/vault/read", &query).await;
    let result: Result<String, ClientError> = reply.map(|r| r.text);
    result
}

pub(crate) fn render_toc(headings: &[Heading]) -> String {
    let mut result = String::new();
    for h in headings {
        let (hashes, id, chars) = ("#".repeat(usize::from(h.level)), &h.id, h.chars);
        let _ = writeln!(result, "{hashes} {id}  {chars}");
    }
    debug_assert!(
        result.lines().count() == headings.len(),
        "render_toc: one line per heading"
    );
    result
}
