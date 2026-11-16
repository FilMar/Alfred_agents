use crate::command::hats::{get, names};

#[test]
fn names_are_in_order() {
    let _ = names();
}

#[test]
fn names_return_the_six_hats_in_order() {
    assert_eq!(
        names(),
        vec![
            "black-core",
            "blue-core",
            "green-core",
            "red-core",
            "white-core",
            "yellow-core",
        ]
    );
}

#[test]
fn get_returns_the_text_of_each_hat() {
    for name in [
        "black-core",
        "blue-core",
        "green-core",
        "red-core",
        "white-core",
        "yellow-core",
    ] {
        assert!(get(name).is_ok(), "hat {name} not found");
    }
}

#[test]
fn get_rejects_an_unknown_hat() {
    let available = "black-core, blue-core, green-core, red-core, white-core, yellow-core";
    for name in ["nope", "black-cor", ""] {
        assert_eq!(
            get(name).unwrap_err().to_string(),
            format!("Hat \"{name}\" not found. Available: {available}")
        );
    }
}
