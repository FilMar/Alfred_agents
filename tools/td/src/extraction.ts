import { assert, isNonBlank, isPositiveInt, isRecord } from "../../contract/contract.js";
import { listTags } from "../../tb/src/qdrant.js";
import { Checked, Evidence, NoteCandidate, ProjectTerms, RuleCandidate, TagVocabulary } from "./candidate.js";
import type { Extractor } from "./config.js";
import { cut } from "./episodes.js";
import type { Episode, SessionMap } from "./episodes.js";
import { ModelCaller } from "./model_caller.js";
import type { ModelAnswer } from "./model_caller.js";
import type { Turn } from "./session.js";

export type Target = Readonly<{ map: SessionMap; episode: Episode; index: number }>;

export type CheckedCandidates = Readonly<{
  notes: readonly Checked<NoteCandidate>[];
  rules: readonly Checked<RuleCandidate>[];
}>;

export type Extraction = Readonly<{ answer: ModelAnswer } & CheckedCandidates>;

export function targetOf(map: SessionMap, episode: Episode, index: number): Target {
  assert(map.episodes().includes(episode), "targetOf: the episode is in the map");
  assert(isIndexIn(index, episode.turns().length), () => `targetOf: the index is a turn of the episode, index=${index}, turns=${episode.turns().length}`);
  const result: Target = { map, episode, index };
  assert(targetTurn(result) === episode.turns()[index], "targetOf: the target is the turn at the index");
  return result;
}

export function targetTurn(target: Target): Turn {
  return target.episode.turns()[target.index];
}

export function episodeText(target: Target, episodeChars: number): string {
  assert(isPositiveInt(episodeChars), () => `episodeText: episodeChars is a positive integer, got=${episodeChars}`);
  const result = target.episode.turns()
    .map((t, k) => `[${k}]${k === target.index ? " <<< TARGET" : ""} USER: ${cut(t.input(), episodeChars)}\nAGENT: ${cut(t.output(), episodeChars)}`)
    .join("\n\n");
  assert(result.startsWith("[0]"), "episodeText: the first turn is number 0");
  assert(result.includes(`[${target.index}] <<< TARGET USER: `), "episodeText: the target turn is marked");
  return result;
}

export function targetText(target: Target, inputChars: number, outputChars: number): string {
  assert(isPositiveInt(inputChars), () => `targetText: inputChars is a positive integer, got=${inputChars}`);
  assert(isPositiveInt(outputChars), () => `targetText: outputChars is a positive integer, got=${outputChars}`);
  const turn = targetTurn(target);
  const result = `USER: ${cut(turn.input(), inputChars)}\n\nAGENT: ${cut(turn.output(), outputChars)}`;
  assert(result.startsWith("USER: "), "targetText: the text starts with the user");
  assert(result.includes("\n\nAGENT: "), "targetText: the agent follows the user");
  return result;
}

export function extractionPrompt(target: Target, vocabulary: readonly string[], extractor: Extractor): string {
  assert(vocabulary.length > 0, "extractionPrompt: the vocabulary is not empty");
  const result =
    `Tag vocabulary: ${vocabulary.join(", ")}\n\n${target.map.text()}\n\n## How this episode ended\n${target.episode.summary()}` +
    `\n\n## The episode (context)\n${episodeText(target, extractor.episodeChars())}` +
    `\n\n## >>> TARGET: extract only from this exchange <<<\n${targetText(target, extractor.targetInputChars(), extractor.targetOutputChars())}`;
  assert(result.startsWith(`Tag vocabulary: ${vocabulary.join(", ")}\n\n`), "extractionPrompt: the prompt starts with the vocabulary");
  assert(result.includes(target.map.text()), "extractionPrompt: the prompt holds the session map");
  assert(result.endsWith(targetText(target, extractor.targetInputChars(), extractor.targetOutputChars())), "extractionPrompt: the prompt ends with the target");
  return result;
}

export function candidatesCheck(json: unknown): string | null {
  const notes: readonly unknown[] | null = isRecord(json) && Array.isArray(json.notes) ? json.notes : null;
  const rules: readonly unknown[] | null = isRecord(json) && Array.isArray(json.rules) ? json.rules : null;
  let result: string | null = null;
  if (notes === null || rules === null) {
    result = "need lists `notes` and `rules`";
  } else {
    const noteBad = notes.findIndex((n) => NoteCandidate.fromModel(n) === null);
    if (noteBad !== -1) {
      result = `notes[${noteBad}] is not a note: it needs what, why, kind and quote as strings, and tags and contexts as lists of strings`;
    } else {
      const ruleBad = rules.findIndex((r) => RuleCandidate.fromModel(r) === null);
      if (ruleBad !== -1) {
        result = `rules[${ruleBad}] is not a rule: it needs if, do and quote as strings, and tags as a list of strings`;
      }
    }
  }
  assert(result === null || isNonBlank(result), "candidatesCheck: an error is not blank");
  return result;
}

export function checkCandidates(json: unknown, target: Target, vocabulary: readonly string[], extractor: Extractor): CheckedCandidates {
  assert(candidatesCheck(json) === null, "checkCandidates: the json passes the check");
  assert(vocabulary.length > 0, "checkCandidates: the vocabulary is not empty");
  const turn = targetTurn(target);
  const evidence = Evidence.of(
    targetText(target, extractor.targetInputChars(), extractor.targetOutputChars()),
    turn.input(),
    ProjectTerms.of(target.episode.turns().map((t) => `${t.input()}\n${t.output()}`).join("\n")),
    TagVocabulary.of(vocabulary),
  );
  const lists = json as { notes: readonly unknown[]; rules: readonly unknown[] };
  const result: CheckedCandidates = {
    notes: lists.notes.map((n) => NoteCandidate.fromModel(n)!.check(evidence)),
    rules: RuleCandidate.dedupe(lists.rules.map((r) => RuleCandidate.fromModel(r)!.check(evidence))),
  };
  assert(result.notes.length === listLength(json, "notes"), "checkCandidates: one result per note");
  assert(result.rules.length === listLength(json, "rules"), "checkCandidates: one result per rule");
  return result;
}

export async function extractFrom(target: Target, vocabulary: readonly string[], extractor: Extractor): Promise<Extraction> {
  assert(vocabulary.length > 0, "extractFrom: the vocabulary is not empty");
  const prompt = extractionPrompt(target, vocabulary, extractor);
  const answer = await ModelCaller.ask(extractor.extract(), prompt, candidatesCheck);
  const checked: CheckedCandidates = answer.isOk() ? checkCandidates(answer.json(), target, vocabulary, extractor) : { notes: [], rules: [] };
  const result: Extraction = { answer, notes: checked.notes, rules: checked.rules };
  assert(result.answer.isOk() || result.notes.length === 0, "extractFrom: a failed answer has no note");
  assert(result.answer.isOk() || result.rules.length === 0, "extractFrom: a failed answer has no rule");
  return result;
}

export async function loadVocabulary(size: number): Promise<readonly string[]> {
  assert(isPositiveInt(size), () => `loadVocabulary: size is a positive integer, got=${size}`);
  const result = (await listTags(size)).map((t) => t.value);
  assert(result.length <= size, () => `loadVocabulary: at most size tags, got=${result.length}`);
  assert(allNonBlank(result), "loadVocabulary: every tag is not blank");
  return result;
}

function allNonBlank(items: readonly string[]): boolean {
  return items.every(isNonBlank);
}

function isIndexIn(index: number, length: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < length;
}

function listLength(json: unknown, key: string): number {
  return isRecord(json) && Array.isArray(json[key]) ? json[key].length : -1;
}
