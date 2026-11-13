#[derive(Debug, thiserror::Error)]
#[error("{service} failed: {message}")]
pub struct Upstream {
    pub service: &'static str,
    pub message: String,
}
