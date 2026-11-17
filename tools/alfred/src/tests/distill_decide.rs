use crate::distill::decide::{known_for, neighbour_of};
use crate::distill::twin::{Known, SessionList};
use crate::rules::{Rule, RuleBody};

fn rule(id: &str, if_: &str, dos: &[&str]) -> Rule {
    Rule {
        id: id.to_string(),
        body: RuleBody {
            if_: if_.to_string(),
            do_: dos.iter().map(|d| (*d).to_string()).collect(),
            ..RuleBody::default()
        },
    }
}

fn known(key: &str) -> Known {
    Known::neighbour(key.to_string(), format!("SE {key} ALLORA x"))
}

#[test]
fn neighbour_of_joins_the_dos() {
    let found = neighbour_of(&rule("r1", "piove", &["chiudi", "esci"]));
    assert_eq!(
        (found.key(), found.text()),
        ("r1", "SE piove ALLORA chiudi; esci")
    );
}

#[test]
#[should_panic(expected = "neighbour_of: the rule has an if")]
fn neighbour_of_rejects_a_blank_if() {
    neighbour_of(&rule("r1", " ", &["chiudi"]));
}

#[test]
#[should_panic(expected = "neighbour_of: the rule has a do")]
fn neighbour_of_rejects_no_do() {
    neighbour_of(&rule("r1", "piove", &[]));
}

#[test]
fn known_for_drops_repeated_neighbours_and_puts_the_session_last() {
    let list = SessionList::default().with("SE a ALLORA b".to_string(), None, None);
    let found = known_for(vec![known("r1"), known("r2"), known("r1")], &list);
    let keys: Vec<&str> = found.iter().map(Known::key).collect();
    assert_eq!(keys, ["r1", "r2", "session:0"]);
}

#[test]
fn known_for_drops_a_neighbour_the_session_already_holds() {
    let list =
        SessionList::default().with("SE a ALLORA b".to_string(), Some("r2".to_string()), None);
    let found = known_for(vec![known("r1"), known("r2")], &list);
    let pairs: Vec<(&str, &str)> = found.iter().map(|k| (k.key(), k.text())).collect();
    assert_eq!(pairs.len(), 2);
    assert_eq!(pairs[0].0, "r1");
    assert_eq!(pairs[1], ("r2", "SE a ALLORA b"));
}
