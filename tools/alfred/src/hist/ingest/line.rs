use serde::de::DeserializeOwned;
use serde::{Deserialize, Deserializer};
use serde_json::Value;

#[derive(Debug, Default, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct Line {
    #[serde(rename = "type")]
    #[serde(deserialize_with = "lenient")]
    pub kind: Option<String>,
    #[serde(deserialize_with = "lenient")]
    pub uuid: Option<String>,
    #[serde(deserialize_with = "lenient")]
    pub session_id: Option<String>,
    #[serde(deserialize_with = "lenient")]
    pub id: Option<String>,
    #[serde(deserialize_with = "lenient")]
    pub timestamp: Option<String>,
    #[serde(deserialize_with = "lenient")]
    pub cwd: Option<String>,
    #[serde(deserialize_with = "lenient")]
    pub origin: Option<Origin>,
    #[serde(deserialize_with = "lenient")]
    pub message: Option<Message>,
    #[serde(deserialize_with = "lenient")]
    pub usage: Option<Usage>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(default)]
pub struct Origin {
    #[serde(deserialize_with = "lenient")]
    pub kind: Option<String>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(default)]
pub struct Message {
    #[serde(deserialize_with = "lenient")]
    pub role: Option<String>,
    #[serde(deserialize_with = "lenient")]
    pub model: Option<String>,
    #[serde(deserialize_with = "lenient")]
    pub provider: Option<String>,
    #[serde(deserialize_with = "lenient")]
    pub content: Option<Content>,
    #[serde(deserialize_with = "lenient")]
    pub usage: Option<Usage>,
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
pub enum Content {
    Text(String),
    Parts(Vec<Part>),
}

#[derive(Debug, Default, Deserialize)]
#[serde(default)]
pub struct Part {
    #[serde(rename = "type")]
    #[serde(deserialize_with = "lenient")]
    pub kind: Option<String>,
    #[serde(deserialize_with = "lenient")]
    pub text: Option<String>,
    #[serde(deserialize_with = "lenient")]
    pub name: Option<String>,
    pub input: Option<Value>,
    pub arguments: Option<Value>,
    pub content: Option<Value>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(default)]
pub struct Usage {
    #[serde(deserialize_with = "lenient")]
    pub input_tokens: Option<i64>,
    #[serde(deserialize_with = "lenient")]
    pub output_tokens: Option<i64>,
    #[serde(deserialize_with = "lenient")]
    pub cache_read_input_tokens: Option<i64>,
    #[serde(deserialize_with = "lenient")]
    pub cache_creation_input_tokens: Option<i64>,
    #[serde(deserialize_with = "lenient")]
    pub input: Option<i64>,
    #[serde(deserialize_with = "lenient")]
    pub output: Option<i64>,
    #[serde(rename = "cacheRead")]
    #[serde(deserialize_with = "lenient")]
    pub cache_read: Option<i64>,
    #[serde(rename = "cacheWrite")]
    #[serde(deserialize_with = "lenient")]
    pub cache_write: Option<i64>,
    #[serde(deserialize_with = "lenient")]
    pub cost: Option<Cost>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(default)]
pub struct Cost {
    #[serde(deserialize_with = "lenient")]
    pub total: Option<f64>,
}

impl Line {
    pub fn is(&self, kind: &str) -> bool {
        self.kind.as_deref() == Some(kind)
    }

    pub fn role(&self) -> Option<&str> {
        self.message.as_ref()?.role.as_deref()
    }

    pub fn origin_kind(&self) -> Option<&str> {
        self.origin.as_ref()?.kind.as_deref()
    }

    pub fn model(&self) -> Option<&str> {
        self.message.as_ref()?.model.as_deref()
    }

    pub fn provider(&self) -> Option<&str> {
        self.message.as_ref()?.provider.as_deref()
    }

    pub fn message_usage(&self) -> Option<&Usage> {
        self.message.as_ref()?.usage.as_ref()
    }

    pub fn text(&self) -> Option<&str> {
        match self.message.as_ref()?.content.as_ref()? {
            Content::Text(text) => Some(text),
            Content::Parts(_) => None,
        }
    }

    pub fn parts(&self) -> &[Part] {
        match self.message.as_ref().and_then(|m| m.content.as_ref()) {
            Some(Content::Parts(parts)) => parts,
            _ => &[],
        }
    }
}

impl Part {
    pub fn is(&self, kind: &str) -> bool {
        self.kind.as_deref() == Some(kind)
    }

    pub fn text(&self) -> &str {
        self.text.as_deref().unwrap_or("")
    }

    pub fn name(&self) -> &str {
        self.name.as_deref().unwrap_or("?")
    }
}

fn lenient<'de, D: Deserializer<'de>, T: DeserializeOwned>(de: D) -> Result<Option<T>, D::Error> {
    Ok(serde_json::from_value(Value::deserialize(de)?).ok())
}
