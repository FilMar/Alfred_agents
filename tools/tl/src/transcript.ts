// What two harnesses have in common: a transcript is lines, a question opens an
// exchange, and everything until the next question belongs to it. The shape of a
// line is not shared, so each reader brings its own predicates.

import { assert } from "../../tb/src/types.js";
import type { Contents, Exchange, Session } from "./types.js";

export const MAIN_ACTOR = "alfredo";

export interface ParsedExchange {
  exchange: Exchange;
  contents: Contents;
}

export interface ParsedTranscript {
  session: Session | null;
  exchanges: ParsedExchange[];
  /** Answers that arrived before any question, so they belong to nothing. */
  orphans: number;
}

export interface ParseOptions {
  /** Machine the transcript was read on. A transcript does not carry it. */
  host?: string;
}

export interface Span<T> {
  opener: T;
  body: T[];
}

export interface Tokens {
  tokens_in: number;
  tokens_out: number;
  tokens_cache_read: number;
  tokens_cache_write: number;
}

export const NO_TOKENS: Tokens = {
  tokens_in: 0, tokens_out: 0, tokens_cache_read: 0, tokens_cache_write: 0,
};

/** Parses the lines a transcript file holds, skipping the ones that are not JSON. */
export function parseLines<T>(text: string): T[] {
  const lines: T[] = [];
  for (const raw of text.split("\n")) {
    if (raw.trim().length === 0) continue;
    try {
      lines.push(JSON.parse(raw) as T);
    } catch {
      continue;
    }
  }
  return lines;
}

/** Splits the lines into one span per opener. Lines before the first are dropped. */
export function spans<T>(
  lines: T[],
  isOpener: (line: T) => boolean,
  isAnswer: (line: T) => boolean,
): { spans: Span<T>[]; orphans: number } {
  const result: Span<T>[] = [];
  let orphans = 0;

  for (const line of lines) {
    if (isOpener(line)) result.push({ opener: line, body: [] });
    else if (result.length === 0) orphans += isAnswer(line) ? 1 : 0;
    else result[result.length - 1].body.push(line);
  }

  assert(result.length <= lines.length, "spans: no span invented");
  return { spans: result, orphans };
}

/** Joins the texts a span produced, dropping the lines that carry none. */
export function joinBody(parts: string[]): string {
  return parts.filter((t) => t.length > 0).join("\n\n");
}

/** JSON for a value that may not be a string, and nothing for an absent one. */
export function stringify(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}
