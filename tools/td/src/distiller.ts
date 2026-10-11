import { assert } from "../../contract/contract.js";
import type { Extractor } from "./config.js";
import { critique } from "./critic.js";
import type { Candidate, Judgement } from "./critic.js";
import { SessionMap } from "./episodes.js";
import type { SessionSplit } from "./episodes.js";
import { extractFrom, loadVocabulary, targetOf, targetTurn } from "./extraction.js";
import type { Extraction, Target } from "./extraction.js";
import { Outcome, Recorder } from "./recorder.js";
import type { Version } from "./registry.js";
import type { SessionRead, Turn } from "./session.js";

export type ExchangeReport = Readonly<{
  turn: Turn;
  extraction: Extraction;
  judgements: readonly Judgement[];
  outcomes: readonly Outcome[];
}>;

export type SessionReport = Readonly<{
  read: SessionRead;
  split: SessionSplit;
  exchanges: readonly ExchangeReport[];
}>;

export type Distiller = Readonly<{
  extractor: Extractor;
  vocabulary: readonly string[];
  recorder: Recorder;
}>;

export async function distillerOf(version: Version, now: Date): Promise<Distiller> {
  let result: Distiller;
  const recorder = Recorder.start(version.id(), now);
  const extractor = version.extractor();
  const vocabulary = await loadVocabulary(extractor.vocabularySize());
  result = { extractor, vocabulary, recorder };
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
  result = { turn: targetTurn(target), extraction, judgements, outcomes };
  assert(result.turn === targetTurn(target), "distillTarget: the report is of the target turn");
  assert(result.extraction.answer.isOk() || recordsNothing(result), "distillTarget: a failed extraction judges and records nothing");
  assert(result.outcomes.length === candidateCount(result.extraction), "distillTarget: one outcome per candidate");
  assert(result.judgements.length === keptCount(result.extraction), "distillTarget: one judgement per kept candidate");
  return result;
}

export async function distillSession(distiller: Distiller, read: SessionRead): Promise<SessionReport> {
  let result: SessionReport;
  const split = await SessionMap.split(read, distiller.extractor);
  const exchanges: ExchangeReport[] = [];
  const map = split.map;
  if (map !== null) {
    for (const episode of map.episodes()) {
      for (let index = 0; index < episode.turns().length; index++) {
        const report = await distillTarget(distiller, targetOf(map, episode, index));
        await distiller.recorder.write(report.turn.id(), report.outcomes);
        exchanges.push(report);
      }
    }
  }
  result = { read, split, exchanges };
  assert(result.read === read, "distillSession: the report is of the session read");
  assert(result.split.map !== null || result.exchanges.length === 0, "distillSession: a failed split reports no exchange");
  assert(result.split.map === null || reportsEveryTurn(result, read), "distillSession: an ok split reports every turn, in order");
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
