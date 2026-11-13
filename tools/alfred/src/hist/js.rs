use serde_json::Value;

pub(crate) fn js(value: Option<&Value>) -> String {
    let result: String = {
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
                // an array never reaches plain: the walk below flattens nested ones
                Value::Array(_) => String::new(),
            }
        }
        match value {
            None => "undefined".to_string(),
            Some(Value::Array(items)) => {
                let mut parts: Vec<String> = Vec::new();
                let mut stack = vec![items.iter()];
                while let Some(mut iter) = stack.pop() {
                    if let Some(item) = iter.next() {
                        stack.push(iter);
                        match item {
                            Value::Array(inner) if inner.is_empty() => {
                                parts.push(String::new());
                            }
                            Value::Array(inner) => stack.push(inner.iter()),
                            Value::Null => parts.push(String::new()),
                            other => parts.push(plain(other)),
                        }
                    }
                }
                parts.join(",")
            }
            Some(other) => plain(other),
        }
    };
    result
}
