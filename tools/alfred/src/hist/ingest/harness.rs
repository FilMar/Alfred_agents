use serde_json::Value;

use super::line::{Line, Part, Usage};
use super::transcript::{SessionHead, stringify};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Harness {
    Claude,
    Pi,
}

impl Harness {
    pub const fn name(self) -> &'static str {
        match self {
            Harness::Claude => "claude",
            Harness::Pi => "pi",
        }
    }

    pub fn is_opener(self, l: &Line) -> bool {
        match self {
            Harness::Claude => l.is("user") && l.origin_kind().is_some(),
            Harness::Pi => l.is("message") && l.role() == Some("user"),
        }
    }

    pub fn is_answer(self, l: &Line) -> bool {
        match self {
            Harness::Claude => l.is("assistant"),
            Harness::Pi => l.is("message") && l.role() == Some("assistant"),
        }
    }

    pub fn injected(self, l: &Line) -> &[String] {
        match self {
            Harness::Claude => l.hook_context("UserPromptSubmit"),
            Harness::Pi => &[],
        }
    }

    pub fn spends(self, l: &Line) -> bool {
        self.is_answer(l) || (self == Harness::Pi && l.is("compaction"))
    }

    pub fn usage(self, l: &Line) -> Option<&Usage> {
        match self {
            Harness::Claude => l.message_usage(),
            Harness::Pi => l.message_usage().or(l.usage.as_ref()),
        }
    }

    pub fn tokens(self, u: &Usage) -> [i64; 4] {
        let raw = match self {
            Harness::Claude => [
                u.input_tokens,
                u.output_tokens,
                u.cache_read_input_tokens,
                u.cache_creation_input_tokens,
            ],
            Harness::Pi => [u.input, u.output, u.cache_read, u.cache_write],
        };
        raw.map(|n| n.unwrap_or(0))
    }

    pub fn part_text(self, p: &Part, role: Option<&str>) -> Option<String> {
        let hidden = self == Harness::Pi && role == Some("toolResult");
        (p.is("text") && !hidden).then(|| p.text().to_string())
    }

    pub fn part_tool(self, p: &Part, role: Option<&str>) -> Option<String> {
        match (self, p.kind.as_deref()?) {
            (Harness::Claude, "tool_use") => Some(format!(
                "[tool {}] {}",
                p.name(),
                stringify(p.input.as_ref())
            )),
            (Harness::Claude, "tool_result") => {
                Some(format!("[result] {}", stringify(p.content.as_ref())))
            }
            (Harness::Pi, "toolCall") => Some(format!(
                "[tool {}] {}",
                p.name(),
                stringify(p.arguments.as_ref().or(p.input.as_ref()))
            )),
            (Harness::Pi, "text") if role == Some("toolResult") => {
                Some(format!("[result] {}", p.text()))
            }
            _ => None,
        }
    }

    pub fn session(self, lines: &[Line]) -> Option<SessionHead> {
        let head = |l: &Line, id: Option<&str>| {
            let cwd = l.cwd.clone().filter(|cwd| !cwd.is_empty());
            Some(SessionHead {
                id: id?.to_string(),
                started: l.timestamp.clone()?,
                cwd,
            })
        };
        match self {
            Harness::Claude => lines.iter().find_map(|l| head(l, l.session_id.as_deref())),
            Harness::Pi => lines
                .iter()
                .filter(|l| l.is("session"))
                .find_map(|l| head(l, l.id.as_deref())),
        }
    }

    pub fn exchange_id(self, session: &str, opener: &Line) -> Option<String> {
        match self {
            Harness::Claude => opener.session_id.as_ref().and(opener.uuid.clone()),
            Harness::Pi => Some(crate::hist::episodes::derived_id(
                session,
                opener.id.as_deref()?,
            )),
        }
    }

    pub fn meta(self, opener: &Line, body: &[&Line]) -> Option<Value> {
        match self {
            Harness::Claude => opener
                .origin_kind()
                .filter(|k| !k.is_empty())
                .map(|k| serde_json::json!({ "trigger": k })),
            Harness::Pi => {
                let cost: f64 = body
                    .iter()
                    .filter_map(|l| self.usage(l)?.cost.as_ref()?.total)
                    .sum();
                let meta = serde_json::json!({
                    "source_id": opener.id.clone()?,
                    "provider": self.last_answer(body, Line::provider).next(),
                    "cost_usd": (cost > 0.0).then_some(cost),
                });
                let set = meta.as_object()?.iter().filter(|(_, v)| !v.is_null());
                Some(Value::Object(
                    set.map(|(k, v)| (k.clone(), v.clone())).collect(),
                ))
            }
        }
    }

    pub fn model(self, body: &[&Line]) -> Option<String> {
        let model = match self {
            Harness::Claude => self
                .last_answer(body, Line::model)
                .find(|m| !m.starts_with('<')),
            Harness::Pi => self.last_answer(body, Line::model).next(),
        };
        model.map(str::to_string)
    }

    pub fn text_of(self, line: &Line) -> String {
        match line.text() {
            Some(text) => text.to_string(),
            None => line
                .parts()
                .iter()
                .filter_map(|p| self.part_text(p, line.role()))
                .filter(|t| !t.is_empty())
                .collect::<Vec<_>>()
                .join("\n"),
        }
    }

    pub fn tools_of(self, line: &Line) -> String {
        line.parts()
            .iter()
            .filter_map(|p| self.part_tool(p, line.role()))
            .collect::<Vec<_>>()
            .join("\n")
    }

    pub fn tokens_of(self, body: &[&Line]) -> [i64; 4] {
        let each = body
            .iter()
            .filter(|l| self.spends(l))
            .filter_map(|l| self.usage(l))
            .map(|u| self.tokens(u));
        each.fold([0; 4], |acc, t| {
            [acc[0] + t[0], acc[1] + t[1], acc[2] + t[2], acc[3] + t[3]]
        })
    }

    fn last_answer<'a>(
        self,
        body: &[&'a Line],
        field: fn(&Line) -> Option<&str>,
    ) -> impl Iterator<Item = &'a str> {
        body.iter()
            .rev()
            .filter(move |l| self.is_answer(l))
            .filter_map(move |l| field(l))
    }
}
