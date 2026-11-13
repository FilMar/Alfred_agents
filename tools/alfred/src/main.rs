use std::path::PathBuf;
use std::process::ExitCode;

use clap::{Parser, Subcommand};

use alfred::client::Client;
use alfred::hist::db::HistDb;
use alfred::hist::episodes::Episodes;
use alfred::rules::cli::RulesCommand;
use alfred::rules::store::Rules;
use alfred::serve;
use alfred::serve::App;
use alfred::vault::cli;
use alfred::vault::store::Vault;

#[derive(Parser)]
#[command(name = "alfred")]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    Serve {
        #[arg(long, default_value_t = serve::PORT)]
        port: u16,
        #[arg(long, env = "ALFRED_VAULT")]
        vault: Option<PathBuf>,
        #[arg(long, env = "HIST_DB")]
        hist_db: Option<PathBuf>,
    },
    Vault {
        #[command(subcommand)]
        command: VaultCommand,
    },
    Rules {
        #[command(subcommand)]
        command: RulesCommand,
    },
}

#[derive(Subcommand)]
enum VaultCommand {
    Read {
        name: String,
        heading: Option<String>,
        #[arg(long)]
        all: bool,
    },
}

#[tokio::main]
async fn main() -> ExitCode {
    let output: Result<String, String> = match Cli::parse().command {
        Command::Serve {
            port,
            vault,
            hist_db,
        } => start(port, vault, hist_db).await,
        Command::Vault { command } => {
            let reply = match Client::from_env() {
                Err(e) => Err(e),
                Ok(client) => match command {
                    VaultCommand::Read { name, heading, all } => {
                        cli::read(&client, &name, heading.as_deref(), all).await
                    }
                },
            };
            reply.map_err(|e| e.to_string())
        }
        Command::Rules { command } => alfred::rules::cli::run(command)
            .await
            .map_err(|e| e.to_string()),
    };
    let result: ExitCode = match output {
        Ok(text) => {
            print!("{text}");
            ExitCode::SUCCESS
        }
        Err(error) => {
            eprintln!("alfred: {error}");
            ExitCode::FAILURE
        }
    };
    result
}

async fn start(
    port: u16,
    vault: Option<PathBuf>,
    hist_db: Option<PathBuf>,
) -> Result<String, String> {
    let home = std::env::var_os("HOME").map(PathBuf::from);
    let vault = vault
        .or_else(|| home.as_ref().map(|h| h.join("notes")))
        .ok_or("set ALFRED_VAULT or HOME")?;
    let hist_db = hist_db
        .or_else(|| home.as_ref().map(|h| h.join(".tl/tl.db")))
        .ok_or("set HIST_DB or HOME")?;
    let hist = HistDb::open(&hist_db).map_err(|e| e.to_string())?;
    let app = App {
        vault: Vault::new(vault),
        rules: Rules::from_env(),
        hist,
        episodes: Episodes::from_env(),
    };
    serve::run(app, port)
        .await
        .map(|()| String::new())
        .map_err(|e| e.to_string())
}
