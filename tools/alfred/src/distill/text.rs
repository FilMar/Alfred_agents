use unicode_normalization::UnicodeNormalization;

pub fn tag_key(tag: &str) -> String {
    let decomposed: String = tag
        .to_lowercase()
        .nfd()
        .filter(|c| !('\u{300}'..='\u{36f}').contains(c))
        .collect();
    let result: String = decomposed
        .split(|c: char| c.is_whitespace() || c == '_' || c == '-')
        .filter(|piece| !piece.is_empty())
        .collect::<Vec<_>>()
        .join("-");
    debug_assert!(
        !result.starts_with('-') && !result.ends_with('-') && !result.contains("--"),
        "tag_key: hyphens only inside, one at a time"
    );
    debug_assert!(
        !result
            .chars()
            .any(|c| c.is_uppercase() || c.is_whitespace() || c == '_'),
        "tag_key: no capital, space or underscore"
    );
    result
}

pub fn norm_text(text: &str) -> String {
    let result: String = text
        .to_lowercase()
        .chars()
        .map(|c| match c {
            '"' | '\'' | '`' | '«' | '»' | '“' | '”' | '.' | ',' | ';' | ':' | '!' | '?' | '('
            | ')' | '[' | ']' => ' ',
            other => other,
        })
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ");
    result
}

pub fn quote_in(quote: &str, text: &str, min: usize) -> bool {
    debug_assert!(min > 0, "quote_in: min is positive");
    let (needle, haystack) = (norm_text(quote), norm_text(text));
    let result: bool = needle.chars().count() >= min && haystack.contains(&needle);
    result
}

pub fn is_italian(text: &str) -> bool {
    let italian = [
        "il", "lo", "la", "gli", "le", "che", "di", "un", "una", "per", "non", "è", "sono", "con",
        "del", "della", "si", "come", "più", "quando", "se",
    ];
    let english = [
        "the", "and", "is", "of", "to", "that", "for", "with", "not", "are", "when", "if", "this",
        "it",
    ];
    let lowered = text.to_lowercase();
    let words: Vec<&str> = lowered
        .split(|c: char| !c.is_ascii_lowercase() && !"àèéìòù".contains(c))
        .filter(|word| !word.is_empty())
        .collect();
    let (italian_hits, english_hits) = (
        words.iter().filter(|word| italian.contains(word)).count(),
        words.iter().filter(|word| english.contains(word)).count(),
    );
    let result: bool = italian_hits >= english_hits;
    result
}
