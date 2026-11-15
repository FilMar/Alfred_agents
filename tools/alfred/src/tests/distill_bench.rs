use std::sync::Arc;

use serde_json::json;

use crate::distill::runner::Runner;
use crate::distill::trigger::Trigger;
use crate::hist::db::HistDb;
use crate::hist::episodes::Episodes;
use crate::hist::{Contents, Exchange, NewExtractor, Session};
use crate::qdrant::Qdrant;
use crate::serve::{App, Shared};
use crate::tests::distill_fake::{self, Fake, rule_payload, vector_of};
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
    let base = chat_base(&world);
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

fn chat_base(world: &distill_fake::Shared) -> String {
    world.lock().unwrap().base.clone()
}

pub(crate) fn tag_rule(world: &distill_fake::Shared, id: &str) {
    let mut payload = rule_payload("quando si chiude una sessione", &["salva il lavoro"]);
    payload["tags"] = json!(["sessione"]);
    world.lock().unwrap().points.insert(
        id.to_string(),
        (vector_of("quando si chiude una sessione"), payload),
    );
}

pub(crate) fn uuid(tag: u64) -> String {
    format!("{tag:08x}-0000-4000-8000-{tag:012x}")
}

pub(crate) fn ts(second: i64) -> String {
    format!(
        "2026-11-14T{:02}:{:02}:{:02}.000Z",
        second / 3600,
        (second / 60) % 60,
        second % 60
    )
}

pub(crate) fn seed_session(app: &App, session: u64, turns: &[(u64, i64, &str, bool)]) {
    let id = uuid(session);
    app.hist
        .upsert_sessions(&[Session {
            id: id.clone(),
            started: ts(0),
            harness: Some("claude".to_string()),
            host: None,
            path: None,
        }])
        .unwrap();
    let exchanges: Vec<Exchange> = turns
        .iter()
        .map(|&(tag, second, _, distilled)| Exchange {
            id: uuid(tag),
            session: id.clone(),
            parent: None,
            timestamp: ts(second),
            kind: "chat".to_string(),
            actor: "alfredo".to_string(),
            model: None,
            tokens_in: None,
            tokens_out: None,
            tokens_cache_read: None,
            tokens_cache_write: None,
            distilled: distilled.then(|| ts(1)),
            meta: None,
        })
        .collect();
    app.hist.upsert_exchanges(&exchanges).unwrap();
    let contents: Vec<Contents> = turns
        .iter()
        .map(|&(tag, _, input, _)| Contents {
            exchange_id: uuid(tag),
            input: input.to_string(),
            output: "va bene".to_string(),
            tools: None,
        })
        .collect();
    app.hist.upsert_contents(&contents).unwrap();
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
