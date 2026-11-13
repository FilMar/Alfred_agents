#[derive(Debug, clap::Subcommand)]
pub enum HistCommand {
    Ingest {
        #[arg(long)]
        transcript: Option<std::path::PathBuf>,
        #[arg(long)]
        session: Option<String>,
        #[arg(long)]
        all: bool,
        #[arg(long)]
        since: Option<String>,
        #[arg(long)]
        refresh: bool,
    },
    Sessions {
        #[arg(long, default_value_t = 20)]
        limit: i64,
        #[arg(long)]
        harness: Option<String>,
    },
    Search {
        query: String,
        #[arg(long, default_value_t = 10)]
        limit: u32,
        #[arg(long, default_value_t = 0.30)]
        min_score: f32,
        #[arg(long)]
        since: Option<String>,
        #[arg(long)]
        until: Option<String>,
        #[arg(long)]
        json: bool,
    },
    Episode {
        id: String,
    },
    Show {
        id: String,
        #[arg(long)]
        tools: bool,
    },
    Cost {
        #[arg(long, default_value = "day")]
        by: String,
        #[arg(long)]
        since: Option<String>,
        #[arg(long)]
        session: Option<String>,
        #[arg(long, default_value_t = 5000)]
        limit: i64,
    },
    Prompts {
        #[arg(long)]
        since: Option<String>,
        #[arg(long)]
        until: Option<String>,
    },
    Pending {
        #[arg(long, default_value_t = 50)]
        limit: i64,
    },
    Extractions {
        #[arg(long)]
        extractor: Option<i64>,
        #[arg(long)]
        run: Option<String>,
        #[arg(long)]
        exchange: Option<String>,
        #[arg(long)]
        kept: bool,
    },
    Distilled {
        #[arg(required = true)]
        ids: Vec<String>,
    },
}
