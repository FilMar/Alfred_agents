import { assert, isNonBlank } from "../../common/contract.js";
import type { Extractor } from "./config.js";
import { critique, kindOf } from "./critic.js";
import type { Candidate, Judgement } from "./critic.js";
import { SessionMap } from "./episodes.js";
import type { SessionSplit } from "./episodes.js";
import { extractFrom, loadVocabulary, targetOf, targetTurn } from "./extraction.js";
import type { Extraction, Target } from "./extraction.js";
import type { ModelAnswer } from "./model_caller.js";
import { neighboursOf } from "./neighbours.js";
import type { Neighbour } from "./neighbours.js";
import { judgeNovelty, savedText, SessionList } from "./novelty.js";
import type { Known, Verdict } from "./novelty.js";
import { Outcome, Recorder } from "./recorder.js";
import type { Version } from "./registry.js";
import { actionOf, Budget, closeExchanges, saveItem, worldFailure } from "./save.js";
import type { Mode, SaveResult } from "./save.js";
import { writeEpisodes } from "../../tl/src/episode_store.js";
import { episodeOf } from "../../tl/src/episodes.js";
import type { Episode as StoredEpisode } from "../../tl/src/episodes.js";
import { SessionRead } from "./session.js";
import type { Turn } from "./session.js";

export type Decision = Readonly<{
  answer: ModelAnswer | null;
  verdicts: readonly Verdict[];
  saves: readonly SaveResult[];
  failures: readonly string[];
}>;

export const UNDECIDED: Decision = { answer: null, verdicts: [], saves: [], failures: [] };

export type ExchangeReport = Readonly<{
  turn: Turn;
  extraction: Extraction;
  judgements: readonly Judgement[];
  outcomes: readonly Outcome[];
  decision: Decision;
}>;

export type SessionReport = Readonly<{
  read: SessionRead;
  split: SessionSplit;
  exchanges: readonly ExchangeReport[];
  failures: readonly string[];
  closed: readonly string[];
}>;

export type Distiller = Readonly<{
  extractor: Extractor;
  vocabulary: readonly string[];
  recorder: Recorder;
  mode: Mode;
  budget: Budget;
}>;

export async function distillerOf(version: Version, now: Date, mode: Mode = "shadow", maxSaved: number | null = null): Promise<Distiller> {
  let result: Distiller;
  const recorder = Recorder.start(version.id(), now);
  const extractor = version.extractor();
  const vocabulary = await loadVocabulary(extractor.vocabularySize());
  result = { extractor, vocabulary, recorder, mode, budget: Budget.of(maxSaved) };
  assert(result.extractor === version.extractor(), "distillerOf: the extractor is the one of the version");
  assert(result.recorder.run() === now.toISOString(), "distillerOf: the run is the time given");
  return result;
}

export async function distillTarget(distiller: Distiller, target: Target): Promise<ExchangeReport> {
  let result: ExchangeReport;
  const extraction = await extractFrom(target, distiller.vocabulary, distiller.extractor);
  const judgements: Judgement[] = [];
  const outcomes: Outcome[] = [];
  if (extraction.answer.isOk()) {
    for (const checked of extraction.notes) {
      const judged = await judge(Outcome.ofNote(checked), checked.isKept() ? checked.candidate() : null, target, distiller.extractor);
      judgements.push(...judged.judgements);
      outcomes.push(judged.outcome);
    }
    for (const checked of extraction.rules) {
      const judged = await judge(Outcome.ofRule(checked), checked.isKept() ? checked.candidate() : null, target, distiller.extractor);
      judgements.push(...judged.judgements);
      outcomes.push(judged.outcome);
    }
  }
  result = { turn: targetTurn(target), extraction, judgements, outcomes, decision: UNDECIDED };
  assert(result.turn === targetTurn(target), "distillTarget: the report is of the target turn");
  assert(result.extraction.answer.isOk() || recordsNothing(result), "distillTarget: a failed extraction judges and records nothing");
  assert(result.outcomes.length === candidateCount(result.extraction), "distillTarget: one outcome per candidate");
  assert(result.judgements.length === keptCount(result.extraction), "distillTarget: one judgement per kept candidate");
  return result;
}

export type Judgeable = Readonly<{ at: number; candidate: Candidate }>;

export type Decided = Readonly<{ outcomes: readonly Outcome[]; saves: readonly SaveResult[]; failures: readonly string[] }>;

export function judgeablesOf(report: ExchangeReport): readonly Judgeable[] {
  let result: readonly Judgeable[];
  assert(report.outcomes.length === candidateCount(report.extraction), "judgeablesOf: one outcome per candidate");
  const judgeables: Judgeable[] = [];
  for (let at = 0; at < report.outcomes.length; at += 1) {
    if (report.outcomes[at].isOpen() && report.outcomes[at].probabilities() !== null) {
      judgeables.push({ at, candidate: keptCandidateAt(report.extraction, at)! });
    }
  }
  result = judgeables;
  assert(areOpenAndJudged(result, report.outcomes), "judgeablesOf: only an open and judged outcome goes to novelty");
  assert(areInOrder(result), "judgeablesOf: in outcome order, once each");
  assert(areKept(result, report.extraction), "judgeablesOf: the candidate is the kept one at that outcome");
  return result;
}

export function knownFor(neighbours: readonly Neighbour[], listed: readonly Known[]): readonly Known[] {
  let result: readonly Known[];
  const known: Known[] = [];
  const seen = new Set<string>();
  for (const neighbour of neighbours) {
    if (!seen.has(neighbour.id)) {
      seen.add(neighbour.id);
      known.push({ key: neighbour.id, kind: neighbour.kind, text: neighbour.text });
    }
  }
  for (const item of listed) {
    known.push(item);
  }
  result = known;
  assert(result.length <= neighbours.length + listed.length, "knownFor: nothing is invented");
  assert(endsWith(result, listed), "knownFor: the session items come last, in order");
  assert(hasUniqueKeys(result.slice(0, result.length - listed.length)), "knownFor: no neighbour twice");
  return result;
}

export async function decideItems(distiller: Distiller, exchangeId: string, outcomes: readonly Outcome[], judgeables: readonly Judgeable[], verdicts: readonly Verdict[], list: SessionList): Promise<Decided> {
  let result: Decided;
  assert(verdicts.length === judgeables.length, "decideItems: one verdict per judgeable");
  const decidedOutcomes: Outcome[] = [...outcomes];
  const saves: SaveResult[] = [];
  const failures: string[] = [];
  let capped = false;
  for (let k = 0; k < judgeables.length; k += 1) {
    const judgeable = judgeables[k];
    const verdict = verdicts[k];
    const kind = kindOf(judgeable.candidate);
    let outcome = outcomes[judgeable.at].decided(verdict.verdict, verdict.of);
    let savedId: string | null = null;
    if (distiller.mode === "active" && actionOf(kind, verdict.verdict) !== "nothing") {
      if (distiller.budget.take()) {
        const save = await saveItem(judgeable.candidate, verdict, exchangeId, distiller.mode);
        saves.push(save);
        if (save.savedId !== null) {
          outcome = outcome.saved(save.savedId);
          savedId = save.savedId;
        }
        if (save.failure !== null) {
          failures.push(`save: ${save.failure}`);
        }
      } else if (!capped) {
        failures.push("cap: --max-saved reached");
        capped = true;
      }
    }
    if ((kind === "note" && ["new", "extends", "contradicts"].includes(verdict.verdict)) || (kind === "rule" && verdict.verdict === "new")) {
      list.add(kind, savedText(judgeable.candidate), savedId);
    }
    decidedOutcomes[judgeable.at] = outcome;
  }
  result = { outcomes: decidedOutcomes, saves, failures };
  assert(recordsVerdicts(result.outcomes, judgeables, verdicts), "decideItems: a judgeable outcome records its verdict");
  assert(othersUnchanged(outcomes, result.outcomes, judgeables), "decideItems: any other outcome stays as it was, and none is added");
  assert(distiller.mode === "active" || savesNothing(result), "decideItems: shadow saves nothing");
  assert(distiller.mode === "shadow" || result.saves.length === writeCount(judgeables, verdicts) || result.failures.length > 0, "decideItems: every write is saved, or a failure says why not");
  return result;
}

export function sessionFailures(split: SessionSplit, exchanges: readonly ExchangeReport[]): readonly string[] {
  let result: readonly string[];
  const failures: string[] = [];
  if (split.map === null) {
    failures.push("split failed");
  }
  for (const exchange of exchanges) {
    if (!exchange.extraction.answer.isOk()) {
      failures.push(`extraction failed: ${exchange.turn.id()}`);
    }
    for (const failure of exchange.decision.failures) {
      failures.push(failure);
    }
  }
  result = failures;
  assert(split.map !== null || result.length > 0, "sessionFailures: a failed split is a failure");
  assert(allExtractionsOk(exchanges) || result.length > 0, "sessionFailures: a failed extraction is a failure");
  assert(allDecisionsClean(exchanges) || result.length > 0, "sessionFailures: a failed decision is a failure");
  assert(noneBlank(result), "sessionFailures: no failure is blank");
  return result;
}

export async function decideTarget(distiller: Distiller, target: Target, report: ExchangeReport, list: SessionList): Promise<ExchangeReport> {
  let result: ExchangeReport;
  assert(report.turn === targetTurn(target), "decideTarget: the report is of the target turn");
  assert(report.decision === UNDECIDED, "decideTarget: the report is not decided yet");
  const failures: string[] = [];
  const judgeables = judgeablesOf(report);
  for (let at = 0; at < report.outcomes.length; at += 1) {
    if (report.outcomes[at].isOpen() && report.outcomes[at].probabilities() === null) {
      failures.push("critic failed");
    }
  }
  let outcomes: readonly Outcome[] = report.outcomes;
  let answer: ModelAnswer | null = null;
  let verdicts: readonly Verdict[] = [];
  let saves: readonly SaveResult[] = [];
  if (judgeables.length > 0) {
    const neighbours: Neighbour[] = [];
    let searchFailure: string | null = null;
    for (let k = 0; k < judgeables.length && searchFailure === null; k += 1) {
      try {
        neighbours.push(...(await neighboursOf(judgeables[k].candidate, distiller.extractor.topK())));
      } catch (error) {
        searchFailure = worldFailure(error);
      }
    }
    if (searchFailure !== null) {
      failures.push(`neighbours: ${searchFailure}`);
    } else {
      const known = knownFor(neighbours, list.items());
      const judged = await judgeNovelty(judgeables.map((j) => j.candidate), known, distiller.extractor);
      answer = judged.answer;
      verdicts = judged.verdicts;
      if (judged.answer !== null && !judged.answer.isOk()) {
        failures.push(`novelty: ${judged.answer.failure()}`);
      } else {
        const decided = await decideItems(distiller, report.turn.id(), report.outcomes, judgeables, judged.verdicts, list);
        outcomes = decided.outcomes;
        saves = decided.saves;
        failures.push(...decided.failures);
      }
    }
  }
  result = { ...report, outcomes, decision: { answer, verdicts, saves, failures } };
  assert(result.turn === report.turn, "decideTarget: the result is of the same turn");
  assert(noveltyFailureIsReported(result.decision), "decideTarget: a failed novelty answer is a failure");
  return result;
}

export async function closeSession(distiller: Distiller, read: SessionRead, split: SessionSplit, exchanges: readonly ExchangeReport[], episodeFailure: string | null = null): Promise<Readonly<{ closed: readonly string[]; failures: readonly string[] }>> {
  let result: Readonly<{ closed: readonly string[]; failures: readonly string[] }>;
  const failures = [...sessionFailures(split, exchanges), ...(episodeFailure === null ? [] : [`episodes: ${episodeFailure}`])];
  let closed: readonly string[] = [];
  let closeFailures: readonly string[] = failures;
  if (distiller.mode === "active" && failures.length === 0) {
    const ids = [...read.turns().map((t) => t.id()), ...read.noise().map((t) => t.id())];
    const message = await closeExchanges(ids, distiller.recorder.run());
    if (message !== null) {
      closeFailures = [...failures, `close: ${message}`];
    } else {
      closed = ids;
    }
  }
  result = { closed, failures: closeFailures };
  assert(result.closed.length === 0 || distiller.mode === "active", "closeSession: only active mode closes");
  assert(result.closed.length === 0 || result.failures.length === 0, "closeSession: a session with a failure is not closed");
  assert(result.closed.length === 0 || result.closed.length === read.turns().length + read.noise().length, "closeSession: a closed session closes every exchange read, noise too");
  assert(split.map !== null || result.failures.length > 0, "closeSession: a failed split is a failure");
  assert(allExtractionsOk(exchanges) || result.failures.length > 0, "closeSession: a failed extraction is a failure");
  return result;
}

export function episodesToWrite(distiller: Distiller, map: SessionMap): readonly StoredEpisode[] {
  assert(map.episodes().length > 0, "episodesToWrite: the map has an episode");
  const model = distiller.extractor.episodes().connection().toPiModel().id;
  const result = map.episodes().map((episode) =>
    episodeOf({
      session: map.session(),
      refs: episode.turns().map((turn) => ({ id: turn.id(), timestamp: turn.timestamp() })),
      summary: episode.summary(),
      extractor: distiller.recorder.extractorId(),
      model,
      created: distiller.recorder.run(),
    }),
  );
  assert(result.length === map.episodes().length, "episodesToWrite: one stored episode per episode of the map");
  return result;
}

export async function distillSession(distiller: Distiller, read: SessionRead): Promise<SessionReport> {
  let result: SessionReport;
  const split = await SessionMap.split(read, distiller.extractor);
  const episodeFailure = split.map !== null && distiller.mode === "active" ? await writeEpisodes(read.session(), episodesToWrite(distiller, split.map)) : null;
  const exchanges: ExchangeReport[] = [];
  const list = SessionList.empty();
  const map = split.map;
  if (map !== null) {
    for (const episode of map.episodes()) {
      for (let index = 0; index < episode.turns().length; index++) {
        const target = targetOf(map, episode, index);
        const report = await decideTarget(distiller, target, await distillTarget(distiller, target), list);
        await distiller.recorder.write(report.turn.id(), report.outcomes);
        exchanges.push(report);
      }
    }
  }
  const closing = await closeSession(distiller, read, split, exchanges, episodeFailure);
  result = { read, split, exchanges, ...closing };
  assert(result.read === read, "distillSession: the report is of the session read");
  assert(result.split.map !== null || result.exchanges.length === 0, "distillSession: a failed split reports no exchange");
  assert(result.split.map === null || reportsEveryTurn(result, read), "distillSession: an ok split reports every turn, in order");
  return result;
}

export async function distillAll(distiller: Distiller, sessions: readonly string[]): Promise<readonly SessionReport[]> {
  let result: readonly SessionReport[];
  assert(new Set(sessions).size === sessions.length, "distillAll: no session twice");
  const reports: SessionReport[] = [];
  for (const session of sessions) {
    if (distiller.budget.isSpent()) {
      break;
    }
    const read = await SessionRead.read(session);
    if (read.turns().length > 0) {
      reports.push(await distillSession(distiller, read));
    }
  }
  result = reports;
  assert(result.length <= sessions.length, "distillAll: at most one report per session");
  assert(allHavePending(result), "distillAll: a session with no pending exchange is skipped");
  assert(distiller.mode === "active" || closesNothing(result), "distillAll: shadow closes nothing");
  return result;
}

async function judge(outcome: Outcome, kept: Candidate | null, target: Target, extractor: Extractor): Promise<Readonly<{ outcome: Outcome; judgements: readonly Judgement[] }>> {
  let result: Readonly<{ outcome: Outcome; judgements: readonly Judgement[] }>;
  if (kept === null) {
    result = { outcome, judgements: [] };
  } else {
    const judgement = await critique(target, kept, extractor);
    const judged = judgement.probabilities === null ? outcome : outcome.judged(judgement.probabilities, judgement.drop);
    result = { outcome: judged, judgements: [judgement] };
  }
  assert(result.judgements.length === (kept === null ? 0 : 1), "judge: one judgement for a kept candidate and none for a dropped one");
  assert(kept !== null || result.outcome === outcome, "judge: a dropped candidate keeps its outcome");
  return result;
}

function areOpenAndJudged(judgeables: readonly Judgeable[], outcomes: readonly Outcome[]): boolean {
  return judgeables.every((j) => outcomes[j.at].isOpen() && outcomes[j.at].probabilities() !== null);
}

function areInOrder(judgeables: readonly Judgeable[]): boolean {
  return judgeables.every((j, k) => k === 0 || judgeables[k - 1].at < j.at);
}

function areKept(judgeables: readonly Judgeable[], extraction: Extraction): boolean {
  return judgeables.every((j) => keptCandidateAt(extraction, j.at) === j.candidate);
}

function endsWith(known: readonly Known[], tail: readonly Known[]): boolean {
  return tail.every((k, i) => known[known.length - tail.length + i] === k);
}

function hasUniqueKeys(known: readonly Known[]): boolean {
  return new Set(known.map((k) => k.key)).size === known.length;
}

function recordsVerdicts(outcomes: readonly Outcome[], judgeables: readonly Judgeable[], verdicts: readonly Verdict[]): boolean {
  return judgeables.every((j, k) => outcomes[j.at].verdict() === verdicts[k].verdict);
}

function othersUnchanged(before: readonly Outcome[], after: readonly Outcome[], judgeables: readonly Judgeable[]): boolean {
  return after.length === before.length && before.every((o, i) => judgeables.some((j) => j.at === i) || after[i] === o);
}

function savesNothing(decided: Decided): boolean {
  return decided.saves.length === 0 && decided.outcomes.every((o) => o.savedId() === null);
}

function allExtractionsOk(exchanges: readonly ExchangeReport[]): boolean {
  return exchanges.every((e) => e.extraction.answer.isOk());
}

function allDecisionsClean(exchanges: readonly ExchangeReport[]): boolean {
  return exchanges.every((e) => e.decision.failures.length === 0);
}

function noneBlank(items: readonly string[]): boolean {
  return items.every(isNonBlank);
}

function noveltyFailureIsReported(decision: Decision): boolean {
  return decision.answer === null || decision.answer.isOk() || decision.failures.length > 0;
}

function allHavePending(reports: readonly SessionReport[]): boolean {
  return reports.every((r) => r.read.turns().length > 0);
}

function closesNothing(reports: readonly SessionReport[]): boolean {
  return reports.every((r) => r.closed.length === 0);
}

function keptCandidateAt(extraction: Extraction, at: number): Candidate | null {
  const checked = at < extraction.notes.length ? extraction.notes[at] : extraction.rules[at - extraction.notes.length];
  return checked.isKept() ? checked.candidate() : null;
}

function writeCount(judgeables: readonly Judgeable[], verdicts: readonly Verdict[]): number {
  return judgeables.filter((j, k) => actionOf(kindOf(j.candidate), verdicts[k].verdict) !== "nothing").length;
}

function recordsNothing(report: ExchangeReport): boolean {
  return report.judgements.length === 0 && report.outcomes.length === 0;
}

function candidateCount(extraction: Extraction): number {
  return extraction.notes.length + extraction.rules.length;
}

function keptCount(extraction: Extraction): number {
  return extraction.notes.filter((c) => c.isKept()).length + extraction.rules.filter((c) => c.isKept()).length;
}

function reportsEveryTurn(report: SessionReport, read: SessionRead): boolean {
  const reported = report.exchanges.map((e) => e.turn.id());
  const expected = read.turns().map((t) => t.id());
  return reported.length === expected.length && reported.every((id, k) => id === expected[k]);
}
