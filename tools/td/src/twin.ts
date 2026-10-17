import { assert } from "../../common/contract.js";

export const SAME_SESSION_CUTOFF_DEFAULT = 0.8;

export type SessionVector = Readonly<{ key: string; vector: readonly number[] }>;
export type Twin = Readonly<{ key: string; score: number }>;

export function isCutoff(value: number): boolean {
  return Number.isFinite(value) && value > 0 && value <= 1;
}

export function isCutoffOrNull(value: number | null): boolean {
  return value === null || isCutoff(value);
}

export function sameLength(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length;
}

export function allSameLength(vector: readonly number[], items: readonly SessionVector[]): boolean {
  return items.every((item) => sameLength(vector, item.vector));
}

export function hasNorm(vector: readonly number[]): boolean {
  return vector.some((x) => x !== 0);
}

export function bothHaveNorm(a: readonly number[], b: readonly number[]): boolean {
  return hasNorm(a) && hasNorm(b);
}

export function inUnitRange(value: number): boolean {
  return Number.isFinite(value) && value >= -1 - 1e-9 && value <= 1 + 1e-9;
}

export function twinReaches(twin: Twin | null, cutoff: number): boolean {
  return twin === null || twin.score >= cutoff;
}

export function twinIsNearest(twin: Twin | null, vector: readonly number[], items: readonly SessionVector[], cutoff: number): boolean {
  const scores = items.map((item) => cosine(vector, item.vector));
  const best = scores.length === 0 ? -Infinity : Math.max(...scores);
  return twin === null ? best < cutoff : twin.score === best && items[scores.indexOf(best)].key === twin.key;
}

export function cosine(a: readonly number[], b: readonly number[]): number {
  assert(a.length > 0, "cosine: the vectors are not empty");
  assert(sameLength(a, b), "cosine: the vectors have the same length");
  assert(bothHaveNorm(a, b), "cosine: neither vector is all zeros");
  let result = 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  result = dot / Math.sqrt(normA * normB);
  assert(inUnitRange(result), "cosine: the cosine is between -1 and 1");
  return result;
}

export function twinOf(vector: readonly number[], items: readonly SessionVector[], cutoff: number): Twin | null {
  assert(isCutoff(cutoff), "twinOf: the cutoff is a number above 0 and at most 1");
  assert(allSameLength(vector, items), "twinOf: every item has a vector as long as the vector");
  let result: Twin | null = null;
  let best: Twin | null = null;
  for (const item of items) {
    const score = cosine(vector, item.vector);
    if (best === null || score > best.score) {
      best = { key: item.key, score };
    }
  }
  if (best !== null && best.score >= cutoff) {
    result = best;
  }
  assert(twinReaches(result, cutoff), "twinOf: a twin reaches the cutoff");
  assert(twinIsNearest(result, vector, items, cutoff), "twinOf: the twin is the first nearest item, and without a twin no item reaches the cutoff");
  return result;
}

export function cutoffOf(raw: string): number | null {
  assert(typeof raw === "string", "cutoffOf: raw is text");
  let result: number | null = null;
  if (/^\d+(\.\d+)?$/.test(raw)) {
    const value = Number(raw);
    if (isCutoff(value)) {
      result = value;
    }
  }
  assert(isCutoffOrNull(result), "cutoffOf: the cutoff is a number above 0 and at most 1, or null");
  return result;
}
