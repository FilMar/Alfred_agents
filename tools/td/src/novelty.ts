import { assert, isNonBlank, isRecord } from "../../common/contract.js";
import type { CandidateKind } from "../../tl/src/types.js";
import { NoteCandidate } from "./candidate.js";
import type { Extractor } from "./config.js";
import { QUALITY_BAR } from "./guides.js";
import { kindOf } from "./critic.js";
import type { Candidate } from "./critic.js";
import type { ModelAnswer } from "./model_caller.js";

export const MODEL_VERDICTS: Readonly<Record<CandidateKind, readonly string[]>> = {
  note: ["new", "duplicate", "extends", "contradicts"],
  rule: ["new", "duplicate", "append"],
};

export const SETTLED_VERDICTS: Readonly<Record<CandidateKind, readonly string[]>> = {
  note: ["new", "duplicate", "extends", "contradicts", "ref_only"],
  rule: ["new", "duplicate", "append"],
};

export const KNOWN_TEXT_CHARS = 400;

export type Known = Readonly<{ key: string; kind: CandidateKind; text: string }>;

export type Verdict = Readonly<{
  cand: number;
  verdict: string;
  of: string | null;
  adds: string | null;
  reason: string | null;
  do: string | null;
}>;

export type Judged = Readonly<{ answer: ModelAnswer | null; verdicts: readonly Verdict[] }>;

export class SessionList {
  readonly #items: Known[] = [];

  static empty(): SessionList {
    const result = new SessionList();
    assert(result.size() === 0, "SessionList.empty: the list is empty");
    return result;
  }

  size(): number {
    return this.#items.length;
  }

  items(): readonly Known[] {
    return [...this.#items];
  }

  add(kind: CandidateKind, text: string, id: string | null): Known {
    let result: Known;
    assert(isNonBlank(text), "SessionList.add: the text is not blank");
    assert(id === null || isNonBlank(id), "SessionList.add: the id is null or not blank");
    const before = this.#items.length;
    result = { key: id ?? `session:${before}`, kind, text };
    this.#items.push(result);
    assert(this.#items.length === before + 1, "SessionList.add: the list grew by one");
    assert(result.key === (id ?? `session:${before}`), "SessionList.add: the key is the saved id, or session:<position> when nothing is saved");
    assert(carries(result, kind, text), "SessionList.add: the item carries the kind and the text");
    return result;
  }
}

export function candidateText(candidate: Candidate): string {
  let result: string;
  result = candidate instanceof NoteCandidate
    ? `${candidate.toJson().what} | perché: ${candidate.toJson().why}`
    : `SE ${candidate.toJson().if} ALLORA ${candidate.toJson().do}`;
  assert(isNonBlank(result), "candidateText: the text is not blank");
  assert(!(candidate instanceof NoteCandidate) || result.includes(candidate.toJson().why), "candidateText: a note text holds the why");
  assert(candidate instanceof NoteCandidate || result === `SE ${candidate.toJson().if} ALLORA ${candidate.toJson().do}`, "candidateText: a rule reads SE if ALLORA do");
  return result;
}

export function savedText(candidate: Candidate): string {
  let result: string;
  result = candidate instanceof NoteCandidate
    ? candidate.toJson().what
    : `SE ${candidate.toJson().if} ALLORA ${candidate.toJson().do}`;
  assert(isNonBlank(result), "savedText: the text is not blank");
  assert(!(candidate instanceof NoteCandidate) || result === candidate.toJson().what, "savedText: a note is saved as its what");
  assert(candidate instanceof NoteCandidate || result === `SE ${candidate.toJson().if} ALLORA ${candidate.toJson().do}`, "savedText: a rule reads SE if ALLORA do");
  return result;
}

export function noveltyPrompt(candidates: readonly Candidate[], known: readonly Known[]): string {
  let result: string;
  assert(candidates.length > 0, "noveltyPrompt: at least one candidate");
  const lines: string[] = [QUALITY_BAR, "", "## Candidates"];
  for (let k = 0; k < candidates.length; k += 1) {
    lines.push(`C${k} (${kindOf(candidates[k])}): ${candidateText(candidates[k])}`);
  }
  lines.push("", "## Neighbours");
  for (let k = 0; k < known.length; k += 1) {
    lines.push(`N${k} (${known[k].kind}): ${known[k].text.slice(0, KNOWN_TEXT_CHARS)}`);
  }
  result = lines.join("\n") + "\n\nUse the integer after C as `cand` and the integer after N as `of`.";
  assert(result.startsWith(`${QUALITY_BAR}\n\n## Candidates\n`), "noveltyPrompt: the prompt starts with the quality bar");
  assert(listsCandidates(result, candidates), "noveltyPrompt: every candidate is a C line, numbered from 0");
  assert(listsKnown(result, known), "noveltyPrompt: every known item is an N line, numbered from 0, cut at KNOWN_TEXT_CHARS");
  assert(result.endsWith("Use the integer after C as `cand` and the integer after N as `of`."), "noveltyPrompt: the prompt ends with the id instruction");
  return result;
}

export function verdictsCheck(json: unknown, candidates: readonly Candidate[], known: readonly Known[]): string | null {
  let result: string | null;
  assert(candidates.length > 0, "verdictsCheck: at least one candidate");
  const list = isRecord(json) && Array.isArray(json.verdicts) ? (json.verdicts as readonly unknown[]) : null;
  const byCand: (Record<string, unknown> | null)[] = new Array(candidates.length).fill(null);
  if (list === null) {
    result = "need list `verdicts`";
  } else {
    result = null;
    for (const raw of list) {
      if (!isRecord(raw) || !Number.isInteger(raw.cand)) {
        result = `need exactly one verdict per cand 0..${candidates.length - 1}`;
        break;
      }
      const cand = raw.cand as number;
      if (cand < 0 || cand >= candidates.length || byCand[cand] !== null) {
        result = `need exactly one verdict per cand 0..${candidates.length - 1}`;
        break;
      }
      byCand[cand] = raw;
    }
    if (result === null && list.length !== candidates.length) {
      result = `need exactly one verdict per cand 0..${candidates.length - 1}`;
    }
    for (let k = 0; k < candidates.length && result === null; k += 1) {
      const raw = byCand[k];
      const set = MODEL_VERDICTS[kindOf(candidates[k])];
      if (raw === null || typeof raw.verdict !== "string" || !set.includes(raw.verdict)) {
        result = `cand ${k}: verdict must be one of ${[...set].sort().join(", ")}`;
      }
    }
    for (let k = 0; k < candidates.length && result === null; k += 1) {
      const raw = byCand[k];
      const ofValue = raw === null || raw.verdict === "new" ? null : (raw.of as number);
      if (ofValue !== null && !(Number.isInteger(ofValue) && ofValue >= 0 && ofValue < known.length)) {
        result = `cand ${k}: \`of\` must be a neighbour id 0..${known.length - 1}`;
      }
    }
  }
  assert(result === null || isNonBlank(result), "verdictsCheck: an error is not blank");
  assert(result !== null || isVerdictList(json, candidates, known), "verdictsCheck: no error only for one good verdict per candidate");
  assert(result === null || !isVerdictList(json, candidates, known), "verdictsCheck: an error only for a wrong json");
  return result;
}

export function settle(json: unknown, candidates: readonly Candidate[], known: readonly Known[]): readonly Verdict[] {
  let result: readonly Verdict[];
  assert(verdictsCheck(json, candidates, known) === null, "settle: the json passes the check");
  const list = (json as { verdicts: readonly unknown[] }).verdicts;
  const byCand: (Record<string, unknown> | null)[] = new Array(candidates.length).fill(null);
  for (const raw of list) {
    if (isRecord(raw)) {
      byCand[raw.cand as number] = raw;
    }
  }
  const verdicts: Verdict[] = [];
  for (let k = 0; k < candidates.length; k += 1) {
    const raw = byCand[k] as Record<string, unknown>;
    const kind = kindOf(candidates[k]);
    const modelVerdict = raw.verdict as string;
    const adds = typeof raw.adds === "string" && isNonBlank(raw.adds) ? raw.adds.trim() : null;
    const reason = typeof raw.reason === "string" && isNonBlank(raw.reason) ? raw.reason.trim() : null;
    const doText = typeof raw.do === "string" && isNonBlank(raw.do) ? raw.do.trim() : null;
    const newIdea =
      raw.adds_is_new_idea === true || (typeof raw.adds_is_new_idea === "string" && raw.adds_is_new_idea.toLowerCase() === "true");
    const target = modelVerdict === "new" ? null : known[raw.of as number];
    const crossKind = target !== null && target.kind !== kind;
    let verdict = crossKind ? "new" : modelVerdict;
    if (!crossKind && kind === "note" && modelVerdict === "extends") {
      if (adds === null) {
        verdict = "duplicate";
      } else if (!newIdea) {
        verdict = "ref_only";
      }
    }
    if (!crossKind && kind === "rule" && modelVerdict === "append" && doText === null) {
      verdict = "duplicate";
    }
    verdicts.push({
      cand: k,
      verdict,
      of: target === null || crossKind ? null : target.key,
      adds: crossKind ? null : adds,
      reason: crossKind ? null : reason,
      do: crossKind ? null : doText,
    });
  }
  result = verdicts;
  assert(result.length === candidates.length, "settle: one verdict per candidate");
  assert(inCandidateOrder(result), "settle: the verdicts are in candidate order");
  assert(areSettledFor(result, candidates), "settle: every verdict is settled for the kind of its candidate");
  assert(ofsAreConsistent(result, candidates, known), "settle: a new verdict has no of, any other has the key of a known item of the kind of its candidate");
  return result;
}

export async function judgeNovelty(candidates: readonly Candidate[], known: readonly Known[], extractor: Extractor): Promise<Judged> {
  let result: Judged;
  if (candidates.length === 0) {
    result = { answer: null, verdicts: [] };
  } else {
    const { ModelCaller } = await import("./model_caller.js");
    const answer = await ModelCaller.ask(
      extractor.novelty(),
      noveltyPrompt(candidates, known),
      (json) => verdictsCheck(json, candidates, known),
    );
    result = { answer, verdicts: answer.isOk() ? settle(answer.json(), candidates, known) : [] };
  }
  assert((result.answer === null) === (candidates.length === 0), "judgeNovelty: no call only when there is no candidate");
  assert(result.answer === null || result.answer.isOk() || result.verdicts.length === 0, "judgeNovelty: a failed answer has no verdict");
  assert(result.answer === null || !result.answer.isOk() || result.verdicts.length === candidates.length, "judgeNovelty: an ok answer has one verdict per candidate");
  return result;
}

function listsCandidates(prompt: string, candidates: readonly Candidate[]): boolean {
  return candidates.every((c, k) => prompt.includes(`C${k} (${kindOf(c)}): ${candidateText(c)}`));
}

function listsKnown(prompt: string, known: readonly Known[]): boolean {
  return known.every((n, k) => prompt.includes(`N${k} (${n.kind}): ${n.text.slice(0, KNOWN_TEXT_CHARS)}`));
}

function isVerdictList(json: unknown, candidates: readonly Candidate[], known: readonly Known[]): boolean {
  const list = isRecord(json) && Array.isArray(json.verdicts) ? (json.verdicts as readonly unknown[]) : null;
  return list !== null && list.length === candidates.length && coversEvery(list) && list.every((v) => isVerdictOf(v, candidates, known));
}

function coversEvery(list: readonly unknown[]): boolean {
  const cands = list.map((v) => (isRecord(v) ? v.cand : null));
  return list.every((_, k) => cands.includes(k));
}

function isVerdictOf(raw: unknown, candidates: readonly Candidate[], known: readonly Known[]): boolean {
  const candidate = isRecord(raw) && Number.isInteger(raw.cand) ? candidates[raw.cand as number] : undefined;
  return (
    candidate !== undefined &&
    isRecord(raw) &&
    typeof raw.verdict === "string" &&
    MODEL_VERDICTS[kindOf(candidate)].includes(raw.verdict) &&
    (raw.verdict === "new" || (Number.isInteger(raw.of) && (raw.of as number) >= 0 && (raw.of as number) < known.length))
  );
}

function carries(item: Known, kind: CandidateKind, text: string): boolean {
  return item.kind === kind && item.text === text;
}

function ofsAreConsistent(verdicts: readonly Verdict[], candidates: readonly Candidate[], known: readonly Known[]): boolean {
  return verdicts.every((v, k) => (v.verdict === "new" ? v.of === null : known.some((n) => n.key === v.of && n.kind === kindOf(candidates[k]))));
}

function inCandidateOrder(verdicts: readonly Verdict[]): boolean {
  return verdicts.every((v, k) => v.cand === k);
}

function areSettledFor(verdicts: readonly Verdict[], candidates: readonly Candidate[]): boolean {
  return verdicts.every((v, k) => SETTLED_VERDICTS[kindOf(candidates[k])].includes(v.verdict));
}
