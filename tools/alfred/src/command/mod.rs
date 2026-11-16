pub mod cli;
pub mod hats;
pub mod job;
pub mod runner;
pub mod sandbox;
pub mod skill;
pub mod spec;

#[derive(Debug, thiserror::Error)]
pub enum CommandError {
    #[error("{0}")]
    BadInput(String),
    #[error("{context}: {source}")]
    Io {
        context: String,
        source: std::io::Error,
    },
}
