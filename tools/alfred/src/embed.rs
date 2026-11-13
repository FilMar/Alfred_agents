use crate::qdrant::VECTOR_SIZE;
use crate::upstream::Upstream;

pub const MODEL: &str = "nomic-embed-text-v2-moe";
const DOCUMENT_PREFIX: &str = "search_document: ";
const QUERY_PREFIX: &str = "search_query: ";

#[derive(Debug, Clone)]
pub struct Embedder {
    base: String,
    http: reqwest::Client,
}

impl Embedder {
    pub fn new(base: String, http: reqwest::Client) -> Embedder {
        debug_assert!(
            !base.ends_with('/'),
            "Embedder.new: base has no trailing slash"
        );
        Embedder { base, http }
    }

    pub async fn document(&self, text: &str) -> Result<Vec<f32>, Upstream> {
        self.embed(&format!("{DOCUMENT_PREFIX}{text}")).await
    }

    pub async fn query(&self, text: &str) -> Result<Vec<f32>, Upstream> {
        self.embed(&format!("{QUERY_PREFIX}{text}")).await
    }

    pub async fn warm(&self) -> Result<(), Upstream> {
        self.embed(QUERY_PREFIX).await.map(|_| ())
    }

    async fn embed(&self, input: &str) -> Result<Vec<f32>, Upstream> {
        let result: Result<Vec<f32>, Upstream> = async {
            let upstream = |error: reqwest::Error| Upstream {
                service: "Ollama",
                message: error.to_string(),
            };
            let request = serde_json::json!({
                "model": MODEL,
                "input": input,
                "keep_alive": -1,
            });
            let response = self
                .http
                .post(format!("{}/api/embed", self.base))
                .json(&request)
                .send()
                .await
                .and_then(reqwest::Response::error_for_status)
                .map_err(upstream)?;
            let reply: serde_json::Value = response.json().await.map_err(upstream)?;
            let vector = reply
                .pointer("/embeddings/0")
                .and_then(serde_json::Value::as_array)
                .and_then(|values| {
                    values
                        .iter()
                        .map(|value| value.as_f64().map(|number| number as f32))
                        .collect::<Option<Vec<f32>>>()
                })
                .filter(|values| values.len() == VECTOR_SIZE)
                .ok_or_else(|| Upstream {
                    service: "Ollama",
                    message: format!("no embedding of {VECTOR_SIZE} values in response"),
                })?;
            Ok(vector)
        }
        .await;
        debug_assert!(
            result.as_ref().map_or(true, |v| v.len() == VECTOR_SIZE),
            "Embedder.embed: vector has 768 values"
        );
        result
    }
}
