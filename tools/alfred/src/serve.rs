use std::sync::Arc;

use axum::Json;
use axum::extract::{Query, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use serde::Deserialize;

use crate::api::ErrorReply;
use crate::vault::store::Vault;
use crate::vault::{ReadReply, TocReply, VaultError};

pub const PORT: u16 = 8791;

#[derive(Deserialize)]
pub struct TocQuery {
    pub name: String,
}

#[derive(Deserialize)]
pub struct ReadQuery {
    pub name: String,
    pub id: Option<String>,
}

pub struct ApiError(VaultError);

pub async fn run(vault: Vault, port: u16) -> std::io::Result<()> {
    let app = axum::routing::Router::new()
        .route("/vault/toc", axum::routing::get(toc))
        .route("/vault/read", axum::routing::get(read))
        .with_state(Arc::new(vault));
    let listener = tokio::net::TcpListener::bind(("0.0.0.0", port)).await?;
    let result: std::io::Result<()> = axum::serve(listener, app).await;
    result
}

async fn toc(
    State(vault): State<Arc<Vault>>,
    Query(q): Query<TocQuery>,
) -> Result<Json<TocReply>, ApiError> {
    let result: Result<Json<TocReply>, ApiError> = vault.toc(&q.name).map(Json).map_err(ApiError);
    result
}

async fn read(
    State(vault): State<Arc<Vault>>,
    Query(q): Query<ReadQuery>,
) -> Result<Json<ReadReply>, ApiError> {
    let result: Result<Json<ReadReply>, ApiError> = vault
        .read(&q.name, q.id.as_deref())
        .map(|text| Json(ReadReply { text }))
        .map_err(ApiError);
    result
}

pub(crate) fn status_of(error: &VaultError) -> StatusCode {
    let result: StatusCode = match error {
        VaultError::NoPage(_) | VaultError::NoSection { .. } => StatusCode::NOT_FOUND,
        VaultError::Ambiguous { .. } => StatusCode::CONFLICT,
        VaultError::BadName(_) => StatusCode::BAD_REQUEST,
        VaultError::TooLarge(_) | VaultError::Io(_) => StatusCode::INTERNAL_SERVER_ERROR,
    };
    result
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let paths = match &self.0 {
            VaultError::Ambiguous { paths, .. } => paths.clone(),
            _ => Vec::new(),
        };
        let reply = ErrorReply {
            error: self.0.to_string(),
            paths,
        };
        let result: Response = (status_of(&self.0), Json(reply)).into_response();
        result
    }
}
