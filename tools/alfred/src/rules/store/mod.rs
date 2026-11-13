mod curation;

use jiff::Timestamp;

use super::{Found, Rule, RuleBody, RulesError, SearchOptions};
use crate::embed::Embedder;
use crate::hist::validate::is_id;
use crate::qdrant::{Match, Qdrant, Stored};
use crate::sorted::sorted_by_key;

pub const DEFAULT_LIMIT: u32 = 10;
pub const DEFAULT_NEAR_LIMIT: u32 = 100;
pub const REACH_LIMIT: u32 = 2;
pub const REACH_MIN_SCORE: f32 = 0.5;

#[derive(Debug, Clone)]
pub struct Rules {
    qdrant: Qdrant,
    embedder: Embedder,
}

impl Rules {
    pub fn new(qdrant: Qdrant, embedder: Embedder) -> Rules {
        Rules { qdrant, embedder }
    }

    pub fn from_env() -> Rules {
        Rules::new(Qdrant::from_env(super::COLLECTION), Embedder::from_env())
    }

    pub async fn warm(&self) {
        if let Err(error) = self.qdrant.ensure().await {
            eprintln!("alfred serve: {error}");
        }
        if let Err(error) = self.embedder.warm().await {
            eprintln!("alfred serve: {error}");
        }
    }

    pub async fn search(
        &self,
        opts: &SearchOptions,
        now: Timestamp,
    ) -> Result<Vec<Found>, RulesError> {
        let find = self.find(opts);
        let found = match opts.timeout {
            Some(ms) => tokio::time::timeout(std::time::Duration::from_millis(ms), find)
                .await
                .map_err(|_| RulesError::Timeout(ms))??,
            None => find.await?,
        };
        let result: Result<Vec<Found>, RulesError> = Ok(if opts.hits.unwrap_or(true) {
            self.record_hits(found, now).await
        } else {
            found
        });
        debug_assert!(
            result.as_ref().map_or(true, |f| f.len()
                <= opts.limit.unwrap_or(DEFAULT_LIMIT) as usize),
            "Rules.search: at most limit rules"
        );
        debug_assert!(
            result
                .as_ref()
                .map_or(true, |f| above_min(f, opts.min_score)),
            "Rules.search: every score at least min_score"
        );
        result
    }

    async fn find(&self, opts: &SearchOptions) -> Result<Vec<Found>, RulesError> {
        let vector = self.embedder.query(&opts.q).await?;
        let limit = opts.limit.unwrap_or(DEFAULT_LIMIT);
        let tags = opts
            .tags
            .as_ref()
            .map(|raw| super::normalize_tags(std::slice::from_ref(raw)));
        let must: Vec<serde_json::Value> = [
            tags.filter(|t| !t.is_empty())
                .map(|t| serde_json::json!({ "key": "tags", "match": { "any": t } })),
            (opts.archived == Some(false))
                .then(|| serde_json::json!({ "is_empty": { "key": "archived_at" } })),
        ]
        .into_iter()
        .flatten()
        .collect();
        let filter = (!must.is_empty()).then(|| serde_json::json!({ "must": must }));
        let hits = self
            .qdrant
            .query::<RuleBody>(&vector, limit, filter, opts.min_score)
            .await?;
        let found: Vec<Found> = hits
            .into_iter()
            .filter(|hit| opts.min_score.is_none_or(|min| hit.score >= min))
            .map(|hit| Found {
                rule: Rule {
                    id: hit.id,
                    body: hit.body,
                },
                score: hit.score,
            })
            .collect();
        Ok(found)
    }

    pub async fn add(
        &self,
        if_: &str,
        do_: &str,
        tags: Vec<String>,
        exchange: Option<String>,
        now: Timestamp,
    ) -> Result<Rule, RulesError> {
        let vector = self.embedder.document(if_).await?;
        let id = uuid::Uuid::new_v4().to_string();
        let body = super::RuleBody {
            if_: if_.to_string(),
            do_: vec![do_.to_string()],
            tags: super::normalize_tags(&tags),
            exchange,
            embed_model: Some(crate::embed::MODEL.to_string()),
            when: Some(super::iso(now)),
            hits: None,
            last_hit: None,
            archived_at: None,
        };
        self.qdrant.upsert(&id, &vector, &body).await?;
        let result: Result<Rule, RulesError> = Ok(Rule { id, body });
        debug_assert!(
            result.as_ref().map_or(true, |r| is_id(&r.id)),
            "Rules.add: a new full id"
        );
        debug_assert!(
            result.as_ref().map_or(true, |r| r.body.do_ == [do_]),
            "Rules.add: one action, the one given"
        );
        result
    }

    pub async fn list(&self, tags: &[String]) -> Result<Vec<Rule>, RulesError> {
        let tags = super::normalize_tags(tags);
        let filter = if tags.is_empty() {
            None
        } else {
            Some(serde_json::json!({ "must": [ { "key": "tags", "match": { "any": tags } } ] }))
        };
        let points = self.qdrant.scroll_all::<RuleBody>(filter, false).await?;
        let result: Result<Vec<Rule>, RulesError> =
            Ok(points.into_iter().map(Stored::rule).collect());
        result
    }

    pub async fn get(&self, id_or_prefix: &str) -> Result<Rule, RulesError> {
        let id = self.resolve(id_or_prefix).await?;
        let result: Result<Rule, RulesError> = match self.qdrant.get::<RuleBody>(&id).await? {
            Some(point) => Ok(point.rule()),
            None => Err(RulesError::NoRule(id_or_prefix.to_string())),
        };
        debug_assert!(
            result
                .as_ref()
                .map_or(true, |r| r.id.starts_with(id_or_prefix)),
            "Rules.get: the rule carries the id asked"
        );
        result
    }

    pub async fn delete(&self, id_or_prefix: &str) -> Result<String, RulesError> {
        let id = self.resolve(id_or_prefix).await?;
        match self.qdrant.get::<RuleBody>(&id).await? {
            Some(_) => {
                self.qdrant.delete(&id).await?;
                Ok(id)
            }
            None => Err(RulesError::NoRule(id_or_prefix.to_string())),
        }
    }

    pub async fn append_do(&self, id_or_prefix: &str, do_: &str) -> Result<Rule, RulesError> {
        let id = self.resolve(id_or_prefix).await?;
        let result: Result<Rule, RulesError> = match self.qdrant.get::<RuleBody>(&id).await? {
            Some(mut point) => {
                point.body.do_.push(do_.to_string());
                let do_list = point.body.do_.clone();
                self.qdrant
                    .set_payload(
                        std::slice::from_ref(&id),
                        serde_json::json!({ "do": do_list }),
                    )
                    .await?;
                Ok(Rule {
                    id,
                    body: point.body,
                })
            }
            None => Err(RulesError::NoRule(id_or_prefix.to_string())),
        };
        debug_assert!(
            result
                .as_ref()
                .map_or(true, |r| r.body.do_.last().is_some_and(|d| d == do_)),
            "Rules.append_do: the new action is last"
        );
        result
    }

    async fn resolve(&self, id_or_prefix: &str) -> Result<String, RulesError> {
        let result = if id_or_prefix.is_empty() {
            Err(RulesError::BadInput("empty id".to_string()))
        } else if is_id(id_or_prefix) {
            Ok(id_or_prefix.to_string())
        } else {
            let found = self
                .qdrant
                .resolve(id_or_prefix, super::SHOWN_CANDIDATES)
                .await;
            found
                .map_err(RulesError::from)
                .and_then(|found| match found {
                    Match::One(id) => Ok(id),
                    Match::Missing => Err(RulesError::NoRule(id_or_prefix.to_string())),
                    Match::Many { count, first } => Err(RulesError::Ambiguous {
                        prefix: id_or_prefix.to_string(),
                        count,
                        ids: first,
                    }),
                })
        };
        debug_assert!(
            result.as_ref().map_or(true, |id| is_id(id)),
            "Rules.resolve: a full id"
        );
        result
    }

    async fn record_hits(&self, found: Vec<Found>, now: Timestamp) -> Vec<Found> {
        let stamp = super::iso(now);
        let hit: Vec<Found> = found
            .into_iter()
            .map(|f| {
                let hits = Some(f.rule.body.hits.unwrap_or(0) + 1);
                let body = RuleBody {
                    hits,
                    last_hit: Some(stamp.clone()),
                    ..f.rule.body
                };
                Found {
                    rule: Rule { body, ..f.rule },
                    ..f
                }
            })
            .collect();
        let by_hits = sorted_by_key(hit.iter().collect(), |f| f.rule.body.hits);
        for group in by_hits.chunk_by(|a, b| a.rule.body.hits == b.rule.body.hits) {
            let ids: Vec<String> = group.iter().map(|f| f.rule.id.clone()).collect();
            let body = serde_json::json!({ "hits": group[0].rule.body.hits, "last_hit": stamp });
            let _ = self.qdrant.set_payload(&ids, body).await;
        }
        hit
    }
}

fn above_min(found: &[Found], min: Option<f32>) -> bool {
    min.is_none_or(|m| found.iter().all(|f| f.score >= m))
}

fn live_filter() -> serde_json::Value {
    serde_json::json!({ "must": [{ "is_empty": { "key": "archived_at" } }] })
}
