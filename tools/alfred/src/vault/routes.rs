use axum::extract::{Query, State};
use axum::http::StatusCode;
use axum::routing::get;
use axum::{Json, Router};
use serde::Deserialize;

use super::{ReadReply, TocReply, VaultError};
use crate::api::ErrorReply;
use crate::serve::{ApiError, Shared};

#[derive(Deserialize)]
pub struct TocQuery {
    pub name: String,
}

#[derive(Deserialize)]
pub struct ReadQuery {
    pub name: String,
    pub id: Option<String>,
}

pub fn router() -> Router<Shared> {
    Router::new()
        .route("/vault/toc", get(toc))
        .route("/vault/read", get(read))
}

async fn toc(
    State(app): State<Shared>,
    Query(q): Query<TocQuery>,
) -> Result<Json<TocReply>, ApiError> {
    app.vault.toc(&q.name).map(Json).map_err(ApiError::from)
}

async fn read(
    State(app): State<Shared>,
    Query(q): Query<ReadQuery>,
) -> Result<Json<ReadReply>, ApiError> {
    app.vault
        .read(&q.name, q.id.as_deref())
        .map(|text| Json(ReadReply { text }))
        .map_err(ApiError::from)
}

pub(crate) fn status_of(error: &VaultError) -> StatusCode {
    match error {
        VaultError::NoPage(_) | VaultError::NoSection { .. } => StatusCode::NOT_FOUND,
        VaultError::Ambiguous { .. } => StatusCode::CONFLICT,
        VaultError::BadName(_) => StatusCode::BAD_REQUEST,
        VaultError::TooLarge(_) | VaultError::Io(_) => StatusCode::INTERNAL_SERVER_ERROR,
    }
}

impl From<VaultError> for ApiError {
    fn from(error: VaultError) -> ApiError {
        let paths = match &error {
            VaultError::Ambiguous { paths, .. } => paths.clone(),
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
