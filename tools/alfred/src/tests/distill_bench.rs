use std::sync::Arc;

use serde_json::json;

use crate::distill::runner::Runner;
use crate::distill::trigger::Trigger;
use crate::hist::db::HistDb;
use crate::hist::episodes::Episodes;
use crate::hist::{Contents, Exchange, NewExtractor};
use crate::qdrant::Qdrant;
use crate::serve::{App, Shared};
use crate::tests::distill_fake::{self, Fake, seed};
use crate::tests::distill_session::{contents, exchange, ts, uuid};
use crate::vault::store::Vault;

pub(crate) struct Bench {
    pub app: Shared,
    pub world: distill_fake::Shared,
    pub extractor: i64,
}

pub(crate) const USER: &str = "no, non cosi: quando piove forte fuori chiudi la finestra";

pub(crate) fn temp_path(tag: &str) -> std::path::PathBuf {
    static SEQ: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);
    let n = SEQ.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    std::env::temp_dir().join(format!(
        "distill-{tag}-{}-{nanos}-{n}.sqlite",
        std::process::id()
    ))
}

pub(crate) fn config(top_k: u32) -> String {
    let role = |name: &str| json!({"model": "fake", "think": "off", "temperature": 0.2, "system": format!("you are the {name} role")});
    json!({
        "episodes": role("episodes"), "extract": role("extract"),
        "critic": role("critic"), "novelty": role("novelty"),
        "checks": [{"name": "a", "text": "the rule is confused", "dropWhen": "atLeast", "threshold": 0.5}],
        "episodeChars": 4000, "targetInputChars": 400, "targetOutputChars": 400,
        "listingChars": 300, "vocabularySize": 20, "topK": top_k
    })
    .to_string()
}

pub(crate) async fn bench(replies: Vec<&str>, trigger: Option<Trigger>) -> Bench {
    let Fake {
        chat,
        rules,
        embedder,
        world,
    } = distill_fake::fake(replies).await;
    let base = world.lock().unwrap().base.clone();
    let hist = HistDb::open(&temp_path("bench")).unwrap();
    let extractor = hist
        .insert_extractor(&NewExtractor {
            parent: None,
            why: "the run tests".to_string(),
            config: config(3),
            created: "2026-11-13T00:00:00.000Z".to_string(),
        })
        .unwrap();
    hist.set_active_extractor(extractor).unwrap();
    let episodes = Episodes::new(
        Qdrant::new(
            base,
            reqwest::Client::new(),
            crate::hist::episodes::COLLECTION,
        ),
        embedder.clone(),
    );
    let app = App {
        vault: Vault::new(std::env::temp_dir()),
        rules,
        hist,
        episodes,
        chat,
        embedder,
        runner: Runner::new(trigger),
    };
    Bench {
        app: Arc::new(app),
        world,
        extractor,
    }
}

pub(crate) fn tag_rule(world: &distill_fake::Shared, id: &str) {
    seed(
        world,
        id,
        "quando si chiude una sessione",
        &["salva il lavoro"],
    );
    world.lock().unwrap().points.get_mut(id).unwrap().1["tags"] = json!(["sessione"]);
}

pub(crate) fn seed_session(app: &App, session: u64, turns: &[(u64, i64, &str, bool)]) {
    let id = uuid(session);
    let exchanges: Vec<Exchange> = turns
        .iter()
        .map(|&(tag, second, _, done)| exchange(&uuid(tag), &id, &ts(second), "chat", None, done))
        .collect();
    let rows: Vec<Contents> = turns
        .iter()
        .map(|&(tag, _, input, _)| contents(&uuid(tag), input, "va bene"))
        .collect();
    crate::tests::distill_session::seed(&app.hist, &exchanges);
    app.hist.upsert_contents(&rows).unwrap();
}

pub(crate) fn split(last: u32) -> String {
    json!({"episodes": [{"from": 0, "to": last, "summary": "si parla della finestra quando piove"}]})
        .to_string()
}

pub(crate) const NO_RULES: &str = r#"{"rules": []}"#;

pub(crate) fn one_rule() -> String {
    json!({"rules": [{"if": "quando piove forte fuori", "do": "chiudi la finestra", "tags": ["sessione"], "quote": USER}]})
        .to_string()
}

pub(crate) const CRITIC_KEEPS: &str = r#"{"a": 0.1}"#;
pub(crate) const NOVELTY_NEW: &str = r#"{"verdicts": [{"cand": 0, "verdict": "new"}]}"#;

pub(crate) fn distilled(app: &App, tag: u64) -> Option<String> {
    app.hist
        .get_exchange(&uuid(tag))
        .unwrap()
        .unwrap()
        .distilled
}
