import { assert, isPositiveInt } from "../../common/contract.js";
import type { Extraction } from "./extraction.js";
import { ModelAnswer, ModelTokens } from "./model_caller.js";

export const SESSION_CAP_DEFAULT = 10;

export function isCount(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

export function isCapOrNull(value: number | null): boolean {
  return value === null || isPositiveInt(value);
}

export function noCapNeverFull(perSession: number | null, full: boolean): boolean {
  return perSession !== null || !full;
}

export function fullMeansReached(saved: number, perSession: number | null, full: boolean): boolean {
  return !full || (perSession !== null && saved >= perSession);
}

export function listWithinCap(size: number, perSession: number | null): boolean {
  return perSession === null || size <= perSession;
}

export function isSkippable(extraction: Extraction): boolean {
  return extraction.answer.isOk() && extraction.notes.length === 0 && extraction.rules.length === 0;
}

export function sessionIsFull(saved: number, perSession: number | null): boolean {
  assert(isCount(saved), "sessionIsFull: saved is a count");
  assert(isCapOrNull(perSession), "sessionIsFull: the cap is a positive integer or null");
  let result = false;
  if (perSession !== null) {
    result = saved >= perSession;
  }
  assert(noCapNeverFull(perSession, result), "sessionIsFull: with no cap a session is never full");
  assert(fullMeansReached(saved, perSession, result), "sessionIsFull: a full session has reached its cap");
  return result;
}

export function capOf(raw: string): number | null {
  assert(typeof raw === "string", "capOf: raw is text");
  let result: number | null = null;
  if (/^[0-9]+$/.test(raw)) {
    const parsed = Number(raw);
    if (Number.isInteger(parsed) && parsed > 0) {
      result = parsed;
    }
  }
  assert(isCapOrNull(result), "capOf: the cap is a positive integer or null");
  return result;
}

export function emptyExtraction(): Extraction {
  let result = {} as Extraction;
  result = {
    answer: ModelAnswer.accepted({ notes: [], rules: [] }, 1, ModelTokens.zero()),
    notes: [],
    rules: [],
  };
  assert(isSkippable(result), "emptyExtraction: an ok answer with no note and no rule");
  return result;
}
