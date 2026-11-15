use jiff::Timestamp;
use serde::Serialize;

use super::decide::Carry;
use super::episodes::{SessionMap, Split};
use super::extract::Target;
use super::save::{Budget, Mode};
use super::session::SessionRead;
use super::target::{Context, ExchangeReport, distill_target};
use super::twin::SessionList;

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct SessionReport {
    pub session: String,
    pub turns: u32,
    pub split: &'static str,
    pub closed: u32,
    pub failures: Vec<String>,
    pub exchanges: Vec<ExchangeReport>,
}

pub async fn distill_session(
    context: &Context<'_>,
    read: &SessionRead,
    budget: Budget,
    now: Timestamp,
) -> (SessionReport, Budget) {
    debug_assert!(
        !read.turns().is_empty(),
        "distill_session: the session has a pending turn"
    );
    let tools = &context.tools;
    let split = SessionMap::split(read, tools.extractor, tools.chat).await;
    let episodes = write_episodes(context, read, &split).await;
    let targets: Vec<Target<'_>> = split.map.as_ref().map_or_else(Vec::new, |map| {
        map.episodes()
            .iter()
            .flat_map(|episode| {
                (0..episode.turns().len()).map(move |index| {
                    Target::of(map, episode, u32::try_from(index).unwrap_or(u32::MAX))
                })
            })
            .filter(|target| read.is_pending(target.turn()))
            .collect()
    });
    let mut carry = Carry {
        list: SessionList::default(),
        budget,
    };
    let mut exchanges: Vec<ExchangeReport> = Vec::with_capacity(targets.len());
    for target in &targets {
        let (report, next) = distill_target(context, target, carry, now).await;
        carry = next;
        exchanges.push(report);
    }
    let failures: Vec<String> = episodes
        .into_iter()
        .chain(session_failures(split.map.is_some(), &exchanges))
        .collect();
    let (closed, failures) = close(context, read, failures);
    let report = SessionReport {
        session: read.session().to_string(),
        turns: u32::try_from(read.turns().len()).unwrap_or(u32::MAX),
        split: if split.map.is_some() { "ok" } else { "failed" },
        closed,
        failures,
        exchanges,
    };
    let result: (SessionReport, Budget) = (report, carry.budget);
    debug_assert!(
        result.0.split == "ok" || result.0.exchanges.is_empty(),
        "distill_session: a failed split reports no exchange"
    );
    debug_assert!(
        result.0.split == "ok" || !result.0.failures.is_empty(),
        "distill_session: a failed split is a failure"
    );
    debug_assert!(
        result.0.split != "ok" || reports_every_turn(&result.0, read),
        "distill_session: an ok split reports every pending turn, in order"
    );
    result
}

pub async fn write_episodes(
    context: &Context<'_>,
    read: &SessionRead,
    split: &Split,
) -> Option<String> {
    let result: Option<String> = match (&split.map, context.tools.mode) {
        (Some(map), Mode::Active) => {
            let stored = map.stored(
                context.tools.extractor.id(),
                &context.tools.extractor.config().episodes.model,
                context.recorder.run(),
            );
            context
                .episodes
                .write(read.session(), &stored)
                .await
                .err()
                .map(|e| format!("episodes: {e}"))
        }
        _ => None,
    };
    debug_assert!(
        context.tools.mode == Mode::Active || result.is_none(),
        "write_episodes: shadow writes nothing and fails nothing"
    );
    result
}

pub fn close(
    context: &Context<'_>,
    read: &SessionRead,
    failures: Vec<String>,
) -> (u32, Vec<String>) {
    let before = failures.len();
    let ids = read.closing_ids();
    let run = context.recorder.run();
    let closes = context.tools.mode == Mode::Active && failures.is_empty();
    let result: (u32, Vec<String>) = if closes {
        match ids
            .iter()
            .try_for_each(|id| context.hist.set_distilled(id, Some(run)).map(|_| ()))
        {
            Ok(()) => (u32::try_from(ids.len()).unwrap_or(u32::MAX), failures),
            Err(e) => (0, [failures, vec![format!("close: {e}")]].concat()),
        }
    } else {
        (0, failures)
    };
    debug_assert!(
        result.0 == 0 || before == 0,
        "close: a session with a failure is not closed"
    );
    debug_assert!(
        result.0 == 0 || result.0 as usize == read.closing_ids().len(),
        "close: a closed session closes every exchange read, noise too"
    );
    debug_assert!(
        context.tools.mode == Mode::Active || result.0 == 0,
        "close: only active mode closes"
    );
    result
}

pub fn session_failures(split_ok: bool, exchanges: &[ExchangeReport]) -> Vec<String> {
    let result: Vec<String> = (!split_ok)
        .then(|| "split failed".to_string())
        .into_iter()
        .chain(exchanges.iter().flat_map(|e| e.failures.iter().cloned()))
        .collect();
    debug_assert!(
        split_ok || !result.is_empty(),
        "session_failures: a failed split is a failure"
    );
    debug_assert!(
        result.len() >= exchanges.iter().map(|e| e.failures.len()).sum::<usize>(),
        "session_failures: every exchange failure is kept"
    );
    result
}

fn reports_every_turn(report: &SessionReport, read: &SessionRead) -> bool {
    report
        .exchanges
        .iter()
        .map(|e| e.exchange.as_str())
        .eq(read.turns().iter().map(super::session::Turn::id))
}
