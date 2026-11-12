use std::path::PathBuf;
use std::process::ExitCode;

use clap::{Parser, Subcommand};

use alfred::client::Client;
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
        Command::Serve { port, vault } => match vault
            .or_else(|| std::env::var_os("HOME").map(|h| PathBuf::from(h).join("notes")))
        {
            None => Err("set ALFRED_VAULT or HOME".to_string()),
            Some(root) => serve::run(
                App {
                    vault: Vault::new(root),
                    rules: Rules::from_env(),
                },
                port,
            )
            .await
            .map(|()| String::new())
            .map_err(|e| e.to_string()),
        },
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
