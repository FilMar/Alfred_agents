use crate::hist::db::HistDb;
use crate::hist::{Contents, Exchange, HistError};

// Longest session seen: 210 exchanges.
pub const PENDING_CAP: i64 = 1000;
pub const PENDING_SESSIONS_CAP: i64 = 100_000;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Noise {
    TaskNotification,
    HarnessError,
    Delegated,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Turn {
    exchange: Exchange,
    contents: Contents,
}

#[derive(Debug, Clone, PartialEq)]
pub struct SessionRead {
    session: String,
    turns: Vec<Turn>,
    noise: Vec<Turn>,
    earlier: Vec<Turn>,
}

impl Turn {
    pub fn of(exchange: Exchange, contents: Contents) -> Turn {
        debug_assert!(
            contents.exchange_id == exchange.id,
            "Turn.of: the contents belong to the exchange"
        );
        Turn { exchange, contents }
    }

    pub fn noise(&self) -> Option<Noise> {
        let trigger = self
            .exchange
            .meta
            .as_ref()
            .and_then(|meta| meta.get("trigger"))
            .and_then(|value| value.as_str());
        let result: Option<Noise> = if self.exchange.kind == "subtask" {
            Some(Noise::Delegated)
        } else if trigger == Some("task-notification") {
            Some(Noise::TaskNotification)
        } else if self.contents.output.trim_start().starts_with("API Error:") {
            Some(Noise::HarnessError)
        } else {
            None
        };
        result
    }

    pub fn id(&self) -> &str {
        &self.exchange.id
    }

    pub fn session(&self) -> &str {
        &self.exchange.session
    }

    pub fn timestamp(&self) -> &str {
        &self.exchange.timestamp
    }

    pub fn input(&self) -> &str {
        &self.contents.input
    }

    pub fn output(&self) -> &str {
        &self.contents.output
    }
}

impl SessionRead {
    pub fn read(db: &HistDb, session: &str) -> Result<SessionRead, HistError> {
        debug_assert!(
            !session.trim().is_empty(),
            "SessionRead.read: the session is not blank"
        );
        let pending_exchanges = db.list_exchanges(
            &crate::hist::ExchangeQuery {
                session: Some(session.to_string()),
                ..Default::default()
            },
            Some(false),
            PENDING_CAP,
        )?;
        let distilled_exchanges = db.list_exchanges(
            &crate::hist::ExchangeQuery {
                session: Some(session.to_string()),
                ..Default::default()
            },
            Some(true),
            PENDING_CAP,
        )?;
        let too_many = pending_exchanges.len() >= PENDING_CAP as usize
            || distilled_exchanges.len() >= PENDING_CAP as usize;
        let result: Result<SessionRead, HistError> = if too_many {
            Err(HistError::BadInput(format!(
                "session {session} holds too many exchanges"
            )))
        } else {
            let mut pending: Vec<Turn> = Vec::with_capacity(pending_exchanges.len());
            for exchange in pending_exchanges {
                let contents = db.get_contents(&exchange.id, false)?.ok_or_else(|| {
                    HistError::NotFound(format!("contents not found: {}", exchange.id))
                })?;
                pending.push(Turn::of(exchange, contents));
            }
            let mut earlier: Vec<Turn> = Vec::with_capacity(distilled_exchanges.len());
            for exchange in distilled_exchanges {
                let contents = db.get_contents(&exchange.id, false)?.ok_or_else(|| {
                    HistError::NotFound(format!("contents not found: {}", exchange.id))
                })?;
                let turn = Turn::of(exchange, contents);
                if turn.noise().is_none() {
                    earlier.push(turn);
                }
            }
            Ok(SessionRead::of(session.to_string(), pending, earlier))
        };
        result
    }

    pub fn of(session: String, pending: Vec<Turn>, earlier: Vec<Turn>) -> SessionRead {
        debug_assert!(
            belong(&pending, &session),
            "SessionRead.of: every turn belongs to the session"
        );
        debug_assert!(
            belong(&earlier, &session),
            "SessionRead.of: every earlier turn belongs to the session"
        );
        debug_assert!(
            unique(&pending, &earlier),
            "SessionRead.of: turn ids are unique, earlier turns included"
        );
        debug_assert!(
            earlier.iter().all(|t| t.noise().is_none()),
            "SessionRead.of: an earlier turn is not noise"
        );
        let mut pending = pending;
        let mut earlier = earlier;
        pending.sort_by(|a, b| (a.timestamp(), a.id()).cmp(&(b.timestamp(), b.id())));
        earlier.sort_by(|a, b| (a.timestamp(), a.id()).cmp(&(b.timestamp(), b.id())));
        let mut turns: Vec<Turn> = Vec::new();
        let mut noise: Vec<Turn> = Vec::new();
        for turn in pending {
            if turn.noise().is_none() {
                turns.push(turn);
            } else {
                noise.push(turn);
            }
        }
        let result: SessionRead = SessionRead {
            session,
            turns,
            noise,
            earlier,
        };
        debug_assert!(
            in_time(&result.turns),
            "SessionRead.of: the turns are sorted by time"
        );
        result
    }

    pub fn session(&self) -> &str {
        &self.session
    }

    pub fn turns(&self) -> &[Turn] {
        &self.turns
    }

    pub fn noise(&self) -> &[Turn] {
        &self.noise
    }

    pub fn whole(&self) -> Vec<&Turn> {
        let mut result: Vec<&Turn> = self.earlier.iter().chain(&self.turns).collect();
        result.sort_by(|a, b| (a.timestamp(), a.id()).cmp(&(b.timestamp(), b.id())));
        debug_assert!(
            result.len() == self.turns.len() + self.earlier.len(),
            "SessionRead.whole: the pending and the earlier turns"
        );
        result
    }

    pub fn is_pending(&self, turn: &Turn) -> bool {
        self.turns.iter().any(|t| t.id() == turn.id())
    }

    pub fn closing_ids(&self) -> Vec<String> {
        self.turns
            .iter()
            .chain(&self.noise)
            .map(|t| t.id().to_string())
            .collect()
    }
}

pub fn pending_sessions(db: &HistDb) -> Result<Vec<String>, HistError> {
    let result: Result<Vec<String>, HistError> = db
        .list_exchanges(
            &crate::hist::ExchangeQuery::default(),
            Some(false),
            PENDING_SESSIONS_CAP,
        )
        .map(|exchanges| {
            let mut sessions: Vec<String> = Vec::new();
            let mut seen: std::collections::HashSet<&str> = std::collections::HashSet::new();
            for exchange in exchanges.iter().rev() {
                if seen.insert(exchange.session.as_str()) {
                    sessions.push(exchange.session.clone());
                }
            }
            sessions
        });
    debug_assert!(
        result.as_ref().map_or(true, |s| no_repeat(s)),
        "pending_sessions: no session twice"
    );
    result
}

fn belong(turns: &[Turn], session: &str) -> bool {
    turns.iter().all(|t| t.session() == session)
}

fn unique(pending: &[Turn], earlier: &[Turn]) -> bool {
    let ids: std::collections::HashSet<&str> =
        pending.iter().chain(earlier).map(Turn::id).collect();
    ids.len() == pending.len() + earlier.len()
}

fn in_time(turns: &[Turn]) -> bool {
    turns
        .windows(2)
        .all(|w| w[0].timestamp() <= w[1].timestamp())
}

fn no_repeat(sessions: &[String]) -> bool {
    let set: std::collections::HashSet<&String> = sessions.iter().collect();
    set.len() == sessions.len()
}
