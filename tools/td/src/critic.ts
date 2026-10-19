import { assert, isNonBlank, isRecord } from "../../common/contract.js";
import type { CandidateKind } from "../../tl/src/types.js";
import { NoteCandidate } from "./candidate.js";
import type { RuleCandidate } from "./candidate.js";
import type { CriticCheck, Extractor } from "./config.js";
import { episodeText, targetText } from "./extraction.js";
import type { Target } from "./extraction.js";
import { ModelCaller } from "./model_caller.js";
import type { ModelAnswer } from "./model_caller.js";
import type { Probabilities } from "./recorder.js";

export type Candidate = NoteCandidate | RuleCandidate;

export type Judgement = Readonly<{
  answer: ModelAnswer;
  probabilities: Probabilities | null;
  drop: string | null;
}>;

export function kindOf(candidate: Candidate): CandidateKind {
  const result: CandidateKind = candidate instanceof NoteCandidate ? "note" : "rule";
  assert((result === "note") === candidate instanceof NoteCandidate, "kindOf: a note candidate is a note");
  return result;
}

export function criticPrompt(target: Target, candidate: Candidate, extractor: Extractor): string {
  const checks = extractor.checksFor(kindOf(candidate));
  let result: string;
  result =
    target.map.text() +
    `\n\n## How this episode ended\n${target.episode.summary()}` +
    `\n\n## The episode (context)\n${episodeText(target, extractor.episodeChars())}` +
    `\n\n## The exchange the candidate comes from\n${targetText(target, extractor.targetInputChars(), extractor.targetOutputChars())}` +
    `\n\n## The candidate (${kindOf(candidate)})\n${JSON.stringify(candidate.toJson())}` +
    `\n\n## Questions\nAnswer with one JSON object. Each key is a question name. Each value is a probability from 0.0 to 1.0 that the answer is yes.\n${checks.map((c) => `- ${c.name()}: ${c.text()}`).join("\n")}`;
  assert(result.includes(target.map.text()), "criticPrompt: the prompt holds the session map");
  assert(result.includes(targetText(target, extractor.targetInputChars(), extractor.targetOutputChars())), "criticPrompt: the prompt holds the target");
  assert(result.includes(JSON.stringify(candidate.toJson())), "criticPrompt: the prompt holds the candidate");
  assert(asksEvery(result, checks), "criticPrompt: the prompt asks every check as name: text");
  return result;
}

export function probabilitiesCheck(json: unknown, checks: readonly CriticCheck[]): string | null {
  assert(checks.length > 0, "probabilitiesCheck: at least one check");
  let result: string | null;
  result = isJudgment(json, names(checks)) ? null : `need exactly these keys, each a number from 0 to 1: ${names(checks).join(", ")}`;
  assert(result === null || isNonBlank(result), "probabilitiesCheck: an error is not blank");
  assert(result !== null || isJudgment(json, names(checks)), "probabilitiesCheck: no error only for one probability per check");
  assert(result === null || !isJudgment(json, names(checks)), "probabilitiesCheck: an error only for a wrong json");
  return result;
}

export function dropOf(probabilities: Probabilities, checks: readonly CriticCheck[]): string | null {
  assert(hasEvery(probabilities, checks), "dropOf: every check has a probability");
  let result: string | null;
  result = checks.find((c) => c.drops(probabilities[c.name()]))?.name() ?? null;
  assert(result === null || names(checks).includes(result), "dropOf: the drop names a check");
  assert((result === null) === noneDrops(probabilities, checks), () => `dropOf: no drop only when no check drops, result=${result}`);
  assert(isFirstDrop(result, probabilities, checks), () => `dropOf: the drop is the first check in order that drops, result=${result}`);
  return result;
}

export async function critique(target: Target, candidate: Candidate, extractor: Extractor): Promise<Judgement> {
  const checks = extractor.checksFor(kindOf(candidate));
  let result: Judgement;
  const answer = await ModelCaller.ask(
    extractor.critic(),
    criticPrompt(target, candidate, extractor),
    (json) => probabilitiesCheck(json, checks),
  );
  const probabilities: Probabilities | null = answer.isOk() ? (answer.json() as Probabilities) : null;
  result = { answer, probabilities, drop: probabilities === null ? null : dropOf(probabilities, checks) };
  assert(result.answer.isOk() || judgesNothing(result), "critique: a failed answer judges nothing");
  assert(!result.answer.isOk() || judgesEvery(result, checks), "critique: an ok answer has one probability per check");
  assert(dropIsJudged(result), () => `critique: the drop names a judged check, drop=${result.drop}`);
  return result;
}

function asksEvery(prompt: string, checks: readonly CriticCheck[]): boolean {
  return checks.every((c) => prompt.includes(`${c.name()}: ${c.text()}`));
}

function isJudgment(json: unknown, names: readonly string[]): boolean {
  return (
    isRecord(json) &&
    Object.keys(json).length === names.length &&
    names.every((n) => typeof json[n] === "number" && json[n] >= 0 && json[n] <= 1)
  );
}

function isFirstDrop(drop: string | null, probabilities: Probabilities, checks: readonly CriticCheck[]): boolean {
  const at = checks.findIndex((c) => c.name() === drop);
  return drop === null || (at !== -1 && checks[at].drops(probabilities[drop]) && checks.slice(0, at).every((c) => !c.drops(probabilities[c.name()])));
}

function names(checks: readonly CriticCheck[]): readonly string[] {
  return checks.map((c) => c.name());
}

function hasEvery(probabilities: Probabilities, checks: readonly CriticCheck[]): boolean {
  return checks.every((c) => Object.hasOwn(probabilities, c.name()));
}

function noneDrops(probabilities: Probabilities, checks: readonly CriticCheck[]): boolean {
  return checks.every((c) => !c.drops(probabilities[c.name()]));
}

function judgesNothing(judgement: Judgement): boolean {
  return judgement.probabilities === null && judgement.drop === null;
}

function judgesEvery(judgement: Judgement, checks: readonly CriticCheck[]): boolean {
  return judgement.probabilities !== null && isJudgment(judgement.probabilities, names(checks));
}

function dropIsJudged(judgement: Judgement): boolean {
  return judgement.drop === null || (judgement.probabilities !== null && Object.hasOwn(judgement.probabilities, judgement.drop));
}
