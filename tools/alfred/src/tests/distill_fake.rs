#![allow(clippy::needless_pass_by_value, clippy::type_complexity)]

use std::collections::{BTreeMap, HashSet, VecDeque};
use std::sync::{Arc, Mutex};

use axum::Json;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use serde_json::{Value, json};

use crate::chat::Chat;
use crate::embed::Embedder;
use crate::qdrant::{Qdrant, VECTOR_SIZE};
use crate::rules::store::Rules;

#[derive(Default)]
pub(crate) struct World {
    pub replies: VecDeque<String>,
    pub prompts: Vec<String>,
    pub embedded: Vec<String>,
    pub queries: u32,
    pub points: BTreeMap<String, (Vec<f32>, Value)>,
    pub down: HashSet<&'static str>,
}

pub(crate) type Shared = Arc<Mutex<World>>;

pub(crate) struct Fake {
    pub chat: Chat,
    pub rules: Rules,
    pub embedder: Embedder,
    pub world: Shared,
}

pub(crate) fn vector_of(text: &str) -> Vec<f32> {
    let words = text
        .trim_start_matches("search_document: ")
        .trim_start_matches("search_query: ")
        .split_whitespace()
        .map(str::to_lowercase);
    words.fold(vec![0.0; VECTOR_SIZE], |acc, word| {
        let at = word
            .bytes()
            .fold(7_usize, |h, b| h.wrapping_mul(31).wrapping_add(b as usize))
            % VECTOR_SIZE;
        acc.into_iter()
            .enumerate()
            .map(|(i, x)| if i == at { x + 1.0 } else { x })
            .collect()
    })
}

fn fail(world: &World, route: &'static str) -> Option<(StatusCode, Json<Value>)> {
    world.down.contains(route).then(|| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": route})),
        )
    })
}

fn ok(result: Value) -> (StatusCode, Json<Value>) {
    (
        StatusCode::OK,
        Json(json!({ "result": result, "status": "ok" })),
    )
}

async fn chat(
    State(world): State<Shared>,
    Json(request): Json<Value>,
) -> (StatusCode, Json<Value>) {
    let mut world = world.lock().unwrap();
    if let Some(down) = fail(&world, "chat") {
        return down;
    }
    let prompt = request["messages"][0]["content"]
        .as_str()
        .unwrap_or_default()
        .to_string();
    world.prompts.push(prompt);
    let text = world
        .replies
        .pop_front()
        .expect("fake: a reply is scripted");
    (
        StatusCode::OK,
        Json(
            json!({"message": {"role": "assistant", "content": text}, "prompt_eval_count": 1, "eval_count": 1}),
        ),
    )
}

async fn embed(
    State(world): State<Shared>,
    Json(request): Json<Value>,
) -> (StatusCode, Json<Value>) {
    let mut world = world.lock().unwrap();
    if let Some(down) = fail(&world, "embed") {
        return down;
    }
    let input = request["input"].as_str().unwrap_or_default().to_string();
    let vector = vector_of(&input);
    world.embedded.push(input);
    (StatusCode::OK, Json(json!({ "embeddings": [vector] })))
}

fn point(id: &str, vector: &[f32], payload: &Value, score: Option<f32>) -> Value {
    json!({ "id": id, "payload": payload, "vector": vector, "score": score })
}

async fn query(
    State(world): State<Shared>,
    Json(request): Json<Value>,
) -> (StatusCode, Json<Value>) {
    let mut world = world.lock().unwrap();
    if let Some(down) = fail(&world, "query") {
        return down;
    }
    world.queries += 1;
    let vector: Vec<f32> = serde_json::from_value(request["query"].clone()).unwrap();
    let limit = request["limit"].as_u64().unwrap_or(10) as usize;
    let scored: Vec<(f32, &String, &(Vec<f32>, Value))> = world
        .points
        .iter()
        .map(|(id, p)| (crate::rules::near::cosine(&vector, &p.0), id, p))
        .collect();
    let ranked = crate::sorted::sorted_by(scored, |a, b| b.0.total_cmp(&a.0));
    let points: Vec<Value> = ranked
        .into_iter()
        .take(limit)
        .map(|(score, id, p)| point(id, &p.0, &p.1, Some(score)))
        .collect();
    ok(json!({ "points": points }))
}

async fn upsert(
    State(world): State<Shared>,
    Json(request): Json<Value>,
) -> (StatusCode, Json<Value>) {
    let mut world = world.lock().unwrap();
    if let Some(down) = fail(&world, "upsert") {
        return down;
    }
    for p in request["points"].as_array().unwrap() {
        let vector: Vec<f32> = serde_json::from_value(p["vector"].clone()).unwrap();
        let mut stored = p["payload"].clone();
        if world.down.contains("garble") {
            stored["do"] = json!(["altro"]);
        }
        world
            .points
            .insert(p["id"].as_str().unwrap().to_string(), (vector, stored));
    }
    ok(json!({ "status": "completed" }))
}

async fn get(State(world): State<Shared>, Json(request): Json<Value>) -> (StatusCode, Json<Value>) {
    let world = world.lock().unwrap();
    if let Some(down) = fail(&world, "get") {
        return down;
    }
    let found: Vec<Value> = request["ids"]
        .as_array()
        .unwrap()
        .iter()
        .filter_map(|id| {
            id.as_str()
                .and_then(|i| world.points.get(i).map(|p| point(i, &p.0, &p.1, None)))
        })
        .collect();
    ok(json!(found))
}

async fn payload(
    State(world): State<Shared>,
    Json(request): Json<Value>,
) -> (StatusCode, Json<Value>) {
    let mut world = world.lock().unwrap();
    if let Some(down) = fail(&world, "payload") {
        return down;
    }
    for id in request["points"].as_array().unwrap() {
        if let Some(p) = world.points.get_mut(id.as_str().unwrap()) {
            for (k, v) in request["payload"].as_object().unwrap() {
                p.1[k] = v.clone();
            }
        }
    }
    ok(json!({ "status": "completed" }))
}

async fn scroll(State(world): State<Shared>) -> (StatusCode, Json<Value>) {
    let world = world.lock().unwrap();
    let points: Vec<Value> = world
        .points
        .iter()
        .map(|(id, p)| point(id, &p.0, &p.1, None))
        .collect();
    ok(json!({ "points": points, "next_page_offset": null }))
}

async fn collection(Path(_name): Path<String>) -> (StatusCode, Json<Value>) {
    ok(json!({ "status": "green" }))
}

pub(crate) async fn fake(replies: Vec<&str>) -> Fake {
    let world: Shared = Arc::new(Mutex::new(World {
        replies: replies.into_iter().map(str::to_string).collect(),
        ..World::default()
    }));
    let router = axum::Router::new()
        .route("/api/chat", axum::routing::post(chat))
        .route("/api/embed", axum::routing::post(embed))
        .route(
            "/collections/{name}",
            axum::routing::get(collection).put(collection),
        )
        .route(
            "/collections/{name}/points/query",
            axum::routing::post(query),
        )
        .route(
            "/collections/{name}/points/scroll",
            axum::routing::post(scroll),
        )
        .route(
            "/collections/{name}/points/payload",
            axum::routing::post(payload),
        )
        .route(
            "/collections/{name}/points",
            axum::routing::put(upsert).post(get),
        )
        .with_state(world.clone());
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let base = format!("http://{}", listener.local_addr().unwrap());
    tokio::spawn(async move { axum::serve(listener, router).await });
    let http = reqwest::Client::new();
    let embedder = Embedder::new(base.clone(), http.clone());
    Fake {
        chat: Chat::new(base.clone(), http.clone()),
        rules: Rules::new(
            Qdrant::new(base, http, crate::rules::COLLECTION),
            embedder.clone(),
        ),
        embedder,
        world,
    }
}

pub(crate) fn rule_payload(if_: &str, dos: &[&str]) -> Value {
    json!({ "if": if_, "do": dos, "tags": [] })
}

pub(crate) fn seed(world: &Shared, id: &str, if_: &str, dos: &[&str]) {
    world
        .lock()
        .unwrap()
        .points
        .insert(id.to_string(), (vector_of(if_), rule_payload(if_, dos)));
}

pub(crate) const EXCHANGE: &str = "0b7c4a2e-1f3d-4c5b-9a8e-7d6c5b4a3f21";

pub(crate) fn extractor(top_k: u32) -> crate::distill::config::Extractor {
    let role = |name: &str| json!({"model": "fake", "think": "off", "temperature": 0.2, "system": format!("you are the {name} role")});
    let config = json!({
        "episodes": role("episodes"), "extract": role("extract"),
        "critic": role("critic"), "novelty": role("novelty"),
        "checks": [{"name": "a", "text": "the rule is confused", "dropWhen": "atLeast", "threshold": 0.5}],
        "episodeChars": 4000, "targetInputChars": 400, "targetOutputChars": 400,
        "listingChars": 300, "vocabularySize": 20, "topK": top_k
    })
    .to_string();
    let row = crate::hist::Extractor {
        id: 7,
        parent: None,
        why: "the decide tests".to_string(),
        active: true,
        config,
        created: "2026-11-13T00:00:00Z".to_string(),
    };
    crate::distill::config::Extractor::from_row(&row, None)
        .expect("extractor: the test config is valid")
}

pub(crate) fn candidate(if_: &str, do_: &str) -> crate::distill::rule::RuleCandidate {
    crate::distill::rule::RuleCandidate {
        if_: if_.to_string(),
        do_: do_.to_string(),
        tags: vec!["sessione".to_string()],
        proposed_tags: Vec::new(),
        quote: if_.to_string(),
    }
}

pub(crate) fn checked(if_: &str, do_: &str) -> crate::distill::rule::Checked {
    let vocabulary = crate::distill::rule::TagVocabulary::of(&["sessione".to_string()]);
    let evidence = crate::distill::rule::Evidence {
        user: if_,
        vocabulary: &vocabulary,
    };
    candidate(if_, do_).check(&evidence)
}

pub(crate) fn judged(
    checked: &crate::distill::rule::Checked,
    p: f64,
) -> crate::distill::record::Outcome {
    let probabilities = json!({"a": p}).as_object().cloned().unwrap_or_default();
    let drop = (p >= 0.5).then_some("a");
    crate::distill::record::Outcome::of(checked).judged(probabilities, drop)
}
