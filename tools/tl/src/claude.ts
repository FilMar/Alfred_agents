// Reader for a Claude Code transcript. Pure: the caller reads the file.

import { assert } from "../../contract/contract.js";
import type { Contents, Exchange, Harness, Session } from "./types.js";
import { validateContents } from "./types.js";
import type { ParsedExchange, ParsedTranscript, ParseOptions, Span, Tokens } from "./transcript.js";
import { joinBody, joinTools, MAIN_ACTOR, NO_TOKENS, spans, stringify } from "./transcript.js";

export const HARNESS: Harness = "claude";

export interface Part {
  type?: string;
  text?: string;
  name?: string;
  input?: unknown;
  content?: unknown;
}

export interface Usage {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
}

export interface Line {
  type?: string;
  uuid?: string;
  parentUuid?: string | null;
  sessionId?: string;
  timestamp?: string;
  cwd?: string;
  origin?: { kind?: string };
  message?: { role?: string; model?: string; content?: string | Part[]; usage?: Usage };
}

/**
 * True when this line is a question, and not an answer to a tool.
 * `origin` marks it: slash-command bookkeeping, interruption notices and skill
 * injections carry none, and their cost lands on the exchange before them rather
 * than being lost.
 */
export function isOpener(line: Line): boolean {
  if (line.type !== "user") return false;
  return typeof line.origin?.kind === "string";
}

export function isAnswer(line: Line): boolean {
  return line.type === "assistant";
}

/** What a line says: its text, with no tool call and no tool result. */
export function lineText(line: Line): string {
  const content = line.message?.content;
  if (typeof content === "string") return content;
  return joinParts(content, partText);
}

export function lineTools(line: Line): string {
  assert(line !== null, "claude.lineTools: line is an object");
  assert(typeof line === "object", "claude.lineTools: line is an object");
  return joinParts(line.message?.content, partTool);
}

function joinParts(content: string | Part[] | undefined, read: (part: Part) => string): string {
  if (!Array.isArray(content)) return "";
  return content.map(read).filter((t) => t.length > 0).join("\n");
}

function partText(part: Part): string {
  return part.type === "text" ? part.text ?? "" : "";
}

function partTool(part: Part): string {
  if (part.type === "tool_use") return `[tool ${part.name ?? "?"}] ${stringify(part.input)}`;
  if (part.type === "tool_result") return `[result] ${stringify(part.content)}`;
  return "";
}

/** Sums the usage of every answer in the span. One exchange holds several calls. */
export function sumTokens(body: Line[]): Tokens {
  const total: Tokens = { ...NO_TOKENS };
  for (const line of body) {
    const usage = line.message?.usage;
    if (!isAnswer(line) || !usage) continue;
    total.tokens_in += usage.input_tokens ?? 0;
    total.tokens_out += usage.output_tokens ?? 0;
    total.tokens_cache_read += usage.cache_read_input_tokens ?? 0;
    total.tokens_cache_write += usage.cache_creation_input_tokens ?? 0;
  }
  return total;
}

/** The model that answered. It can change inside one exchange; the last one wins. */
export function modelOf(body: Line[]): string | undefined {
  const models = body.filter(isAnswer).map((l) => l.message?.model);
  const named = models.filter((m): m is string => typeof m === "string" && !m.startsWith("<"));
  return named.length > 0 ? named[named.length - 1] : undefined;
}

/**
 * Turns the lines of one transcript into a session and its exchanges.
 * Every row is a `chat`: `subtask` belongs to a `th` run, which makes its own
 * model calls in its own process and never appears in a transcript.
 */
export function parse(lines: Line[], options: ParseOptions = {}): ParsedTranscript {
  const split = spans(lines, isOpener, isAnswer);
  const exchanges = split.spans
    .map(toExchange)
    .filter((parsed): parsed is ParsedExchange => parsed !== null);

  assert(exchanges.length <= split.spans.length, "claude.parse: no exchange invented");
  return { session: sessionOf(lines, options.host), exchanges, orphans: split.orphans };
}

function toExchange(span: Span<Line>): ParsedExchange | null {
  const { opener, body } = span;
  if (!opener.uuid || !opener.timestamp || !opener.sessionId) return null;

  // the harness is on the session, which is where a fact constant for its life belongs
  const meta: Record<string, unknown> = {};
  if (opener.origin?.kind) meta.trigger = opener.origin.kind;

  const exchange: Exchange = {
    id: opener.uuid,
    session: opener.sessionId,
    timestamp: opener.timestamp,
    kind: "chat",
    actor: MAIN_ACTOR,
    ...modelField(body),
    ...sumTokens(body),
    ...(Object.keys(meta).length > 0 && { meta }),
  };

  const contents: Contents = {
    exchange_id: opener.uuid,
    input: lineText(opener),
    output: joinBody(body.map(lineText)),
    ...toolsField(body),
  };
  assert(validateContents(contents) === null, "claude.toExchange: body is valid");

  return { exchange, contents };
}

function toolsField(body: Line[]): { tools?: string } {
  const tools = joinTools(body.map(lineTools));
  return tools === undefined ? {} : { tools };
}

function modelField(body: Line[]): { model?: string } {
  const model = modelOf(body);
  return model === undefined ? {} : { model };
}

function sessionOf(lines: Line[], host?: string): Session | null {
  const first = lines.find((l) => typeof l.sessionId === "string" && typeof l.timestamp === "string");
  if (!first) return null;
  return {
    id: first.sessionId as string,
    started: first.timestamp as string,
    harness: HARNESS,
    ...(host && { host }),
    ...(first.cwd && { path: first.cwd }),
  };
}
