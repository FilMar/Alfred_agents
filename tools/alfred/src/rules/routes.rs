use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::routing::{get, post};
use axum::{Json, Router};
use jiff::Timestamp;
use serde::Deserialize;

use super::near::NearPair;
use super::reach::{ReachReply, ReachRequest};
use super::refine::{ApplyReply, RefineReport};
use super::{AddRequest, AppendRequest, DeleteReply, Found, Rule, RulesError, SearchOptions};
use crate::api::ErrorReply;
use crate::serve::{ApiError, Shared};

#[derive(Debug, Deserialize)]
pub struct TagsQuery {
    pub tags: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct NearQuery {
    pub min: f32,
    pub limit: Option<u32>,
}

pub fn router() -> Router<Shared> {
    Router::new()
        .route("/rules", get(list).post(add))
        .route("/rules/search", get(search))
        .route("/rules/refine", get(refine).post(refine_apply))
        .route("/rules/near", get(near))
        .route("/rules/reach", post(reach))
        .route("/rules/{id}", get(meta).delete(delete))
        .route("/rules/{id}/do", post(append_do))
}

async fn search(
    State(app): State<Shared>,
    Query(q): Query<SearchOptions>,
) -> Result<Json<Vec<Found>>, ApiError> {
    Ok(Json(app.rules.search(&q, now()).await?))
}

async fn add(
    State(app): State<Shared>,
    Json(body): Json<AddRequest>,
) -> Result<Json<Rule>, ApiError> {
    Ok(Json(
        app.rules
            .add(&body.if_, &body.do_, body.tags, body.exchange, now())
            .await?,
    ))
}

async fn list(
    State(app): State<Shared>,
    Query(q): Query<TagsQuery>,
) -> Result<Json<Vec<Rule>>, ApiError> {
    let tags = super::normalize_tags(&q.tags.into_iter().collect::<Vec<String>>());
    Ok(Json(app.rules.list(&tags).await?))
}

async fn meta(State(app): State<Shared>, Path(id): Path<String>) -> Result<Json<Rule>, ApiError> {
    Ok(Json(app.rules.get(&id).await?))
}

async fn delete(
    State(app): State<Shared>,
    Path(id): Path<String>,
) -> Result<Json<DeleteReply>, ApiError> {
    let id = app.rules.delete(&id).await?;
    Ok(Json(DeleteReply { id, deleted: true }))
}

async fn append_do(
    State(app): State<Shared>,
    Path(id): Path<String>,
    Json(body): Json<AppendRequest>,
) -> Result<Json<Rule>, ApiError> {
    Ok(Json(app.rules.append_do(&id, &body.do_).await?))
}

async fn refine(State(app): State<Shared>) -> Result<Json<RefineReport>, ApiError> {
    Ok(Json(app.rules.refine(now()).await?))
}

async fn refine_apply(State(app): State<Shared>) -> Result<Json<ApplyReply>, ApiError> {
    Ok(Json(app.rules.refine_apply(now()).await?))
}

async fn near(
    State(app): State<Shared>,
    Query(q): Query<NearQuery>,
) -> Result<Json<Vec<NearPair>>, ApiError> {
    let limit = q.limit.unwrap_or(super::store::DEFAULT_NEAR_LIMIT);
    if !(-1.0..=1.0).contains(&q.min) || limit < 1 {
        return Err(RulesError::BadInput(
            "min must be between -1 and 1, limit at least 1".to_string(),
        )
        .into());
    }
    Ok(Json(app.rules.near(q.min, limit).await?))
}

async fn reach(
    State(app): State<Shared>,
    Json(body): Json<ReachRequest>,
) -> Result<Json<ReachReply>, ApiError> {
    Ok(Json(app.rules.reach(&body).await?))
}

pub(crate) fn status_of(error: &RulesError) -> StatusCode {
    let result: StatusCode = match error {
        RulesError::NoRule(_) => StatusCode::NOT_FOUND,
        RulesError::Ambiguous { .. } => StatusCode::CONFLICT,
        RulesError::BadInput(_) | RulesError::TooMany(_) => StatusCode::BAD_REQUEST,
        RulesError::Upstream(_) => StatusCode::BAD_GATEWAY,
        RulesError::Timeout(_) => StatusCode::GATEWAY_TIMEOUT,
    };
    result
}

impl From<RulesError> for ApiError {
    fn from(error: RulesError) -> ApiError {
        let paths = match &error {
            RulesError::Ambiguous { ids, .. } => ids.clone(),
            _ => Vec::new(),
        };
        ApiError {
            status: status_of(&error),
            reply: ErrorReply {
                error: error.to_string(),
                paths,
            },
        }
    }
}

fn now() -> Timestamp {
    Timestamp::now()
}
