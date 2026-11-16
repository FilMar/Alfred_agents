use std::ffi::OsString;
use std::num::NonZeroU32;
use std::path::{Path, PathBuf};

use clap::{ArgGroup, Args, Subcommand};

use jiff::Timestamp;

use super::CommandError;
use super::archive::{self, FinishedRun, RunRows};
use super::detach;
use super::hats;
use super::job::{JobPaths, Status};
use super::runner;
use super::skill::Skill;
use super::spec::{RunParts, RunSpec};
use super::spool::Spool;
use super::wait;
use crate::client::{Client, pretty};
use crate::hist::ingest::hostname;

pub const THINKING: [&str; 7] = ["off", "minimal", "low", "medium", "high", "xhigh", "max"];

#[derive(Subcommand)]
pub enum CommandCommand {
    Run(RunArgs),
    Wait(WaitArgs),
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
    #[arg(long, conflicts_with = "job")]
    pub detach: bool,
    #[arg(long)]
    pub no_archive: bool,
    #[arg(long, hide = true)]
    pub job: Option<PathBuf>,
}

#[derive(Args, Clone)]
pub struct WaitArgs {
    #[arg(required = true)]
    pub statuses: Vec<PathBuf>,
    #[arg(long, default_value = "600")]
    pub timeout: NonZeroU32,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Reply {
    pub text: String,
    pub ok: bool,
}

pub async fn run(command: CommandCommand) -> Result<Reply, CommandError> {
    match command {
        CommandCommand::Run(args) => {
            drain().await;
            run_one(args).await
        }
        CommandCommand::Wait(args) => {
            drain().await;
            Ok(wait_all(args).await)
        }
        CommandCommand::Hats {
            command: HatsCommand::List,
        } => Ok(Reply {
            text: pretty(&hats::names()),
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
    let cwd = std::env::current_dir().map_err(CommandError::io("current dir"))?;
    let home = PathBuf::from(std::env::var_os("HOME").unwrap_or_default());
    let spec = build_spec(args.clone(), &cwd, &home)?;
    let paths = args
        .job
        .clone()
        .map_or_else(|| new_paths(&spec), JobPaths::of_base);
    if args.detach {
        detach_run(&paths)
    } else {
        let started_at = Timestamp::now();
        let ended = runner::execute(&spec, &paths, &cwd, &home).await;
        if !args.no_archive {
            let id = uuid::Uuid::new_v4().to_string();
            let run = finished(&spec, id, started_at, ended.status.clone());
            let host = hostname();
            let rows = archive::rows(
                &run,
                &ended.messages,
                host.as_deref(),
                &cwd.to_string_lossy(),
            );
            file_run(&rows, &paths).await;
        }
        Ok(Reply {
            text: String::new(),
            ok: ended.status == Status::Done,
        })
    }
}

fn detach_run(paths: &JobPaths) -> Result<Reply, CommandError> {
    let argv: Vec<OsString> = std::env::args_os().skip(1).collect();
    let exe = std::env::current_exe().map_err(CommandError::io("current exe"))?;
    let detached = detach::spawn(&exe, &detach::child_args(&argv, paths.base()), paths)?;
    Ok(Reply {
        text: pretty(&detached),
        ok: true,
    })
}

fn build_spec(args: RunArgs, cwd: &Path, home: &Path) -> Result<RunSpec, CommandError> {
    let hat_text = args.hat.as_deref().map(hats::get).transpose()?;
    let skill_block = args
        .skill
        .as_deref()
        .map(|name| skill_block(name, cwd, home))
        .transpose()?;
    RunSpec::of(RunParts {
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
    })
}

fn new_paths(spec: &RunSpec) -> JobPaths {
    let hex = uuid::Uuid::new_v4().simple().to_string()[..4].to_string();
    let ms = Timestamp::now().as_millisecond();
    JobPaths::new(&std::env::temp_dir(), spec.label(), ms, &hex)
}

fn skill_block(name: &str, cwd: &Path, home: &Path) -> Result<String, CommandError> {
    let skill = Skill::find(name, &Skill::roots(cwd, home))?;
    std::fs::read_to_string(skill.file())
        .map(|body| skill.block(&body))
        .map_err(CommandError::io(format!("read {}", skill.file().display())))
}

fn finished(spec: &RunSpec, id: String, started_at: Timestamp, status: Status) -> FinishedRun {
    FinishedRun {
        id,
        label: spec.label().as_str().to_string(),
        task: spec.task().to_string(),
        skill: spec.skill().map(str::to_string),
        thinking: spec.thinking().map(str::to_string),
        timeout_s: spec.timeout().map(NonZeroU32::get),
        status,
        started_at,
        finished_at: Timestamp::now(),
    }
}

fn client() -> Option<Client> {
    Client::from_env()
        .ok()
        .map(|client| client.with_timeout(archive::DEADLINE))
}

async fn file_run(rows: &RunRows, paths: &JobPaths) {
    match Spool::from_env() {
        Ok(spool) => {
            archive::archive(client().as_ref(), rows, &paths.name(), &spool).await;
        }
        Err(err) => eprintln!("warn: run not spooled either, history lost: {err}"),
    }
}

async fn drain() {
    if let Ok(spool) = Spool::from_env() {
        spool.drain(client().as_ref()).await;
    }
}

async fn wait_all(args: WaitArgs) -> Reply {
    let outcomes = wait::wait(&args.statuses, args.timeout).await;
    Reply {
        ok: outcomes.iter().all(|outcome| outcome.ok),
        text: pretty(&outcomes),
    }
}
