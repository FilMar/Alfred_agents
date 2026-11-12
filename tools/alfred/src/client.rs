use serde::Serialize;
use serde::de::DeserializeOwned;

use crate::api::ErrorReply;

#[derive(Debug, thiserror::Error)]
pub enum ClientError {
    #[error("ALFRED_URL is not set")]
    NoUrl,
    #[error("alfred serve not reachable at {url}")]
    Unreachable { url: String, source: reqwest::Error },
    #[error("{reply}")]
    Api { code: u16, reply: ErrorReply },
    #[error("{0}")]
    Input(String),
    #[error("bad reply from {url}")]
    BadReply { url: String, source: reqwest::Error },
}

#[derive(Debug)]
pub struct Client {
    base: String,
    http: reqwest::Client,
    timeout: Option<std::time::Duration>,
}

impl Client {
    pub fn from_env() -> Result<Client, ClientError> {
        let result: Result<Client, ClientError> = match std::env::var("ALFRED_URL") {
            Ok(url) => Ok(Client {
                base: url.trim_end_matches('/').to_owned(),
                http: reqwest::Client::new(),
                timeout: None,
            }),
            Err(_) => Err(ClientError::NoUrl),
        };
        debug_assert!(
            result.as_ref().map_or(true, |c| !c.base.ends_with('/')),
            "Client.from_env: base has no trailing slash"
        );
        result
    }

    pub fn with_timeout(self, timeout: std::time::Duration) -> Client {
        Client {
            timeout: Some(timeout),
            ..self
        }
    }

    pub async fn get<T: DeserializeOwned>(
        &self,
        path: &str,
        query: &[(&str, &str)],
    ) -> Result<T, ClientError> {
        let url = self.url(path);
        self.send(self.http.get(&url).query(query), url).await
    }

    pub async fn post<B: Serialize, T: DeserializeOwned>(
        &self,
        path: &str,
        body: &B,
    ) -> Result<T, ClientError> {
        let url = self.url(path);
        self.send(self.http.post(&url).json(body), url).await
    }

    pub async fn delete<T: DeserializeOwned>(&self, path: &str) -> Result<T, ClientError> {
        let url = self.url(path);
        self.send(self.http.delete(&url), url).await
    }

    fn url(&self, path: &str) -> String {
        debug_assert!(
            path.starts_with('/'),
            "Client.url: path starts with a slash"
        );
        format!("{}{}", self.base, path)
    }

    async fn send<T: DeserializeOwned>(
        &self,
        request: reqwest::RequestBuilder,
        url: String,
    ) -> Result<T, ClientError> {
        let request = match self.timeout {
            Some(timeout) => request.timeout(timeout),
            None => request,
        };
        let result: Result<T, ClientError> = match request.send().await {
            Err(source) => Err(ClientError::Unreachable { url, source }),
            Ok(response) if response.status().is_success() => response
                .json()
                .await
                .map_err(|source| ClientError::BadReply { url, source }),
            Ok(response) => {
                let code = response.status().as_u16();
                match response.json::<ErrorReply>().await {
                    Ok(reply) => Err(ClientError::Api { code, reply }),
                    Err(source) => Err(ClientError::BadReply { url, source }),
                }
            }
        };
        result
    }
}
