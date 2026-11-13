mod reads;

use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::routing::{get, post};
use axum::{Json, Router};
use serde_json::Value;

use super::validate;
use super::{
    Contents, Exchange, ExchangeQuery, Extraction, ExtractionQuery, Extractor, Health, HistError,
    Session, SessionQuery,
};
use crate::api::ErrorReply;
use crate::serve::{ApiError, Shared};

pub const MAX_BODY_BYTES: usize = 512 * 1024 * 1024;

pub fn router() -> Router<Shared> {
    Router::new()
        .route("/hist/health", get(health))
        .route("/hist/sessions", get(list_sessions).post(post_sessions))
        .route("/hist/exchanges", get(list_exchanges).post(post_exchanges))
        .route(
            "/hist/exchanges/{id}",
            get(get_exchange).patch(patch_exchange),
        )
        .route("/hist/contents", post(post_contents))
        .route("/hist/contents/{id}", get(get_contents))
        .route("/hist/extractors", post(post_extractor))
        .route(
            "/hist/extractors/{id}",
            get(get_extractor).patch(patch_extractor),
        )
        .route(
            "/hist/extractions",
            get(list_extractions).post(post_extractions),
        )
        .route("/hist/search", get(reads::search))
        .route("/hist/prompts", get(reads::prompts))
        .route("/hist/cost", get(reads::cost))
        .route("/hist/episodes/{id}", get(reads::get_episode))
        .layer(axum::extract::DefaultBodyLimit::max(MAX_BODY_BYTES))
}

async fn health(State(app): State<Shared>) -> Result<Json<Health>, ApiError> {
    Ok(Json(Health {
        ok: true,
        sessions: app.hist.count("sessions")?,
        exchanges: app.hist.count("exchanges")?,
        contents: app.hist.count("contents")?,
    }))
}

async fn list_sessions(
    State(app): State<Shared>,
    Query(q): Query<SessionQuery>,
) -> Result<Json<Vec<Session>>, ApiError> {
    if let Some(harness) = q.harness.as_deref()
        && !matches!(harness, "claude" | "pi")
    {
        return Err(HistError::BadInput("harness must be claude or pi".to_string()).into());
    }
    let limit = super::int_param(q.limit.as_deref()).unwrap_or(super::DEFAULT_LIMIT);
    Ok(Json(app.hist.list_sessions(q.harness.as_deref(), limit)?))
}

async fn post_sessions(State(app): State<Shared>, body: String) -> Result<Json<Value>, ApiError> {
    Ok(written(
        app.hist
            .upsert_sessions(&rows_of(&body, validate::session)?)?,
    ))
}

async fn list_exchanges(
    State(app): State<Shared>,
    Query(q): Query<ExchangeQuery>,
) -> Result<Json<Vec<Exchange>>, ApiError> {
    if let Some(kind) = q.kind.as_deref()
        && !matches!(kind, "chat" | "subtask")
    {
        return Err(HistError::BadInput("kind must be chat or subtask".to_string()).into());
    }
    let distilled = super::bool_param(q.distilled.as_deref());
    let limit = super::int_param(q.limit.as_deref()).unwrap_or(super::DEFAULT_LIMIT);
    Ok(Json(app.hist.list_exchanges(&q, distilled, limit)?))
}

async fn post_exchanges(State(app): State<Shared>, body: String) -> Result<Json<Value>, ApiError> {
    Ok(written(
        app.hist
            .upsert_exchanges(&rows_of(&body, validate::exchange)?)?,
    ))
}

async fn get_exchange(
    State(app): State<Shared>,
    Path(id): Path<String>,
) -> Result<Json<Exchange>, ApiError> {
    let exchange = app
        .hist
        .get_exchange(&id)?
        .ok_or_else(|| HistError::NotFound("exchange not found".to_string()))?;
    Ok(Json(exchange))
}

async fn patch_exchange(
    State(app): State<Shared>,
    Path(id): Path<String>,
    body: String,
) -> Result<Json<Value>, ApiError> {
    let parsed: Value = serde_json::from_str(&body).unwrap_or(Value::Null);
    let distilled = match parsed.get("distilled") {
        None => Err("distilled is required"),
        Some(Value::Null) => Ok(None),
        Some(value) => value
            .as_str()
            .filter(|t| validate::is_timestamp(t))
            .map(Some)
            .ok_or("distilled is not ISO-8601 UTC"),
    }
    .map_err(|message| HistError::BadInput(message.to_string()))?;
    if !app.hist.set_distilled(&id, distilled)? {
        return Err(not_found("exchange not found"));
    }
    Ok(Json(
        serde_json::json!({ "id": id, "distilled": distilled }),
    ))
}

async fn post_contents(State(app): State<Shared>, body: String) -> Result<Json<Value>, ApiError> {
    Ok(written(
        app.hist
            .upsert_contents(&rows_of(&body, validate::contents)?)?,
    ))
}

async fn get_contents(
    State(app): State<Shared>,
    Path(id): Path<String>,
    Query(q): Query<std::collections::HashMap<String, String>>,
) -> Result<Json<Contents>, ApiError> {
    let with_tools = q.get("tools").is_some_and(|tools| tools.as_str() == "true");
    let contents = app
        .hist
        .get_contents(&id, with_tools)?
        .ok_or_else(|| HistError::NotFound("contents not found".to_string()))?;
    Ok(Json(contents))
}

async fn post_extractor(State(app): State<Shared>, body: String) -> Result<Json<Value>, ApiError> {
    let row: Value = serde_json::from_str(&body)
        .map_err(|_| HistError::BadInput("body is not JSON".to_string()))?;
    if let Some(message) = super::validate::new_extractor(&row) {
        return Err(HistError::BadInput(message).into());
    }
    let new_extractor: super::NewExtractor =
        serde_json::from_value(row).map_err(|err| HistError::BadInput(err.to_string()))?;
    let id = app.hist.insert_extractor(&new_extractor)?;
    Ok(Json(serde_json::json!({ "id": id })))
}

async fn get_extractor(
    State(app): State<Shared>,
    Path(id): Path<String>,
) -> Result<Json<Extractor>, ApiError> {
    let which = if id == "active" {
        None
    } else {
        Some(
            id.parse::<i64>()
                .map_err(|_| HistError::NotFound("extractor not found".to_string()))?,
        )
    };
    let extractor = app
        .hist
        .get_extractor(which)?
        .ok_or_else(|| HistError::NotFound("extractor not found".to_string()))?;
    Ok(Json(extractor))
}

async fn patch_extractor(
    State(app): State<Shared>,
    Path(id): Path<String>,
    body: String,
) -> Result<Json<Value>, ApiError> {
    let value: Value = serde_json::from_str(&body).unwrap_or(Value::Null);
    if value
        .as_object()
        .is_none_or(|o| o.len() != 1 || o.get("active") != Some(&Value::Bool(true)))
    {
        return Err(
            HistError::BadInput("active: true is the only change allowed".to_string()).into(),
        );
    }
    let id: i64 = id.parse().map_err(|_| not_found("extractor not found"))?;
    if !app.hist.set_active_extractor(id)? {
        return Err(not_found("extractor not found"));
    }
    Ok(Json(serde_json::json!({ "id": id, "active": true })))
}

async fn post_extractions(
    State(app): State<Shared>,
    body: String,
) -> Result<Json<Value>, ApiError> {
    Ok(written(app.hist.insert_extractions(&rows_of(
        &body,
        validate::new_extraction,
    )?)?))
}

async fn list_extractions(
    State(app): State<Shared>,
    Query(q): Query<ExtractionQuery>,
) -> Result<Json<Vec<Extraction>>, ApiError> {
    Ok(Json(app.hist.list_extractions(&q)?))
}

pub(crate) fn rows_of<T: serde::de::DeserializeOwned>(
    body: &str,
    validate: fn(&Value) -> Option<String>,
) -> Result<Vec<T>, HistError> {
    let parsed: Value = serde_json::from_str(body)
        .map_err(|_| HistError::BadInput("body is not JSON".to_string()))?;
    let rows = match parsed {
        Value::Array(rows) => rows,
        row => vec![row],
    };
    if let Some(message) = rows.iter().find_map(validate) {
        return Err(HistError::BadInput(message));
    }
    rows.into_iter()
        .map(|row| serde_json::from_value(row).map_err(|e| HistError::BadInput(e.to_string())))
        .collect()
}

fn written(count: usize) -> Json<Value> {
    Json(serde_json::json!({ "written": count }))
}

fn not_found(what: &str) -> ApiError {
    HistError::NotFound(what.to_string()).into()
}

pub(crate) fn status_of(error: &HistError) -> StatusCode {
    match error {
        HistError::BadInput(_) => StatusCode::BAD_REQUEST,
        HistError::NotFound(_) => StatusCode::NOT_FOUND,
        HistError::Ambiguous { .. } => StatusCode::CONFLICT,
        HistError::Db(_) => StatusCode::INTERNAL_SERVER_ERROR,
        HistError::BadEpisode { .. } | HistError::Upstream(_) => StatusCode::BAD_GATEWAY,
    }
}

impl From<HistError> for ApiError {
    fn from(error: HistError) -> ApiError {
        let paths = match &error {
            HistError::Ambiguous { ids, .. } => ids.clone(),
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
