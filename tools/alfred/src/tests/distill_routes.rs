use crate::distill::routes::status_of;
use crate::distill::run::RunError;

#[test]
fn status_of_maps_each_error_to_its_code() {
    let table = [
        (RunError::BadInput("no tag vocabulary".to_string()), 400),
        (RunError::NotFound("extractor not found".to_string()), 404),
        (RunError::Busy, 409),
        (RunError::Upstream("rules list is down".to_string()), 502),
    ];
    for (error, code) in table {
        assert_eq!(status_of(&error).as_u16(), code, "{error:?}");
    }
}
