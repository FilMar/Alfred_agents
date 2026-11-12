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
    #[error("bad reply from {url}")]
    BadReply { url: String, source: reqwest::Error },
}

#[derive(Debug)]
pub struct Client {
    base: String,
    http: reqwest::Client,
}

impl Client {
    pub fn from_env() -> Result<Client, ClientError> {
        let result: Result<Client, ClientError> = match std::env::var("ALFRED_URL") {
            Ok(url) => Ok(Client {
                base: url.trim_end_matches('/').to_owned(),
                http: reqwest::Client::new(),
            }),
            Err(_) => Err(ClientError::NoUrl),
        };
        debug_assert!(
            result.as_ref().map_or(true, |c| !c.base.ends_with('/')),
            "Client.from_env: base has no trailing slash"
        );
        result
    }

    pub async fn get<T: DeserializeOwned>(
        &self,
        path: &str,
        query: &[(&str, &str)],
    ) -> Result<T, ClientError> {
        debug_assert!(
            path.starts_with('/'),
            "Client.get: path starts with a slash"
        );
        let url = format!("{}{}", self.base, path);
        let result: Result<T, ClientError> = match self.http.get(&url).query(query).send().await {
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
