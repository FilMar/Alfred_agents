use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct ErrorReply {
    pub error: String,
    #[serde(default)]
    pub paths: Vec<String>,
}

impl std::fmt::Display for ErrorReply {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.error)?;
        self.paths.iter().try_for_each(|p| write!(f, "\n  {p}"))
    }
}
