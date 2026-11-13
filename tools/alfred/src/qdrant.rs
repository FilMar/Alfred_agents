use serde::Deserialize;
use serde::de::DeserializeOwned;
use serde_json::{Value, json};

use serde::Serialize;

use crate::upstream::Upstream;

pub const VECTOR_SIZE: usize = 768;
pub const SCROLL_PAGE: u32 = 100;
pub const MAX_POINTS: u32 = 10_000;

#[derive(Debug, Clone)]
pub struct Qdrant {
    base: String,
    http: reqwest::Client,
    collection: &'static str,
}

#[derive(Debug, Clone)]
pub struct Hit<P> {
    pub id: String,
    pub score: f32,
    pub body: P,
}

#[derive(Debug, Clone)]
pub struct Stored<P> {
    pub id: String,
    pub body: P,
    pub vector: Option<Vec<f32>>,
}

impl Qdrant {
    pub fn new(base: String, http: reqwest::Client, collection: &'static str) -> Qdrant {
        debug_assert!(
            !base.ends_with('/'),
            "Qdrant.new: base has no trailing slash"
        );
        Qdrant {
            base,
            http,
            collection,
        }
    }

    pub async fn ensure(&self) -> Result<(), Upstream> {
        let url = format!("{}/collections/{}", self.base, self.collection);
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

    pub async fn query<P: DeserializeOwned>(
        &self,
        vector: &[f32],
        limit: u32,
        filter: Option<Value>,
        threshold: Option<f32>,
    ) -> Result<Vec<Hit<P>>, Upstream> {
        debug_assert!(
            vector.len() == VECTOR_SIZE,
            "Qdrant.query: vector has 768 values"
        );
        let mut body = json!({ "query": vector, "limit": limit, "with_payload": true });
        body["filter"] = filter.unwrap_or(Value::Null);
        body["score_threshold"] = threshold.map_or(Value::Null, Value::from);
        let reply: Points<P> = self
            .call(self.http.post(self.points("query")).json(&body))
            .await?;
        let result: Result<Vec<Hit<P>>, Upstream> = Ok(reply
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

    pub async fn upsert<P: Serialize>(
        &self,
        id: &str,
        vector: &[f32],
        body: &P,
    ) -> Result<(), Upstream> {
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

    pub async fn scroll_all<P: DeserializeOwned>(
        &self,
        filter: Option<Value>,
        with_vector: bool,
    ) -> Result<Vec<Stored<P>>, Upstream> {
        let mut found: Vec<Stored<P>> = Vec::new();
        let mut offset = Value::Null;
        let mut pages = 0_u32;
        let result = loop {
            let body = json!({ "limit": SCROLL_PAGE, "offset": offset, "filter": filter, "with_payload": true, "with_vector": with_vector });
            let page: Page<P> = match self
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
                break Err(Upstream {
                    service: "Qdrant",
                    message: format!("more than {MAX_POINTS} points"),
                });
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

    pub async fn get<P: DeserializeOwned>(&self, id: &str) -> Result<Option<Stored<P>>, Upstream> {
        let body = json!({ "ids": [id], "with_payload": true, "with_vector": false });
        let points: Vec<Point<P>> = self
            .call(self.http.post(self.points_root()).json(&body))
            .await?;
        let result: Result<Option<Stored<P>>, Upstream> =
            Ok(points.into_iter().map(Point::stored).find(|p| p.id == id));
        debug_assert!(
            result
                .as_ref()
                .map_or(true, |p| p.as_ref().is_none_or(|p| p.id == id)),
            "Qdrant.get: the point has the id asked"
        );
        result
    }

    pub async fn set_payload(&self, ids: &[String], payload: Value) -> Result<(), Upstream> {
        let body = json!({ "payload": payload, "points": ids });
        let url = format!("{}?wait=true", self.points("payload"));
        self.call::<Value>(self.http.post(url).json(&body))
            .await
            .map(|_| ())
    }

    pub async fn delete_keys(&self, ids: &[String], keys: &[&str]) -> Result<(), Upstream> {
        let body = json!({ "keys": keys, "points": ids });
        let url = format!("{}?wait=true", self.points("payload/delete"));
        self.call::<Value>(self.http.post(url).json(&body))
            .await
            .map(|_| ())
    }

    pub async fn delete(&self, id: &str) -> Result<(), Upstream> {
        let body = json!({ "points": [id] });
        let url = format!("{}?wait=true", self.points("delete"));
        self.call::<Value>(self.http.post(url).json(&body))
            .await
            .map(|_| ())
    }

    fn points_root(&self) -> String {
        format!("{}/collections/{}/points", self.base, self.collection)
    }

    fn points(&self, action: &str) -> String {
        format!("{}/{action}", self.points_root())
    }

    async fn call<T: DeserializeOwned>(
        &self,
        request: reqwest::RequestBuilder,
    ) -> Result<T, Upstream> {
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
            Err(Upstream {
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
struct Points<P> {
    points: Vec<Point<P>>,
}

#[derive(Deserialize)]
struct Page<P> {
    points: Vec<Point<P>>,
    #[serde(default)]
    next_page_offset: Value,
}

#[derive(Deserialize)]
struct Point<P> {
    #[serde(deserialize_with = "id_text")]
    id: String,
    #[serde(default)]
    score: Option<f32>,
    payload: P,
    #[serde(default)]
    vector: Option<Vec<f32>>,
}

impl<P> Point<P> {
    fn stored(self) -> Stored<P> {
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

fn upstream(error: &reqwest::Error) -> Upstream {
    Upstream {
        service: "Qdrant",
        message: error.to_string(),
    }
}

fn check_vectors<P>(points: Vec<Stored<P>>, with_vector: bool) -> Result<Vec<Stored<P>>, Upstream> {
    if !with_vector || points.iter().all(has_full_vector) {
        Ok(points)
    } else {
        Err(Upstream {
            service: "Qdrant",
            message: "a stored vector does not have 768 values".into(),
        })
    }
}

fn has_full_vector<P>(point: &Stored<P>) -> bool {
    point
        .vector
        .as_ref()
        .is_some_and(|v| v.len() == VECTOR_SIZE)
}
