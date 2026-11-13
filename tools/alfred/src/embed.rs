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

    pub fn from_env() -> Embedder {
        Embedder::new(
            crate::qdrant::env_base("OLLAMA_URL", "http://localhost:11434"),
            reqwest::Client::new(),
        )
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
        #[derive(serde::Deserialize)]
        struct Reply {
            embeddings: Vec<Vec<f32>>,
        }
        let upstream = |message: String| Upstream {
            service: "Ollama",
            message,
        };
        let request = serde_json::json!({ "model": MODEL, "input": input, "keep_alive": -1 });
        let sent = self
            .http
            .post(format!("{}/api/embed", self.base))
            .json(&request)
            .send()
            .await;
        let reply = match sent.and_then(reqwest::Response::error_for_status) {
            Ok(response) => response
                .json::<Reply>()
                .await
                .map_err(|e| upstream(e.to_string())),
            Err(error) => Err(upstream(error.to_string())),
        };
        let result = reply.and_then(|r| {
            r.embeddings
                .into_iter()
                .next()
                .filter(|v| v.len() == VECTOR_SIZE)
                .ok_or_else(|| {
                    upstream(format!("no embedding of {VECTOR_SIZE} values in response"))
                })
        });
        debug_assert!(
            result.as_ref().map_or(true, |v| v.len() == VECTOR_SIZE),
            "Embedder.embed: vector has 768 values"
        );
        result
    }
}
