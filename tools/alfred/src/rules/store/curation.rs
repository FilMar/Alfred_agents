use jiff::Timestamp;

use super::super::near::NearPair;
use super::super::reach::{ReachReply, ReachRequest};
use super::super::refine::{ApplyReply, LowRule, RefineReport, refine_report};
use super::super::{Rule, RuleBody, RulesError};
use super::{REACH_LIMIT, REACH_MIN_SCORE, Rules, live_filter};
use crate::qdrant::Stored;

impl Rules {
    pub async fn refine(&self, now: Timestamp) -> Result<RefineReport, RulesError> {
        Ok(refine_report(&self.all_rules().await?, now))
    }

    async fn all_rules(&self) -> Result<Vec<Rule>, RulesError> {
        Ok(self
            .qdrant
            .scroll_all::<RuleBody>(None, false)
            .await?
            .into_iter()
            .map(Stored::rule)
            .collect())
    }

    pub async fn refine_apply(&self, now: Timestamp) -> Result<ApplyReply, RulesError> {
        let report = refine_report(&self.all_rules().await?, now);
        let ids = |list: &[LowRule]| list.iter().map(|low| low.id.clone()).collect::<Vec<_>>();
        let (archive, restore) = (ids(&report.plan.archive), ids(&report.plan.restore));
        if !archive.is_empty() {
            let stamp = serde_json::json!({ "archived_at": super::super::iso(now) });
            self.qdrant.set_payload(&archive, stamp).await?;
        }
        if !restore.is_empty() {
            self.qdrant.delete_keys(&restore, &["archived_at"]).await?;
        }
        let result: Result<ApplyReply, RulesError> = Ok(ApplyReply {
            applied: super::super::refine::Applied {
                archived: archive.len() as u32,
                restored: restore.len() as u32,
            },
            report,
        });
        debug_assert!(
            result.as_ref().map_or(true, |r| r.applied.archived as usize
                == r.report.plan.archive.len()),
            "Rules.refine_apply: archived the whole plan"
        );
        debug_assert!(
            result.as_ref().map_or(true, |r| r.applied.restored as usize
                == r.report.plan.restore.len()),
            "Rules.refine_apply: restored the whole plan"
        );
        result
    }

    pub async fn near(&self, min: f32, limit: u32) -> Result<Vec<NearPair>, RulesError> {
        if !(-1.0..=1.0).contains(&min) {
            Err(RulesError::BadInput(
                "min must be between -1 and 1".to_string(),
            ))
        } else if limit < 1 {
            Err(RulesError::BadInput("limit must be at least 1".to_string()))
        } else {
            let filter = Some(live_filter());
            let points = self.qdrant.scroll_all::<RuleBody>(filter, true).await?;
            if points.len() > super::super::near::NEAR_ITEMS_LIMIT {
                Err(RulesError::TooMany(
                    super::super::near::NEAR_ITEMS_LIMIT as u32,
                ))
            } else {
                let text_of: std::collections::HashMap<String, String> = points
                    .iter()
                    .map(|point| (point.id.clone(), point.body.if_.clone()))
                    .collect();
                let items: Vec<(String, Vec<f32>)> = points
                    .into_iter()
                    .filter_map(|point| point.vector.map(|vector| (point.id, vector)))
                    .collect();
                let pairs = super::super::near::near_pairs(&items, min, limit as usize);
                Ok(pairs
                    .into_iter()
                    .map(|pair| NearPair {
                        a_text: text_of.get(&pair.a).cloned().unwrap_or_default(),
                        b_text: text_of.get(&pair.b).cloned().unwrap_or_default(),
                        pair,
                    })
                    .collect())
            }
        }
    }

    pub async fn reach(&self, request: &ReachRequest) -> Result<ReachReply, RulesError> {
        let result: Result<ReachReply, RulesError> =
            if request.prompts.len() > super::super::reach::MAX_PROMPTS {
                Err(RulesError::TooMany(super::super::reach::MAX_PROMPTS as u32))
            } else {
                let limit = request.limit.unwrap_or(REACH_LIMIT);
                let min_score = request.min_score.unwrap_or(REACH_MIN_SCORE);
                let filter = Some(live_filter());
                let points = self
                    .qdrant
                    .scroll_all::<RuleBody>(filter.clone(), false)
                    .await?;
                let rules: Vec<(String, String)> = points
                    .into_iter()
                    .map(|point| (point.id, point.body.if_))
                    .collect();
                let mut found: Vec<Vec<String>> = Vec::with_capacity(request.prompts.len());
                for chunk in request
                    .prompts
                    .chunks(super::super::reach::SEARCHES_IN_FLIGHT)
                {
                    let mut searches = Vec::with_capacity(chunk.len());
                    for prompt in chunk {
                        let embedder = self.embedder.clone();
                        let qdrant = self.qdrant.clone();
                        let prompt = prompt.clone();
                        let filter = filter.clone();
                        searches.push(tokio::spawn(async move {
                            let vector = embedder.query(&prompt).await?;
                            let hits = qdrant
                                .query::<RuleBody>(&vector, limit, filter, Some(min_score))
                                .await?;
                            let ids: Vec<String> = hits.into_iter().map(|hit| hit.id).collect();
                            Ok::<Vec<String>, RulesError>(ids)
                        }));
                    }
                    for search in searches {
                        let ids = search
                            .await
                            .map_err(|failure| {
                                RulesError::Upstream(crate::upstream::Upstream {
                                    service: "reach",
                                    message: failure.to_string(),
                                })
                            })
                            .and_then(|searched| searched)?;
                        found.push(ids);
                    }
                }
                Ok(super::super::reach::reach_of(&rules, &found))
            };
        result
    }
}
