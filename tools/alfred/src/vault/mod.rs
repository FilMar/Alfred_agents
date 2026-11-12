pub mod cli;
pub mod page;
pub mod routes;
pub mod store;

use serde::{Deserialize, Serialize};

use page::Heading;

#[derive(Debug, Serialize, Deserialize)]
pub struct TocReply {
    pub path: String,
    pub chars: u32,
    pub headings: Vec<Heading>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReadReply {
    pub text: String,
}

#[derive(Debug, thiserror::Error)]
pub enum VaultError {
    #[error("no page: {0}")]
    NoPage(String),
    #[error("more than one page is named {name}")]
    Ambiguous { name: String, paths: Vec<String> },
    #[error("no section {id} in {name}")]
    NoSection { name: String, id: String },
    #[error("bad page name: {0}")]
    BadName(String),
    #[error("the vault has more than {0} entries")]
    TooLarge(u32),
    #[error(transparent)]
    Io(#[from] std::io::Error),
}
