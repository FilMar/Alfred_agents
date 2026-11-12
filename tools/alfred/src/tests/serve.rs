use axum::http::StatusCode;

use crate::serve::status_of;
use crate::vault::VaultError;

#[test]
fn status_table() {
    let ambiguous = VaultError::Ambiguous {
        name: "n".into(),
        paths: vec![],
    };
    let no_section = VaultError::NoSection {
        name: "n".into(),
        id: "i".into(),
    };
    assert_eq!(
        status_of(&VaultError::NoPage("n".into())),
        StatusCode::NOT_FOUND
    );
    assert_eq!(status_of(&no_section), StatusCode::NOT_FOUND);
    assert_eq!(status_of(&ambiguous), StatusCode::CONFLICT);
    assert_eq!(
        status_of(&VaultError::BadName("n".into())),
        StatusCode::BAD_REQUEST
    );
    assert_eq!(
        status_of(&VaultError::TooLarge(1)),
        StatusCode::INTERNAL_SERVER_ERROR
    );
    assert_eq!(
        status_of(&VaultError::Io(std::io::Error::other("x"))),
        StatusCode::INTERNAL_SERVER_ERROR
    );
}
