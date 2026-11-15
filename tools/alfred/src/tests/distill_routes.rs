use crate::distill::routes::status_of;

#[test]
fn status_of_bad_input_is_400() {
    let error = crate::distill::run::RunError::BadInput("no tag vocabulary".to_string());
    assert_eq!(status_of(&error).as_u16(), 400);
}

#[test]
fn status_of_not_found_is_404() {
    let error = crate::distill::run::RunError::NotFound("extractor not found".to_string());
    assert_eq!(status_of(&error).as_u16(), 404);
}

#[test]
fn status_of_busy_is_409() {
    let error = crate::distill::run::RunError::Busy;
    assert_eq!(status_of(&error).as_u16(), 409);
}

#[test]
fn status_of_upstream_is_502() {
    let error = crate::distill::run::RunError::Upstream("rules list is down".to_string());
    assert_eq!(status_of(&error).as_u16(), 502);
}
