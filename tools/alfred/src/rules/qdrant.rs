use serde::Deserialize;
use serde::de::DeserializeOwned;
use serde_json::{Value, json};

use super::{RuleBody, RulesError, VECTOR_SIZE};

pub const COLLECTION: &str = "pi_identity";
pub const SCROLL_PAGE: u32 = 100;
pub const MAX_POINTS: u32 = 10_000;

#[derive(Debug, Clone)]
pub struct Qdrant {
    base: String,
    http: reqwest::Client,
}

#[derive(Debug, Clone)]
pub struct Hit {
    pub id: String,
    pub score: f32,
    pub body: RuleBody,
}

#[derive(Debug, Clone)]
pub struct Stored {
    pub id: String,
    pub body: RuleBody,
    pub vector: Option<Vec<f32>>,
}

impl Qdrant {
    pub fn new(base: String, http: reqwest::Client) -> Qdrant {
        debug_assert!(
            !base.ends_with('/'),
            "Qdrant.new: base has no trailing slash"
        );
        Qdrant { base, http }
    }

    pub async fn ensure(&self) -> Result<(), RulesError> {
        let url = format!("{}/collections/{COLLECTION}", self.base);
        let exists = self
            .http
            .get(&url)
            .send()
            .await
            .map_err(|e| upstream(&e))?
            .status()
            .is_success();

        if exists {
            Ok(())
        } else {
            let body = json!({ "vectors": { "size": VECTOR_SIZE, "distance": "Cosine" } });
            self.call::<Value>(self.http.put(&url).json(&body))
                .await
                .map(|_| ())
        }
    }

    pub async fn query(
        &self,
        vector: &[f32],
        limit: u32,
        filter: Option<Value>,
        threshold: Option<f32>,
    ) -> Result<Vec<Hit>, RulesError> {
        debug_assert!(
            vector.len() == VECTOR_SIZE,
            "Qdrant.query: vector has 768 values"
        );
        let mut body = json!({ "query": vector, "limit": limit, "with_payload": true });
        body["filter"] = filter.unwrap_or(Value::Null);
        body["score_threshold"] = threshold.map_or(Value::Null, Value::from);
        let reply: Points = self
            .call(self.http.post(self.points("query")).json(&body))
            .await?;
        let result: Result<Vec<Hit>, RulesError> = Ok(reply
            .points
            .into_iter()
            .map(|p| Hit {
                id: p.id,
                score: p.score.unwrap_or(0.0),
                body: p.payload,
            })
            .collect());
        debug_assert!(
            result
                .as_ref()
                .map_or(true, |hits| hits.len() <= limit as usize),
            "Qdrant.query: at most limit hits"
        );
        result
    }

    pub async fn upsert(
        &self,
        id: &str,
        vector: &[f32],
        body: &RuleBody,
    ) -> Result<(), RulesError> {
        debug_assert!(
            vector.len() == VECTOR_SIZE,
            "Qdrant.upsert: vector has 768 values"
        );
        let request = json!({ "points": [{ "id": id, "vector": vector, "payload": body }] });
        let url = format!("{}?wait=true", self.points_root());
        self.call::<Value>(self.http.put(url).json(&request))
            .await
            .map(|_| ())
    }

    pub async fn scroll_all(
        &self,
        filter: Option<Value>,
        with_vector: bool,
    ) -> Result<Vec<Stored>, RulesError> {
        let mut found: Vec<Stored> = Vec::new();
        let mut offset = Value::Null;
        let mut pages = 0_u32;
        let result = loop {
            let body = json!({ "limit": SCROLL_PAGE, "offset": offset, "filter": filter, "with_payload": true, "with_vector": with_vector });
            let page: Page = match self
                .call(self.http.post(self.points("scroll")).json(&body))
                .await
            {
                Ok(page) => page,
                Err(error) => break Err(error),
            };
            found.extend(page.points.into_iter().map(Point::stored));
            pages += 1;
            if page.next_page_offset.is_null() {
                break check_vectors(found, with_vector);
            }
            if pages * SCROLL_PAGE >= MAX_POINTS {
                break Err(RulesError::TooMany(MAX_POINTS));
            }
            offset = page.next_page_offset;
        };
        debug_assert!(
            result
                .as_ref()
                .map_or(true, |ps| !with_vector || ps.iter().all(has_full_vector)),
            "Qdrant.scroll_all: every vector has 768 values"
        );
        result
    }

    pub async fn get(&self, id: &str) -> Result<Option<Stored>, RulesError> {
        let body = json!({ "ids": [id], "with_payload": true, "with_vector": false });
        let points: Vec<Point> = self
            .call(self.http.post(self.points_root()).json(&body))
            .await?;
        let result: Result<Option<Stored>, RulesError> =
            Ok(points.into_iter().map(Point::stored).find(|p| p.id == id));
        debug_assert!(
            result
                .as_ref()
                .map_or(true, |p| p.as_ref().is_none_or(|p| p.id == id)),
            "Qdrant.get: the point has the id asked"
        );
        result
    }

    pub async fn set_payload(&self, ids: &[String], payload: Value) -> Result<(), RulesError> {
        let body = json!({ "payload": payload, "points": ids });
        let url = format!("{}?wait=true", self.points("payload"));
        self.call::<Value>(self.http.post(url).json(&body))
            .await
            .map(|_| ())
    }

    pub async fn delete_keys(&self, ids: &[String], keys: &[&str]) -> Result<(), RulesError> {
        let body = json!({ "keys": keys, "points": ids });
        let url = format!("{}?wait=true", self.points("payload/delete"));
        self.call::<Value>(self.http.post(url).json(&body))
            .await
            .map(|_| ())
    }

    pub async fn delete(&self, id: &str) -> Result<(), RulesError> {
        let body = json!({ "points": [id] });
        let url = format!("{}?wait=true", self.points("delete"));
        self.call::<Value>(self.http.post(url).json(&body))
            .await
            .map(|_| ())
    }

    fn points_root(&self) -> String {
        format!("{}/collections/{COLLECTION}/points", self.base)
    }

    fn points(&self, action: &str) -> String {
        format!("{}/{action}", self.points_root())
    }

    async fn call<T: DeserializeOwned>(
        &self,
        request: reqwest::RequestBuilder,
    ) -> Result<T, RulesError> {
        let response = request.send().await.map_err(|e| upstream(&e))?;
        let status = response.status();

        if status.is_success() {
            response
                .json::<Reply<T>>()
                .await
                .map(|r| r.result)
                .map_err(|e| upstream(&e))
        } else {
            let text = response.text().await.unwrap_or_default();
            Err(RulesError::Upstream {
                service: "Qdrant",
                message: format!("{status}: {text}"),
            })
        }
    }
}

#[derive(Deserialize)]
struct Reply<T> {
    result: T,
}

#[derive(Deserialize)]
struct Points {
    points: Vec<Point>,
}

#[derive(Deserialize)]
struct Page {
    points: Vec<Point>,
    #[serde(default)]
    next_page_offset: Value,
}

#[derive(Deserialize)]
struct Point {
    #[serde(deserialize_with = "id_text")]
    id: String,
    #[serde(default)]
    score: Option<f32>,
    payload: RuleBody,
    #[serde(default)]
    vector: Option<Vec<f32>>,
}

impl Point {
    fn stored(self) -> Stored {
        Stored {
            id: self.id,
            body: self.payload,
            vector: self.vector,
        }
    }
}

fn id_text<'de, D: serde::Deserializer<'de>>(de: D) -> Result<String, D::Error> {
    let value = Value::deserialize(de)?;
    Ok(value
        .as_str()
        .map_or_else(|| value.to_string(), str::to_string))
}

fn upstream(error: &reqwest::Error) -> RulesError {
    RulesError::Upstream {
        service: "Qdrant",
        message: error.to_string(),
    }
}

fn check_vectors(points: Vec<Stored>, with_vector: bool) -> Result<Vec<Stored>, RulesError> {
    if !with_vector || points.iter().all(has_full_vector) {
        Ok(points)
    } else {
        Err(RulesError::Upstream {
            service: "Qdrant",
            message: "a stored vector does not have 768 values".into(),
        })
    }
}

impl Stored {
    pub fn rule(self) -> super::Rule {
        super::Rule {
            id: self.id,
            body: self.body,
        }
    }
}

fn has_full_vector(point: &Stored) -> bool {
    point
        .vector
        .as_ref()
        .is_some_and(|v| v.len() == VECTOR_SIZE)
}
