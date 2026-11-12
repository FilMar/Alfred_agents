use std::sync::Arc;

use axum::Json;
use axum::Router;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};

use crate::api::ErrorReply;
use crate::rules::store::Rules;
use crate::vault::store::Vault;

pub const PORT: u16 = 8791;

pub struct App {
    pub vault: Vault,
    pub rules: Rules,
}

pub type Shared = Arc<App>;

pub struct ApiError {
    pub status: StatusCode,
    pub reply: ErrorReply,
}

pub async fn run(app: App, port: u16) -> std::io::Result<()> {
    app.rules.warm().await;
    let router: Router = crate::vault::routes::router()
        .merge(crate::rules::routes::router())
        .with_state(Arc::new(app));
    let listener = tokio::net::TcpListener::bind(("0.0.0.0", port)).await?;
    let result: std::io::Result<()> = axum::serve(listener, router).await;
    result
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        (self.status, Json(self.reply)).into_response()
    }
}
