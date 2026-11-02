import { assert, isRecord } from "../../common/contract.js";
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
  return candidate instanceof NoteCandidate ? "note" : "rule";
}

export function criticPrompt(target: Target, candidate: Candidate, extractor: Extractor): string {
  const checks = extractor.checksFor(kindOf(candidate));
  return (
    target.map.text() +
    `\n\n## How this episode ended\n${target.episode.summary()}` +
    `\n\n## The episode (context)\n${episodeText(target, extractor.episodeChars())}` +
    `\n\n## The exchange the candidate comes from\n${targetText(target, extractor.targetInputChars(), extractor.targetOutputChars())}` +
    `\n\n## The candidate (${kindOf(candidate)})\n${JSON.stringify(candidate.toJson())}` +
    `\n\n## Questions\nAnswer with one JSON object. Each key is a question name. Each value is a probability from 0.0 to 1.0 that the answer is yes.\n${checks.map((c) => `- ${c.name()}: ${c.text()}`).join("\n")}`
  );
}

export function probabilitiesCheck(json: unknown, checks: readonly CriticCheck[]): string | null {
  assert(checks.length > 0, "probabilitiesCheck: at least one check");
  return isJudgment(json, names(checks)) ? null : `need exactly these keys, each a number from 0 to 1: ${names(checks).join(", ")}`;
}

export function dropOf(probabilities: Probabilities, checks: readonly CriticCheck[]): string | null {
  assert(hasEvery(probabilities, checks), "dropOf: every check has a probability");
  const result = checks.find((c) => c.drops(probabilities[c.name()]))?.name() ?? null;
  assert(result === null || names(checks).includes(result), "dropOf: the drop names a check");
  assert((result === null) === noneDrops(probabilities, checks), () => `dropOf: no drop only when no check drops, result=${result}`);
  assert(isFirstDrop(result, probabilities, checks), () => `dropOf: the drop is the first check in order that drops, result=${result}`);
  return result;
}

export async function critique(target: Target, candidate: Candidate, extractor: Extractor): Promise<Judgement> {
  const checks = extractor.checksFor(kindOf(candidate));
  const answer = await ModelCaller.ask(
    extractor.critic(),
    criticPrompt(target, candidate, extractor),
    (json) => probabilitiesCheck(json, checks),
  );
  const probabilities: Probabilities | null = answer.isOk() ? (answer.json() as Probabilities) : null;
  return { answer, probabilities, drop: probabilities === null ? null : dropOf(probabilities, checks) };
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
