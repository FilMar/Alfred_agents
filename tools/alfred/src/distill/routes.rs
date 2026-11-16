use axum::extract::State;
use axum::http::StatusCode;
use axum::routing::{get, post};
use axum::{Json, Router};
use jiff::Timestamp;

use super::run::{Options, Progress, RunError};
use super::runner::{Runner, Status};
use crate::api::ErrorReply;
use crate::serve::{ApiError, Shared};

pub fn router() -> Router<Shared> {
    Router::new()
        .route("/distill", post(distill))
        .route("/distill/status", get(status))
}

async fn distill(
    State(app): State<Shared>,
    body: String,
) -> Result<(StatusCode, Json<Progress>), ApiError> {
    let options: Options = serde_json::from_str(&body)
        .map_err(|e| RunError::BadInput(format!("body is not distill options: {e}")))?;
    let progress = Runner::start(app, &options, Timestamp::now()).await?;
    Ok((StatusCode::ACCEPTED, Json(progress)))
}

async fn status(State(app): State<Shared>) -> Json<Status> {
    Json(app.runner.status())
}

pub fn status_of(error: &RunError) -> StatusCode {
    match error {
        RunError::BadInput(_) => StatusCode::BAD_REQUEST,
        RunError::NotFound(_) => StatusCode::NOT_FOUND,
        RunError::Busy => StatusCode::CONFLICT,
        RunError::Upstream(_) => StatusCode::BAD_GATEWAY,
    }
}

impl From<RunError> for ApiError {
    fn from(error: RunError) -> ApiError {
        ApiError {
            status: status_of(&error),
            reply: ErrorReply {
                error: error.to_string(),
                paths: Vec::new(),
            },
        }
    }
}
