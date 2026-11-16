use axum::Json;
use axum::extract::{Path, Query, State};

use crate::hist::stats;
use crate::hist::{Episode, EpisodeHit, EpisodeQuery, ExchangeQuery, HistError, int_param};
use crate::serve::{ApiError, Shared};

pub(super) async fn search(
    State(app): State<Shared>,
    Query(q): Query<EpisodeQuery>,
) -> Result<Json<Vec<EpisodeHit>>, ApiError> {
    Ok(Json(app.episodes.search(&q).await?))
}

pub(super) async fn get_episode(
    State(app): State<Shared>,
    Path(id): Path<String>,
) -> Result<Json<Episode>, ApiError> {
    Ok(Json(app.episodes.get(&id).await?))
}

#[derive(Debug, Default, serde::Deserialize)]
pub struct PromptQuery {
    pub since: Option<String>,
    pub until: Option<String>,
}

#[derive(Debug, Default, serde::Deserialize)]
pub struct CostQuery {
    pub by: Option<String>,
    pub since: Option<String>,
    pub session: Option<String>,
    pub limit: Option<String>,
}

pub(super) async fn prompts(
    State(app): State<Shared>,
    Query(q): Query<PromptQuery>,
) -> Result<Json<Vec<stats::Prompt>>, ApiError> {
    let until = q.until.as_deref().map(|day| format!("{day}T23:59:59.999Z"));
    let sources =
        app.hist
            .chat_inputs(q.since.as_deref(), until.as_deref(), stats::PROMPTS_LIMIT)?;
    Ok(Json(stats::prompts_of(&sources)))
}

pub(super) async fn cost(
    State(app): State<Shared>,
    Query(q): Query<CostQuery>,
) -> Result<Json<Vec<stats::CostRow>>, ApiError> {
    let by = stats::by_of(Some(q.by.as_deref().unwrap_or("day")))
        .ok_or_else(|| HistError::BadInput("by must be session, day or model".to_string()))?;
    let limit = int_param(q.limit.as_deref()).unwrap_or(stats::COST_LIMIT);
    let query = ExchangeQuery {
        session: q.session,
        since: q.since,
        ..Default::default()
    };
    let exchanges = app.hist.list_exchanges(&query, None, limit)?;
    Ok(Json(stats::sum_by(&exchanges, by)))
}
