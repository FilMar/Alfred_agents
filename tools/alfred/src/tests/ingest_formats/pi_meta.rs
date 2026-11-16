#[allow(unused_imports)]
use super::*;

#[test]
fn pi_meta_provider_is_the_last_answer_provider() {
    let opener = json!({"type": "message", "id": "op-1", "message": {"role": "user"}});
    let first = json!({"type": "message", "message": {"role": "assistant", "provider": "p1"}});
    let second = json!({"type": "message", "message": {"role": "assistant", "provider": "p2"}});
    assert_eq!(
        (PI.meta)(&opener, &[&first, &second]).unwrap(),
        json!({"source_id": "op-1", "provider": "p2"})
    );
}

#[test]
fn pi_meta_cost_usd_only_when_the_sum_is_positive() {
    let opener = json!({"type": "message", "id": "op-1", "message": {"role": "user"}});
    let zero = json!({
        "type": "message",
        "message": {"role": "assistant", "usage": {"cost": {"total": 0}}}
    });
    assert_eq!(
        (PI.meta)(&opener, &[&zero]).unwrap(),
        json!({"source_id": "op-1"})
    );
    let negative = json!({
        "type": "message",
        "message": {"role": "assistant", "usage": {"cost": {"total": -0.5}}}
    });
    assert_eq!(
        (PI.meta)(&opener, &[&negative]).unwrap(),
        json!({"source_id": "op-1"})
    );
    let no_cost = json!({
        "type": "message",
        "message": {"role": "assistant", "usage": {"input": 1}}
    });
    assert_eq!(
        (PI.meta)(&opener, &[&no_cost]).unwrap(),
        json!({"source_id": "op-1"})
    );
    let top_level = json!({
        "type": "message",
        "message": {"role": "assistant"},
        "usage": {"cost": {"total": 0.5}}
    });
    assert_eq!(
        (PI.meta)(&opener, &[&top_level]).unwrap(),
        json!({"source_id": "op-1", "cost_usd": 0.5})
    );
}

#[test]
fn pi_model_is_the_last_answer_model() {
    let first = json!({"type": "message", "message": {"role": "assistant", "model": "m1"}});
    let second = json!({"type": "message", "message": {"role": "assistant", "model": "m2"}});
    assert_eq!((PI.model)(&[&first, &second]).as_deref(), Some("m2"));
    let no_model = json!({"type": "message", "message": {"role": "assistant"}});
    assert_eq!((PI.model)(&[&no_model]).as_deref(), None);
    assert_eq!((PI.model)(&[]).as_deref(), None);
    let user = json!({"type": "message", "message": {"role": "user", "model": "u"}});
    assert_eq!((PI.model)(&[&second, &user]).as_deref(), Some("m2"));
}
