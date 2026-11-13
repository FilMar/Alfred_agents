use serde_json::Value;

use super::{Episode, EpisodeHit, EpisodeQuery, HistError};
use crate::embed::Embedder;
use crate::qdrant::{Match, Qdrant};

pub const COLLECTION: &str = "tl_episodes";
pub const DEFAULT_LIMIT: u32 = 10;
pub const DEFAULT_MIN_SCORE: f32 = 0.30;
pub const SHOWN_CANDIDATES: usize = 5;

#[derive(Debug, Clone)]
pub struct Episodes {
    qdrant: Qdrant,
    embedder: Embedder,
}

impl Episodes {
    pub fn new(qdrant: Qdrant, embedder: Embedder) -> Episodes {
        Episodes { qdrant, embedder }
    }

    pub fn from_env() -> Episodes {
        Episodes::new(Qdrant::from_env(COLLECTION), Embedder::from_env())
    }

    pub async fn write(&self, session: &str, episodes: &[Episode]) -> Result<(), HistError> {
        debug_assert!(!episodes.is_empty(), "Episodes.write: at least one episode");
        debug_assert!(
            episodes.iter().all(|e| e.session == session),
            "Episodes.write: every episode is of the session"
        );
        let result: Result<(), HistError> = async {
            self.qdrant.ensure().await?;
            for episode in episodes {
                let vector = self.embedder.document(&episode.summary).await?;
                let mut payload = serde_json::to_value(episode).unwrap_or_default();
                if let Some(fields) = payload.as_object_mut() {
                    fields.remove("id");
                }
                self.qdrant.upsert(&episode.id, &vector, &payload).await?;
            }
            let mut written: Vec<String> = episodes.iter().map(|e| e.id.clone()).collect();
            written.sort();
            written.dedup();
            for id in self.ids_of(session).await? {
                if !written.contains(&id) {
                    self.qdrant.delete(&id).await?;
                }
            }
            let mut held = self.ids_of(session).await?;
            held.sort();
            if held == written {
                Ok(())
            } else {
                Err(HistError::BadEpisode {
                    id: session.to_string(),
                    reason: "the session does not hold exactly the episodes written".to_string(),
                })
            }
        }
        .await;
        result
    }

    async fn ids_of(&self, session: &str) -> Result<Vec<String>, HistError> {
        let filter =
            serde_json::json!({ "must": [{ "key": "session", "match": { "value": session } }] });
        let points = self.qdrant.scroll_all::<Value>(Some(filter), false).await?;
        Ok(points.into_iter().map(|point| point.id).collect())
    }

    pub async fn search(&self, query: &EpisodeQuery) -> Result<Vec<EpisodeHit>, HistError> {
        let result: Result<Vec<EpisodeHit>, HistError> = async {
            let filter = period_filter(query.since.as_deref(), query.until.as_deref())?;
            let vector = self.embedder.query(&query.q).await?;
            let limit = query.limit.unwrap_or(DEFAULT_LIMIT);
            let min_score = query.min_score.unwrap_or(DEFAULT_MIN_SCORE);
            let hits = self
                .qdrant
                .query::<Value>(&vector, limit, filter, Some(min_score))
                .await?;
            let found: Vec<EpisodeHit> = hits
                .into_iter()
                .filter(|hit| hit.score >= min_score)
                .map(|hit| match episode_of(&hit.id, &hit.body) {
                    Ok(episode) => Ok(EpisodeHit {
                        episode,
                        score: hit.score,
                    }),
                    Err(reason) => Err(HistError::BadEpisode { id: hit.id, reason }),
                })
                .collect::<Result<Vec<EpisodeHit>, HistError>>()?;
            Ok(found)
        }
        .await;
        debug_assert!(
            result
                .as_ref()
                .map_or(true, |h| h.windows(2).all(|w| w[0].score >= w[1].score)),
            "Episodes.search: closest first"
        );
        debug_assert!(
            result.as_ref().map_or(true, |h| h.len()
                <= query.limit.unwrap_or(DEFAULT_LIMIT) as usize),
            "Episodes.search: at most limit"
        );
        result
    }

    pub async fn get(&self, id_or_prefix: &str) -> Result<Episode, HistError> {
        let result = match self.id_of(id_or_prefix).await {
            Err(error) => Err(error),
            Ok(id) => match self.qdrant.get::<Value>(&id).await {
                Err(error) => Err(error.into()),
                Ok(None) => Err(HistError::NotFound("episode not found".to_string())),
                Ok(Some(point)) => episode_of(&id, &point.body)
                    .map_err(|reason| HistError::BadEpisode { id, reason }),
            },
        };
        debug_assert!(
            result
                .as_ref()
                .map_or(true, |e| e.id.starts_with(id_or_prefix)),
            "Episodes.get: the episode asked"
        );
        result
    }

    async fn id_of(&self, id_or_prefix: &str) -> Result<String, HistError> {
        if id_or_prefix.is_empty() {
            return Err(HistError::BadInput("empty id".to_string()));
        }
        if super::validate::is_id(id_or_prefix) {
            return Ok(id_or_prefix.to_string());
        }
        match self.qdrant.resolve(id_or_prefix, SHOWN_CANDIDATES).await? {
            Match::One(id) => Ok(id),
            Match::Missing => Err(HistError::NotFound("episode not found".to_string())),
            Match::Many { count, first } => Err(HistError::Ambiguous {
                prefix: id_or_prefix.to_string(),
                count,
                ids: first,
            }),
        }
    }
}

pub fn derived_id(left: &str, right: &str) -> String {
    let result: String = {
        let digest = <sha2::Sha256 as sha2::Digest>::digest(format!("{left}:{right}").as_bytes());
        let bytes: &[u8] = std::convert::AsRef::as_ref(&digest);
        let hex: String = bytes.iter().fold(String::new(), |mut acc, byte| {
            let _ = std::fmt::Write::write_fmt(&mut acc, format_args!("{byte:02x}"));
            acc
        });
        format!(
            "{}-{}-{}-{}-{}",
            &hex[0..8],
            &hex[8..12],
            &hex[12..16],
            &hex[16..20],
            &hex[20..32]
        )
    };
    debug_assert!(
        super::validate::is_id(&result),
        "derived_id: the shape of an id"
    );
    result
}

pub fn episode_of(id: &str, payload: &Value) -> Result<Episode, String> {
    let result: Result<Episode, String> = serde_json::from_value::<Payload>(payload.clone())
        .map_err(|e| e.to_string())
        .and_then(|p| checked(id, p));
    debug_assert!(
        result.as_ref().map_or(true, |e| e.id == id),
        "episode_of: the id given"
    );
    debug_assert!(
        result.as_ref().map_or(true, |e| e.from <= e.to),
        "episode_of: from before to"
    );
    result
}

#[derive(serde::Deserialize)]
struct Payload {
    session: String,
    exchanges: Vec<String>,
    from: String,
    to: String,
    summary: String,
    extractor: i64,
    model: String,
    created: String,
}

fn checked(id: &str, p: Payload) -> Result<Episode, String> {
    use super::validate::{is_id, is_timestamp};
    let first = p.exchanges.first().map_or("", String::as_str);
    let failure = [
        (!is_id(&p.session), "session is not an id"),
        (
            p.exchanges.is_empty() || !p.exchanges.iter().all(|x| is_id(x)),
            "exchanges is not a non-empty list of ids",
        ),
        (!is_timestamp(&p.from), "from is not ISO-8601 UTC"),
        (!is_timestamp(&p.to), "to is not ISO-8601 UTC"),
        (p.from > p.to, "from is after to"),
        (p.summary.trim().is_empty(), "summary is blank"),
        (p.extractor < 1, "extractor is not a positive integer"),
        (p.model.trim().is_empty(), "model is blank"),
        (!is_timestamp(&p.created), "created is not ISO-8601 UTC"),
        (
            derived_id(&p.session, first) != id,
            "the id is not the one from the session and the first exchange",
        ),
    ]
    .into_iter()
    .find_map(|(bad, reason)| bad.then_some(reason));
    match failure {
        Some(reason) => Err(reason.to_string()),
        None => Ok(Episode {
            id: id.to_string(),
            session: p.session,
            exchanges: p.exchanges,
            from: p.from,
            to: p.to,
            summary: p.summary,
            extractor: p.extractor,
            model: p.model,
            created: p.created,
        }),
    }
}

pub fn period_filter(since: Option<&str>, until: Option<&str>) -> Result<Option<Value>, HistError> {
    (|| {
        let mut must: Vec<Value> = Vec::new();
        if let Some(day) = since {
            if !super::validate::is_day(day) {
                return Err(HistError::BadInput(format!("since is not a day: {day}")));
            }
            must.push(serde_json::json!({
                "key": "to",
                "range": { "gte": format!("{day}T00:00:00.000Z") }
            }));
        }
        if let Some(day) = until {
            if !super::validate::is_day(day) {
                return Err(HistError::BadInput(format!("until is not a day: {day}")));
            }
            must.push(serde_json::json!({
                "key": "from",
                "range": { "lte": format!("{day}T23:59:59.999Z") }
            }));
        }
        if let (Some(from), Some(to)) = (since, until)
            && from > to
        {
            return Err(HistError::BadInput("since is after until".to_string()));
        }
        if must.is_empty() {
            Ok(None)
        } else {
            Ok(Some(serde_json::json!({ "must": must })))
        }
    })()
}
