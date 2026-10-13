import { assert, isUnit } from "../../contract/contract.js";
import type { Note } from "./types.js";

export const COUNTERS_START = new Date("2026-09-21T00:00:00.000Z");
export const REFINE_NOTES_LIMIT = 10_000;
export const TRUST_BASE = 0.5;
export const HIT_WEIGHT = 0.05;
export const RELATED_WEIGHT = 0.02;
export const HIT_CAP = 10;
export const HALF_LIFE_DAYS = 90;
export const TRUST_FLOOR = 0.2;
export const BIN_COUNT = 10;
export const LOW_WHAT_CHARS = 80;

export type Signals = Readonly<{ hits: number; hitsRelated: number; lastSignal: Date }>;
export type Spread = Readonly<{ bins: readonly number[]; total: number; belowFloor: number }>;
export type LowNote = Readonly<{
  id: string;
  trust: number;
  what: string;
  when: string;
  hits: number;
  hits_related: number;
}>;
export type RefineReport = Readonly<{ spread: Spread; low: readonly LowNote[] }>;

function isValidDate(date: Date): boolean {
  return Number.isFinite(date.getTime());
}

function isIsoDate(text: string): boolean {
  return Number.isFinite(Date.parse(text));
}

function isCounter(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

function allUnit(values: readonly number[]): boolean {
  return values.every(isUnit);
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function floorHolds(note: Note, signals: Signals, countersStart: Date): boolean {
  const hasSignal = note.last_hit !== undefined || note.last_hit_related !== undefined;
  return hasSignal || signals.lastSignal.getTime() >= countersStart.getTime();
}

export function signalsOf(note: Note, countersStart: Date): Signals {
  assert(isIsoDate(note.when), "signalsOf: when is an ISO date");
  assert(isValidDate(countersStart), "signalsOf: countersStart is a valid date");
  let result: Signals = { hits: 0, hitsRelated: 0, lastSignal: countersStart };
  const candidates: Date[] = [];
  if (note.last_hit !== undefined) {
    candidates.push(new Date(note.last_hit));
  }
  if (note.last_hit_related !== undefined) {
    candidates.push(new Date(note.last_hit_related));
  }
  if (candidates.length === 0) {
    const when = new Date(note.when);
    candidates.push(when.getTime() > countersStart.getTime() ? when : countersStart);
  }
  let lastSignal = candidates[0];
  for (const candidate of candidates) {
    if (candidate.getTime() > lastSignal.getTime()) {
      lastSignal = candidate;
    }
  }
  result = { hits: note.hits ?? 0, hitsRelated: note.hits_related ?? 0, lastSignal };
  assert(isValidDate(result.lastSignal), "signalsOf: lastSignal is a valid date");
  assert(floorHolds(note, result, countersStart), "signalsOf: without a signal the floor is the counters start");
  return result;
}

export function trustOf(signals: Signals, now: Date): number {
  assert(isCounter(signals.hits), "trustOf: hits is a whole number from 0");
  assert(isCounter(signals.hitsRelated), "trustOf: hitsRelated is a whole number from 0");
  assert(isValidDate(signals.lastSignal), "trustOf: lastSignal is a valid date");
  assert(isValidDate(now), "trustOf: now is a valid date");
  let result = 0;
  const days = Math.max(0, (now.getTime() - signals.lastSignal.getTime()) / 86_400_000);
  const hitBonus = HIT_WEIGHT * Math.min(signals.hits, HIT_CAP);
  const relatedBonus = RELATED_WEIGHT * Math.min(signals.hitsRelated, HIT_CAP);
  const decay = Math.pow(0.5, days / HALF_LIFE_DAYS);
  result = Math.min(1, TRUST_BASE + hitBonus + relatedBonus) * decay;
  assert(isUnit(result), "trustOf: the trust is between 0 and 1");
  return result;
}

export function spreadOf(trusts: readonly number[]): Spread {
  assert(allUnit(trusts), "spreadOf: every trust is between 0 and 1");
  let result: Spread = { bins: [], total: 0, belowFloor: 0 };
  const bins = Array.from({ length: BIN_COUNT }, () => 0);
  let belowFloor = 0;
  for (const trust of trusts) {
    bins[Math.min(BIN_COUNT - 1, Math.floor(trust * BIN_COUNT))] += 1;
    if (trust < TRUST_FLOOR) {
      belowFloor += 1;
    }
  }
  result = { bins, total: trusts.length, belowFloor };
  assert(result.bins.length === BIN_COUNT, "spreadOf: there is one bin per tenth");
  assert(result.total === trusts.length, "spreadOf: the total counts every trust");
  assert(sum(result.bins) === result.total, "spreadOf: the bins add up to the total");
  assert(result.belowFloor <= result.total, "spreadOf: the notes below the floor are part of the total");
  return result;
}

export function lowNoteOf(note: Note, trust: number): LowNote {
  assert(trust < TRUST_FLOOR, "lowNoteOf: the trust is under the floor");
  let result: LowNote = { id: "", trust: 0, what: "", when: "", hits: 0, hits_related: 0 };
  result = {
    id: note.id,
    trust,
    what: note.what.slice(0, LOW_WHAT_CHARS),
    when: note.when,
    hits: note.hits ?? 0,
    hits_related: note.hits_related ?? 0,
  };
  assert(result.id === note.id, "lowNoteOf: the id is the note id");
  assert(result.what.length <= LOW_WHAT_CHARS, "lowNoteOf: what is cut to the limit");
  return result;
}

export function refineReport(notes: readonly Note[], now: Date, countersStart: Date): RefineReport {
  assert(notes.length < REFINE_NOTES_LIMIT, "refineReport: the read is not cut by the limit");
  let result: RefineReport = { spread: { bins: [], total: 0, belowFloor: 0 }, low: [] };
  const trusts: number[] = [];
  const low: LowNote[] = [];
  for (const note of notes) {
    const trust = trustOf(signalsOf(note, countersStart), now);
    trusts.push(trust);
    if (trust < TRUST_FLOOR) {
      low.push(lowNoteOf(note, trust));
    }
  }
  const spread = spreadOf(trusts);
  low.sort((left, right) => left.trust - right.trust || Number(left.id > right.id) - Number(left.id < right.id));
  result = { spread, low };
  assert(result.spread.total === notes.length, "refineReport: the spread counts every note");
  assert(result.low.length === result.spread.belowFloor, "refineReport: one low note per trust below the floor");
  return result;
}
