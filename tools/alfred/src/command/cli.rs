use std::num::NonZeroU32;
use std::path::{Path, PathBuf};

use clap::{ArgGroup, Args, Subcommand};

use super::CommandError;
use super::hats;
use super::job::{JobPaths, Status};
use super::runner;
use super::skill::Skill;
use super::spec::{RunParts, RunSpec};

pub const THINKING: [&str; 7] = ["off", "minimal", "low", "medium", "high", "xhigh", "max"];

#[derive(Subcommand)]
pub enum CommandCommand {
    Run(RunArgs),
    Hats {
        #[command(subcommand)]
        command: HatsCommand,
    },
}

#[derive(Subcommand)]
pub enum HatsCommand {
    List,
    Get { name: String },
}

#[derive(Args, Clone)]
#[command(group(ArgGroup::new("how").required(true).multiple(true).args(["hat", "skill"])))]
pub struct RunArgs {
    #[arg(long)]
    pub task: String,
    #[arg(long)]
    pub hat: Option<String>,
    #[arg(long)]
    pub skill: Option<String>,
    #[arg(long)]
    pub system: Option<String>,
    #[arg(long)]
    pub tools: Option<String>,
    #[arg(long, value_parser = THINKING)]
    pub thinking: Option<String>,
    #[arg(long)]
    pub model: Option<String>,
    #[arg(long)]
    pub timeout: Option<NonZeroU32>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Reply {
    pub text: String,
    pub ok: bool,
}

pub async fn run(command: CommandCommand) -> Result<Reply, CommandError> {
    match command {
        CommandCommand::Run(args) => run_one(args).await,
        CommandCommand::Hats {
            command: HatsCommand::List,
        } => Ok(Reply {
            text: format!(
                "{}\n",
                serde_json::to_string_pretty(&hats::names()).unwrap_or_default()
            ),
            ok: true,
        }),
        CommandCommand::Hats {
            command: HatsCommand::Get { name },
        } => hats::get(&name).map(|text| Reply {
            text: format!("{text}\n"),
            ok: true,
        }),
    }
}

async fn run_one(args: RunArgs) -> Result<Reply, CommandError> {
    let cwd = std::env::current_dir().map_err(|source| CommandError::Io {
        context: "current dir".to_string(),
        source,
    })?;
    let home = PathBuf::from(std::env::var_os("HOME").unwrap_or_default());
    let hat_text = args.hat.as_deref().map(hats::get).transpose()?;
    let skill_block = args
        .skill
        .as_deref()
        .map(|name| skill_block(name, &cwd, &home))
        .transpose()?;
    let spec = RunSpec::of(RunParts {
        task: args.task,
        role: args.system,
        hat: args.hat,
        hat_text: hat_text.map(str::to_string),
        skill: args.skill,
        skill_block,
        tools: args.tools,
        thinking: args.thinking,
        model: args.model,
        timeout: args.timeout,
    })?;
    let hex = uuid::Uuid::new_v4().simple().to_string()[..4].to_string();
    let ms = jiff::Timestamp::now().as_millisecond();
    let paths = JobPaths::new(&std::env::temp_dir(), spec.label(), ms, &hex);
    let status = runner::execute(&spec, &paths, &cwd, &home).await;
    Ok(Reply {
        text: String::new(),
        ok: status == Status::Done,
    })
}

fn skill_block(name: &str, cwd: &Path, home: &Path) -> Result<String, CommandError> {
    let skill = Skill::find(name, &Skill::roots(cwd, home))?;
    std::fs::read_to_string(skill.file())
        .map(|body| skill.block(&body))
        .map_err(|source| CommandError::Io {
            context: format!("read {}", skill.file().display()),
            source,
        })
}
