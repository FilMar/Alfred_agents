use serde_json::json;

use crate::distill::episodes::SessionMap;
use crate::distill::session::{SessionRead, Turn};
use crate::hist::episodes::derived_id;
use crate::hist::{Contents, Episode, Exchange};

const SESSION: &str = "f0000001-0000-4000-8000-000000000000";

fn id(tag: u32) -> String {
    format!("{tag:08x}-0000-4000-8000-000000000000")
}

fn turn(tag: u32, input: &str, output: &str) -> Turn {
    let exchange = Exchange {
        id: id(tag),
        session: SESSION.to_string(),
        parent: None,
        timestamp: format!("2026-01-01T10:00:0{tag}.000Z"),
        kind: "chat".to_string(),
        actor: "alfredo".to_string(),
        model: None,
        tokens_in: None,
        tokens_out: None,
        tokens_cache_read: None,
        tokens_cache_write: None,
        distilled: None,
        meta: None,
    };
    let contents = Contents {
        exchange_id: id(tag),
        input: input.to_string(),
        output: output.to_string(),
        tools: None,
    };
    Turn::of(exchange, contents)
}

fn read() -> SessionRead {
    SessionRead::of(
        SESSION.to_string(),
        vec![turn(2, "perché \"no\"?", "a\nb"), turn(3, "ok", "fatto")],
        vec![turn(1, "ciao", "ciao a te")],
    )
}

fn map() -> SessionMap {
    let episodes = json!({"episodes": [
        {"from": 0, "to": 0, "summary": "saluto"},
        {"from": 1, "to": 2, "summary": "il no e' spiegato"}
    ]});
    SessionMap::from_json(&episodes, &read())
}

#[test]
fn listing_quotes_each_side_as_json_and_cuts_it() {
    let read = read();
    assert_eq!(
        SessionMap::listing(&read.whole(), 4),
        "0: USER: \"ciao\"\n   AGENT: \"ciao\"\n1: USER: \"perc\"\n   AGENT: \"a\\nb\"\n2: USER: \"ok\"\n   AGENT: \"fatt\""
    );
}

#[test]
fn text_lists_the_episodes_under_the_header() {
    assert_eq!(
        map().text(),
        format!(
            "{}\n- [0-0] saluto\n- [1-2] il no e' spiegato",
            crate::distill::episodes::MAP_HEADER
        )
    );
}

#[test]
fn from_json_gives_each_episode_its_turns() {
    let map = map();
    let turns: Vec<Vec<&str>> = map
        .episodes()
        .iter()
        .map(|e| e.turns().iter().map(Turn::id).collect())
        .collect();
    assert_eq!(turns, vec![vec![id(1)], vec![id(2), id(3)]]);
}

#[test]
fn stored_derives_the_id_and_the_span_of_each_episode() {
    let stored = map().stored(4, "glm", "2026-01-02T00:00:00.000Z");
    let second = Episode {
        id: derived_id(SESSION, &id(2)),
        session: SESSION.to_string(),
        exchanges: vec![id(2), id(3)],
        from: "2026-01-01T10:00:02.000Z".to_string(),
        to: "2026-01-01T10:00:03.000Z".to_string(),
        summary: "il no e' spiegato".to_string(),
        extractor: 4,
        model: "glm".to_string(),
        created: "2026-01-02T00:00:00.000Z".to_string(),
    };
    assert_eq!(stored[1], second);
    assert_eq!(stored[0].id, derived_id(SESSION, &id(1)));
}

#[test]
#[should_panic(expected = "SessionMap.from_json: the json passes the check")]
fn from_json_refuses_a_map_with_a_gap() {
    let episodes = json!({"episodes": [{"from": 0, "to": 0, "summary": "a"}, {"from": 2, "to": 2, "summary": "b"}]});
    let _ = SessionMap::from_json(&episodes, &read());
}
