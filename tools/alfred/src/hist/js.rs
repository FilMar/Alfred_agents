use serde_json::Value;

pub(crate) fn js(value: Option<&Value>) -> String {
    {
        fn number_text(number: &serde_json::Number) -> String {
            match number.as_i64() {
                Some(int) => int.to_string(),
                None => match number.as_u64() {
                    Some(int) => int.to_string(),
                    None => match number.as_f64().filter(|float| float.fract() == 0.0) {
                        // JavaScript prints an integral float without a decimal point
                        Some(float) if float.abs() <= 9_007_199_254_740_992.0 => {
                            (float as i64).to_string()
                        }
                        _ => number.to_string(),
                    },
                },
            }
        }
        fn plain(value: &Value) -> String {
            match value {
                Value::Null => "null".to_string(),
                Value::String(text) => text.clone(),
                Value::Bool(flag) => flag.to_string(),
                Value::Number(number) => number_text(number),
                Value::Object(_) => "[object Object]".to_string(),
                // an empty nested array prints nothing
                Value::Array(_) => String::new(),
            }
        }
        match value {
            None => "undefined".to_string(),
            Some(Value::Array(items)) => {
                let nested = |v: &Value| matches!(v, Value::Array(inner) if !inner.is_empty());
                let flat = std::iter::successors(Some(items.clone()), |level| {
                    level.iter().any(nested).then(|| {
                        level
                            .iter()
                            .flat_map(|v| {
                                if nested(v) {
                                    v.as_array().cloned().unwrap_or_default()
                                } else {
                                    vec![v.clone()]
                                }
                            })
                            .collect()
                    })
                });
                let parts: Vec<String> = flat
                    .last()
                    .unwrap_or_default()
                    .iter()
                    .map(|v| if v.is_null() { String::new() } else { plain(v) })
                    .collect();
                parts.join(",")
            }
            Some(other) => plain(other),
        }
    }
}
