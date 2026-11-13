use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::routing::get;
use axum::{Json, Router};
use serde_json::Value;

use super::{
    Contents, Episode, EpisodeHit, EpisodeQuery, Exchange, ExchangeQuery, Extraction,
    ExtractionQuery, Extractor, Health, HistError, Session, SessionQuery,
};
use crate::api::ErrorReply;
use crate::serve::{ApiError, Shared};

pub fn router() -> Router<Shared> {
    Router::new()
        .route("/hist/health", get(health))
        .route("/hist/sessions", get(list_sessions).post(post_sessions))
        .route("/hist/exchanges", get(list_exchanges).post(post_exchanges))
        .route(
            "/hist/exchanges/{id}",
            get(get_exchange).patch(patch_exchange),
        )
        .route("/hist/contents", axum::routing::post(post_contents))
        .route("/hist/contents/{id}", get(get_contents))
        .route("/hist/extractors", axum::routing::post(post_extractor))
        .route(
            "/hist/extractors/{id}",
            get(get_extractor).patch(patch_extractor),
        )
        .route(
            "/hist/extractions",
            get(list_extractions).post(post_extractions),
        )
        .route("/hist/search", get(search))
        .route("/hist/episodes/{id}", get(get_episode))
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
    let rows = rows_of(&body, super::validate::session)?;
    let mut sessions = Vec::with_capacity(rows.len());
    for row in rows {
        let session: Session =
            serde_json::from_value(row).map_err(|err| HistError::BadInput(err.to_string()))?;
        sessions.push(session);
    }
    let written = app.hist.upsert_sessions(&sessions)?;
    Ok(Json(serde_json::json!({ "written": written })))
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
    let rows = rows_of(&body, super::validate::exchange)?;
    let mut exchanges = Vec::with_capacity(rows.len());
    for row in rows {
        let exchange: Exchange =
            serde_json::from_value(row).map_err(|err| HistError::BadInput(err.to_string()))?;
        exchanges.push(exchange);
    }
    let written = app.hist.upsert_exchanges(&exchanges)?;
    Ok(Json(serde_json::json!({ "written": written })))
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
        None => return Err(HistError::BadInput("distilled is required".to_string()).into()),
        Some(Value::Null) => None,
        Some(Value::String(text)) => {
            if !super::validate::is_timestamp(text) {
                return Err(
                    HistError::BadInput("distilled is not ISO-8601 UTC".to_string()).into(),
                );
            }
            Some(text.as_str())
        }
        Some(_) => {
            return Err(HistError::BadInput("distilled is not ISO-8601 UTC".to_string()).into());
        }
    };
    if app.hist.get_exchange(&id)?.is_none() {
        return Err(HistError::NotFound("exchange not found".to_string()).into());
    }
    app.hist.set_distilled(&id, distilled)?;
    let reply = match distilled {
        Some(text) => serde_json::json!({ "id": id, "distilled": text }),
        None => serde_json::json!({ "id": id, "distilled": Value::Null }),
    };
    Ok(Json(reply))
}

async fn post_contents(State(app): State<Shared>, body: String) -> Result<Json<Value>, ApiError> {
    let rows = rows_of(&body, super::validate::contents)?;
    let mut contents = Vec::with_capacity(rows.len());
    for row in rows {
        let content: Contents =
            serde_json::from_value(row).map_err(|err| HistError::BadInput(err.to_string()))?;
        contents.push(content);
    }
    let written = app.hist.upsert_contents(&contents)?;
    Ok(Json(serde_json::json!({ "written": written })))
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
    let allowed = match value.as_object() {
        Some(object) if object.len() == 1 => {
            matches!(object.get("active"), Some(Value::Bool(true)))
        }
        _ => false,
    };
    if !allowed {
        return Err(
            HistError::BadInput("active: true is the only change allowed".to_string()).into(),
        );
    }
    let id: i64 = id
        .parse()
        .map_err(|_| HistError::NotFound("extractor not found".to_string()))?;
    if app.hist.get_extractor(Some(id))?.is_none() {
        return Err(HistError::NotFound("extractor not found".to_string()).into());
    }
    app.hist.set_active_extractor(id)?;
    Ok(Json(serde_json::json!({ "id": id, "active": true })))
}

async fn post_extractions(
    State(app): State<Shared>,
    body: String,
) -> Result<Json<Value>, ApiError> {
    let rows = rows_of(&body, super::validate::new_extraction)?;
    let mut extractions = Vec::with_capacity(rows.len());
    for row in rows {
        let extraction: super::NewExtraction =
            serde_json::from_value(row).map_err(|err| HistError::BadInput(err.to_string()))?;
        extractions.push(extraction);
    }
    let written = app.hist.insert_extractions(&extractions)?;
    Ok(Json(serde_json::json!({ "written": written })))
}

async fn list_extractions(
    State(app): State<Shared>,
    Query(q): Query<ExtractionQuery>,
) -> Result<Json<Vec<Extraction>>, ApiError> {
    Ok(Json(app.hist.list_extractions(&q)?))
}

async fn search(
    State(app): State<Shared>,
    Query(q): Query<EpisodeQuery>,
) -> Result<Json<Vec<EpisodeHit>>, ApiError> {
    Ok(Json(app.episodes.search(&q).await?))
}

async fn get_episode(
    State(app): State<Shared>,
    Path(id): Path<String>,
) -> Result<Json<Episode>, ApiError> {
    Ok(Json(app.episodes.get(&id).await?))
}

pub(crate) fn rows_of(
    body: &str,
    validate: fn(&Value) -> Option<String>,
) -> Result<Vec<Value>, HistError> {
    let result: Result<Vec<Value>, HistError> = serde_json::from_str(body)
        .map_err(|_| HistError::BadInput("body is not JSON".to_string()))
        .and_then(|parsed| {
            let rows = match parsed {
                Value::Array(rows) => rows,
                row => vec![row],
            };
            let invalid = rows.iter().find_map(validate);
            match invalid {
                Some(message) => Err(HistError::BadInput(message)),
                None => Ok(rows),
            }
        });
    debug_assert!(
        result
            .as_ref()
            .map_or(true, |rows| rows.iter().all(|r| validate(r).is_none())),
        "rows_of: every row is valid"
    );
    result
}

pub(crate) fn status_of(error: &HistError) -> StatusCode {
    let result: StatusCode = match error {
        HistError::BadInput(_) => StatusCode::BAD_REQUEST,
        HistError::NotFound(_) => StatusCode::NOT_FOUND,
        HistError::Ambiguous { .. } => StatusCode::CONFLICT,
        HistError::Db(_) => StatusCode::INTERNAL_SERVER_ERROR,
        HistError::BadEpisode { .. } | HistError::Upstream(_) => StatusCode::BAD_GATEWAY,
    };
    result
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
