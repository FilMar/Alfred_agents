use super::CommandError;

const HATS: [(&str, &str); 6] = [
    ("black-core", include_str!("hats/black-core.md")),
    ("blue-core", include_str!("hats/blue-core.md")),
    ("green-core", include_str!("hats/green-core.md")),
    ("red-core", include_str!("hats/red-core.md")),
    ("white-core", include_str!("hats/white-core.md")),
    ("yellow-core", include_str!("hats/yellow-core.md")),
];

pub fn names() -> Vec<&'static str> {
    let result: Vec<&'static str> = HATS.iter().map(|(name, _)| *name).collect();
    debug_assert!(result.is_sorted(), "hats.names: the names are in order");
    result
}

pub fn get(name: &str) -> Result<&'static str, CommandError> {
    HATS.iter()
        .find(|(hat, _)| *hat == name)
        .map(|(_, text)| *text)
        .ok_or_else(|| {
            CommandError::BadInput(format!(
                "Hat \"{name}\" not found. Available: {}",
                names().join(", ")
            ))
        })
}
