import { allNonBlank, assert, isNonBlank, isRecord } from "./contract.js";

export const ID_SHORT = 8;
export const BLOCK_MARK = "-- ";

export type NoteLike = Readonly<{ id: string; what: string; why: string }>;
export type RuleLike = Readonly<{ id: string; do: readonly string[] }>;

export function opensBlock(text: string, id: string): boolean {
  return text.startsWith(`${BLOCK_MARK}${id.slice(0, ID_SHORT)}\n`);
}

export function isBlockStart(text: string): boolean {
  return text.startsWith(BLOCK_MARK);
}

export function allBlockStarts(blocks: readonly string[]): boolean {
  return blocks.every(isBlockStart);
}

export function containsAll(text: string, parts: readonly string[]): boolean {
  return parts.every((part) => text.includes(part));
}

export function emptyIffNone(text: string, blocks: readonly string[]): boolean {
  return (text === "") === (blocks.length === 0);
}

export function lineCountAtLeast(text: string, count: number): boolean {
  return text.split("\n").length >= count;
}

export function startedLines(text: string): number {
  return text.split("\n").filter(isBlockStart).length;
}

export function sameKeysWithout(source: object, result: object, dropped: string): boolean {
  const kept = Object.keys(source).filter((key) => key !== dropped);
  const found = Object.keys(result);
  return kept.length === found.length && kept.every((key) => found.includes(key));
}

export function shortId(id: string): string {
  assert(isNonBlank(id), "shortId: id is not blank");
  assert(id.length >= ID_SHORT, "shortId: id has at least 8 characters");
  let result = "";
  result = id.slice(0, ID_SHORT);
  assert(result.length === ID_SHORT, "shortId: result has 8 characters");
  assert(id.startsWith(result), "shortId: result is a prefix of the id");
  return result;
}

export function noteBlock(note: NoteLike): string {
  assert(isNonBlank(note.what), "noteBlock: what is not blank");
  assert(isNonBlank(note.why), "noteBlock: why is not blank");
  let result = "";
  result = `${BLOCK_MARK}${shortId(note.id)}\n${note.what}\n${note.why}`;
  assert(opensBlock(result, note.id), "noteBlock: the block opens with the short id");
  assert(result.endsWith(note.why), "noteBlock: the block ends with the why");
  assert(lineCountAtLeast(result, 3), "noteBlock: the id, what and why each start a line");
  return result;
}

export function ruleBlock(rule: RuleLike): string {
  assert(rule.do.length > 0, "ruleBlock: the rule has at least one action");
  assert(allNonBlank(rule.do), "ruleBlock: every action is not blank");
  let result = "";
  result = [`${BLOCK_MARK}${shortId(rule.id)}`, ...rule.do].join("\n");
  assert(opensBlock(result, rule.id), "ruleBlock: the block opens with the short id");
  assert(containsAll(result, rule.do), "ruleBlock: the block holds every action");
  assert(lineCountAtLeast(result, rule.do.length + 1), "ruleBlock: the id and every action start a line");
  return result;
}

export function blocksOf(blocks: readonly string[]): string {
  assert(allBlockStarts(blocks), "blocksOf: every block opens with the marker");
  let result = "";
  result = blocks.join("\n");
  assert(emptyIffNone(result, blocks), "blocksOf: the text is empty only for no blocks");
  assert(containsAll(result, blocks), "blocksOf: the text holds every block");
  assert(startedLines(result) >= blocks.length, "blocksOf: every block starts a line");
  return result;
}

export function ruleView<T extends Readonly<{ vector?: unknown }>>(entry: T): Omit<T, "vector"> {
  assert(isRecord(entry), "ruleView: the entry is a record");
  let result = {} as Omit<T, "vector">;
  const { vector, ...rest } = entry;
  result = rest;
  assert(!("vector" in result), "ruleView: the vector is gone");
  assert(sameKeysWithout(entry, result, "vector"), "ruleView: every other field is kept");
  return result;
}
