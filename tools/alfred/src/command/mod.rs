pub mod archive;
pub mod cli;
pub mod detach;
pub mod hats;
pub mod job;
pub mod runner;
pub mod sandbox;
pub mod skill;
pub mod spec;
pub mod spool;
pub mod wait;

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

impl CommandError {
    pub fn io(context: impl Into<String>) -> impl FnOnce(std::io::Error) -> CommandError {
        let context = context.into();
        move |source| CommandError::Io { context, source }
    }
}
