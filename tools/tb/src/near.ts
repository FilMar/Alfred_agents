import { assert, isPositiveInt } from "../../common/contract.js";

export const NEAR_ITEMS_LIMIT = 3000;

declare const vectorSetBrand: unique symbol;
export type Vectored = Readonly<{ id: string; vector: readonly number[] }>;
export type VectorSet = Readonly<{ items: readonly Vectored[] }> & { readonly [vectorSetBrand]: true };
export type Pair = Readonly<{ a: string; b: string; score: number }>;

function isScore(value: number): boolean {
  return Number.isFinite(value) && value >= -1 && value <= 1;
}

function sameLength(items: readonly Vectored[]): boolean {
  return items.every((item) => item.vector.length === items[0].vector.length);
}

function distinctIds(items: readonly Vectored[]): boolean {
  return new Set(items.map((item) => item.id)).size === items.length;
}

function nonZero(vector: readonly number[]): boolean {
  return vector.some((value) => value !== 0);
}

function allNonZero(items: readonly Vectored[]): boolean {
  return items.every((item) => nonZero(item.vector));
}

function pairsValid(pairs: readonly Pair[], set: VectorSet): boolean {
  const ids = new Set(set.items.map((item) => item.id));
  const keys = pairs.map((pair) => [pair.a, pair.b].sort().join("\n"));
  return (
    pairs.every((pair) => pair.a !== pair.b && ids.has(pair.a) && ids.has(pair.b)) &&
    new Set(keys).size === keys.length
  );
}

function allAtLeast(pairs: readonly Pair[], min: number): boolean {
  return pairs.every((pair) => pair.score >= min);
}

function inOrder(before: Pair, after: Pair): boolean {
  if (before.score !== after.score) return before.score > after.score;
  if (before.a !== after.a) return before.a < after.a;
  return before.b <= after.b;
}

function ranked(pairs: readonly Pair[]): boolean {
  return pairs.every((pair, i) => i === 0 || inOrder(pairs[i - 1], pair));
}

export function vectorSetOf(items: readonly Vectored[]): VectorSet {
  assert(items.length <= NEAR_ITEMS_LIMIT, "vectorSetOf: at most NEAR_ITEMS_LIMIT items");
  assert(distinctIds(items), "vectorSetOf: no id twice");
  assert(sameLength(items), "vectorSetOf: every vector has the same length");
  assert(allNonZero(items), "vectorSetOf: no zero vector");
  let result: VectorSet;
  result = { items } as VectorSet;
  assert(result.items.length === items.length, "vectorSetOf: every item kept");
  return result;
}

export function cosine(left: readonly number[], right: readonly number[]): number {
  assert(left.length === right.length, "cosine: same length");
  assert(nonZero(left), "cosine: left is not a zero vector");
  assert(nonZero(right), "cosine: right is not a zero vector");
  let result: number;
  let dot = 0;
  let leftNormSquared = 0;
  let rightNormSquared = 0;
  for (let i = 0; i < left.length; i++) {
    dot += left[i] * right[i];
    leftNormSquared += left[i] * left[i];
    rightNormSquared += right[i] * right[i];
  }
  const raw = dot / (Math.sqrt(leftNormSquared) * Math.sqrt(rightNormSquared));
  result = Math.min(1, Math.max(-1, raw));
  assert(isScore(result), "cosine: between -1 and 1");
  return result;
}

export function nearPairs(set: VectorSet, min: number): Pair[] {
  assert(isScore(min), "nearPairs: min is between -1 and 1");
  let result: Pair[];
  result = [];
  const items = set.items;
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const score = cosine(items[i].vector, items[j].vector);
      if (score >= min) {
        result.push({ a: items[i].id, b: items[j].id, score });
      }
    }
  }
  result.sort(
    (first, second) =>
      second.score - first.score || first.a.localeCompare(second.a) || first.b.localeCompare(second.b),
  );
  assert(pairsValid(result, set), "nearPairs: two different known ids, each pair once");
  assert(allAtLeast(result, min), "nearPairs: every score reaches min");
  assert(ranked(result), "nearPairs: closest pair first, ties by a then b");
  return result;
}

export function topPairs(pairs: readonly Pair[], limit: number): Pair[] {
  assert(isPositiveInt(limit), "topPairs: limit is a positive integer");
  let result: Pair[];
  result = pairs.slice(0, limit);
  assert(result.length === Math.min(limit, pairs.length), "topPairs: limit held, nothing else cut");
  return result;
}
