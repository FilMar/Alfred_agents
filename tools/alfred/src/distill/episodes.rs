use serde_json::Value;

use super::ask::Answer;
use super::config::Extractor;
use super::session::{SessionRead, Turn};
use crate::chat::Chat;
use crate::hist::Episode as Stored;

pub const MAP_HEADER: &str =
    "## The whole session, episode by episode (later episodes can deny claims made earlier)";

#[derive(Debug, Clone, PartialEq)]
pub struct Episode {
    from: u32,
    to: u32,
    summary: String,
    turns: Vec<Turn>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct SessionMap {
    session: String,
    episodes: Vec<Episode>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Split {
    pub answer: Answer,
    pub map: Option<SessionMap>,
}

impl Episode {
    pub fn of(from: u32, to: u32, summary: String, turns: Vec<Turn>) -> Episode {
        debug_assert!(from <= to, "Episode.of: from is at most to");
        debug_assert!(
            !summary.trim().is_empty(),
            "Episode.of: the summary is not blank"
        );
        debug_assert!(
            turns.len() == (to - from + 1) as usize,
            "Episode.of: one turn per index"
        );
        Episode {
            from,
            to,
            summary,
            turns,
        }
    }

    pub fn from(&self) -> u32 {
        self.from
    }

    pub fn to(&self) -> u32 {
        self.to
    }

    pub fn summary(&self) -> &str {
        &self.summary
    }

    pub fn turns(&self) -> &[Turn] {
        &self.turns
    }
}

impl SessionMap {
    pub async fn split(read: &SessionRead, extractor: &Extractor, chat: &Chat) -> Split {
        debug_assert!(
            !read.whole().is_empty(),
            "SessionMap.split: the session has turns"
        );
        let config = extractor.config();
        let listing = SessionMap::listing(&read.whole(), config.listing_chars);
        let check = |json: &Value| SessionMap::check(json, turn_count(read));
        let answer = super::ask::ask(chat, &config.episodes, &listing, &check).await;
        let map = answer
            .is_ok()
            .then(|| SessionMap::from_json(answer.json(), read));
        let result: Split = Split { answer, map };
        debug_assert!(
            result.map.is_some() == result.answer.is_ok(),
            "SessionMap.split: a map exactly when the answer is ok"
        );
        result
    }

    pub fn listing(turns: &[&Turn], listing_chars: u32) -> String {
        debug_assert!(!turns.is_empty(), "SessionMap.listing: there are turns");
        debug_assert!(
            listing_chars > 0,
            "SessionMap.listing: listing_chars is positive"
        );
        let result: String = turns
            .iter()
            .enumerate()
            .map(|(k, turn)| {
                format!(
                    "{k}: USER: {}\n   AGENT: {}",
                    serde_json::to_string(cut(turn.input(), listing_chars)).unwrap(),
                    serde_json::to_string(cut(turn.output(), listing_chars)).unwrap()
                )
            })
            .collect::<Vec<_>>()
            .join("\n");
        debug_assert!(
            result.split('\n').count() == 2 * turns.len(),
            "SessionMap.listing: two lines per turn"
        );
        result
    }

    pub fn check(json: &Value, turn_count: u32) -> Option<String> {
        debug_assert!(turn_count > 0, "SessionMap.check: turn_count is positive");
        let result: Option<String> = match json.get("episodes").and_then(Value::as_array) {
            Some(episodes) if !episodes.is_empty() => {
                let last = turn_count - 1;
                let end = episodes.iter().try_fold(0_u64, |expected, episode| {
                    let from = episode.get("from").and_then(Value::as_u64);
                    let to = episode.get("to").and_then(Value::as_u64);
                    let summary = episode.get("summary").and_then(Value::as_str);
                    match to {
                        Some(to) if episode.is_object() && from == Some(expected) && to >= expected => {
                            if summary.is_none_or(|s| s.trim().is_empty()) {
                                Err("every episode needs a summary".to_string())
                            } else {
                                Ok(to + 1)
                            }
                        }
                        _ => Err(format!(
                            "episodes must cover 0..{last} in order with no gap: expected from={expected}"
                        )),
                    }
                });
                match end {
                    Err(error) => Some(error),
                    Ok(end) if end == u64::from(turn_count) => None,
                    Ok(_) => Some(format!("the last episode must end at {last}")),
                }
            }
            _ => Some("need list `episodes`".to_string()),
        };
        result
    }

    pub fn from_json(json: &Value, read: &SessionRead) -> SessionMap {
        debug_assert!(
            SessionMap::check(json, turn_count(read)).is_none(),
            "SessionMap.from_json: the json passes the check"
        );
        let whole = read.whole();
        let result: SessionMap = SessionMap {
            session: read.session().to_string(),
            episodes: json
                .get("episodes")
                .and_then(Value::as_array)
                .unwrap()
                .iter()
                .map(|episode| {
                    let from = episode.get("from").and_then(Value::as_u64).unwrap() as u32;
                    let to = episode.get("to").and_then(Value::as_u64).unwrap() as u32;
                    let summary = episode.get("summary").and_then(Value::as_str).unwrap();
                    let turns = (from..=to).map(|k| whole[k as usize].clone()).collect();
                    Episode::of(from, to, summary.to_string(), turns)
                })
                .collect(),
        };
        debug_assert!(
            covers(&result.episodes, turn_count(read)),
            "SessionMap.from_json: the episodes cover every turn in order"
        );
        result
    }

    pub fn session(&self) -> &str {
        &self.session
    }

    pub fn episodes(&self) -> &[Episode] {
        &self.episodes
    }

    pub fn text(&self) -> String {
        let result: String = std::iter::once(MAP_HEADER.to_string())
            .chain(
                self.episodes
                    .iter()
                    .map(|e| format!("- [{}-{}] {}", e.from, e.to, e.summary)),
            )
            .collect::<Vec<_>>()
            .join("\n");
        debug_assert!(
            result.starts_with(MAP_HEADER),
            "SessionMap.text: the header first"
        );
        result
    }

    pub fn stored(&self, extractor: i64, model: &str, created: &str) -> Vec<Stored> {
        let result: Vec<Stored> = self
            .episodes
            .iter()
            .map(|episode| {
                let turns = &episode.turns;
                Stored {
                    id: crate::hist::episodes::derived_id(&self.session, turns[0].id()),
                    session: self.session.clone(),
                    exchanges: turns.iter().map(|turn| turn.id().to_string()).collect(),
                    from: turns[0].timestamp().to_string(),
                    to: turns[turns.len() - 1].timestamp().to_string(),
                    summary: episode.summary.clone(),
                    extractor,
                    model: model.to_string(),
                    created: created.to_string(),
                }
            })
            .collect();
        debug_assert!(
            result.len() == self.episodes.len(),
            "SessionMap.stored: one stored episode per episode"
        );
        debug_assert!(
            result.iter().all(|e| e.session == self.session),
            "SessionMap.stored: every episode is of the session"
        );
        result
    }
}

pub fn cut(text: &str, chars: u32) -> &str {
    debug_assert!(chars > 0, "cut: chars is positive");
    let result: &str = match text.char_indices().nth(chars as usize) {
        Some((end, _)) => &text[..end],
        None => text,
    };
    debug_assert!(
        result.chars().count() <= chars as usize,
        "cut: at most chars characters"
    );
    result
}

fn turn_count(read: &SessionRead) -> u32 {
    u32::try_from(read.whole().len()).unwrap_or(u32::MAX)
}

fn covers(episodes: &[Episode], turn_count: u32) -> bool {
    episodes
        .iter()
        .try_fold(0_u32, |next, e| (e.from == next).then_some(e.to + 1))
        == Some(turn_count)
}
