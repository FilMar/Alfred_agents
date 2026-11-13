#[allow(unused_imports)]
use super::*;

#[test]
fn pi_exchange_id_is_none_without_a_string_opener_id() {
    assert_eq!(
        (PI.exchange_id)(
            "session-1",
            &json!({"type": "message", "message": {"role": "user"}})
        ),
        None
    );
    assert_eq!((PI.exchange_id)("session-1", &json!({"id": 7})), None);
}

#[test]
fn pi_meta_is_source_id_provider_and_cost_in_order() {
    let opener = json!({"type": "message", "id": "op-1", "message": {"role": "user"}});
    let answer = json!({
        "type": "message",
        "message": {
            "role": "assistant",
            "provider": "anthropic",
            "model": "m",
            "usage": {"cost": {"total": 0.25}}
        }
    });
    let compaction = json!({"type": "compaction", "usage": {"cost": {"total": 0.25}}});
    let meta = (PI.meta)(&opener, &[&answer, &compaction]).unwrap();
    assert_eq!(
        meta,
        json!({"source_id": "op-1", "provider": "anthropic", "cost_usd": 0.5})
    );
    let keys: Vec<&str> = meta
        .as_object()
        .unwrap()
        .keys()
        .map(std::string::String::as_str)
        .collect();
    assert_eq!(keys, vec!["source_id", "provider", "cost_usd"]);
}

#[test]
fn pi_meta_omits_provider_when_no_answer_has_one() {
    let opener = json!({"type": "message", "id": "op-1", "message": {"role": "user"}});
    let answer = json!({"type": "message", "message": {"role": "assistant"}});
    assert_eq!(
        (PI.meta)(&opener, &[&answer]).unwrap(),
        json!({"source_id": "op-1"})
    );
    let compaction = json!({"type": "compaction"});
    assert_eq!(
        (PI.meta)(&opener, &[&compaction]).unwrap(),
        json!({"source_id": "op-1"})
    );
    assert_eq!(
        (PI.meta)(&opener, &[]).unwrap(),
        json!({"source_id": "op-1"})
    );
}
