// Reader for a pi transcript. Pure: the caller reads the file.
//
// pi marks a tool answer with a role of its own, `toolResult`, so a question needs
// no guessing: a `user` message is one. Its message ids are eight hex characters
// instead of a UUID, so the exchange id is derived — one shape in the archive, and
// still deterministic, which is what keeps a second write a no-op.

import { assert } from "../../tb/src/types.js";
import type { Contents, Exchange, Harness, Session } from "./types.js";
import { exchangeId, validateContents } from "./types.js";
import type { ParsedExchange, ParsedTranscript, ParseOptions, Span, Tokens } from "./transcript.js";
import { joinBody, joinTools, MAIN_ACTOR, NO_TOKENS, spans, stringify } from "./transcript.js";

export const HARNESS: Harness = "pi";

export interface Part {
  type?: string;
  text?: string;
  name?: string;
  input?: unknown;
  arguments?: unknown;
}

export interface Usage {
  input?: number;
  output?: number;
  cacheRead?: number;
  cacheWrite?: number;
  cost?: { total?: number };
}

export interface Line {
  type?: string;
  id?: string;
  timestamp?: string;
  /** Only the `session` record carries these. */
  cwd?: string;
  /** A `compaction` record carries usage of its own, and no message. */
  usage?: Usage;
  message?: {
    role?: string;
    model?: string;
    provider?: string;
    content?: string | Part[];
    usage?: Usage;
  };
}

/** A `user` message is a question. pi gives a tool answer the role `toolResult`. */
export function isOpener(line: Line): boolean {
  return line.type === "message" && line.message?.role === "user";
}

export function isAnswer(line: Line): boolean {
  return line.type === "message" && line.message?.role === "assistant";
}

/** True for a line that spent tokens: an answer, or a compaction of the context. */
function spentTokens(line: Line): boolean {
  return isAnswer(line) || line.type === "compaction";
}

export function lineText(line: Line): string {
  const content = line.message?.content;
  if (typeof content === "string") return content;
  return joinParts(line, partText);
}

export function lineTools(line: Line): string {
  assert(line !== null, "pi.lineTools: line is an object");
  assert(typeof line === "object", "pi.lineTools: line is an object");
  return joinParts(line, partTool);
}

function joinParts(line: Line, read: (part: Part, role?: string) => string): string {
  const content = line.message?.content;
  if (!Array.isArray(content)) return "";
  return content.map((part) => read(part, line.message?.role)).filter((t) => t.length > 0).join("\n");
}

function partText(part: Part, role?: string): string {
  return part.type === "text" && role !== "toolResult" ? part.text ?? "" : "";
}

function partTool(part: Part, role?: string): string {
  if (part.type === "toolCall") return `[tool ${part.name ?? "?"}] ${stringify(part.arguments ?? part.input)}`;
  if (part.type === "text" && role === "toolResult") return `[result] ${part.text ?? ""}`;
  return "";
}

/**
 * Sums what the span spent. A compaction counts: it is a model call the exchange
 * paid for, and pi records it as a line of its own rather than as an answer.
 */
export function sumTokens(body: Line[]): Tokens {
  const total: Tokens = { ...NO_TOKENS };
  for (const line of body) {
    const usage = line.message?.usage ?? line.usage;
    if (!spentTokens(line) || !usage) continue;
    total.tokens_in += usage.input ?? 0;
    total.tokens_out += usage.output ?? 0;
    total.tokens_cache_read += usage.cacheRead ?? 0;
    total.tokens_cache_write += usage.cacheWrite ?? 0;
  }
  return total;
}

/** What the span cost in money. pi computes it, Claude Code does not. */
export function sumCost(body: Line[]): number {
  return body.reduce((sum, line) => sum + ((line.message?.usage ?? line.usage)?.cost?.total ?? 0), 0);
}

/** The model that answered. It can change inside one exchange; the last one wins. */
export function modelOf(body: Line[]): string | undefined {
  const named = body.filter(isAnswer).map((l) => l.message?.model).filter((m): m is string => typeof m === "string");
  return named.length > 0 ? named[named.length - 1] : undefined;
}

function providerOf(body: Line[]): string | undefined {
  const named = body.filter(isAnswer).map((l) => l.message?.provider).filter((p): p is string => typeof p === "string");
  return named.length > 0 ? named[named.length - 1] : undefined;
}

/** The session record is the only line that names the session. */
export function sessionOf(lines: Line[], host?: string): Session | null {
  const record = lines.find((l) => l.type === "session" && typeof l.id === "string" && typeof l.timestamp === "string");
  if (!record) return null;
  return {
    id: record.id as string,
    started: record.timestamp as string,
    harness: HARNESS,
    ...(host && { host }),
    ...(record.cwd && { path: record.cwd }),
  };
}

export function parse(lines: Line[], options: ParseOptions = {}): ParsedTranscript {
  const session = sessionOf(lines, options.host);
  if (session === null) return { session: null, exchanges: [], orphans: 0 };

  const split = spans(lines, isOpener, isAnswer);
  const exchanges = split.spans
    .map((span) => toExchange(span, session.id))
    .filter((parsed): parsed is ParsedExchange => parsed !== null);

  assert(exchanges.length <= split.spans.length, "pi.parse: no exchange invented");
  return { session, exchanges, orphans: split.orphans };
}

function toExchange(span: Span<Line>, session: string): ParsedExchange | null {
  const { opener, body } = span;
  if (!opener.id || !opener.timestamp) return null;

  const id = exchangeId(session, opener.id);
  const cost = sumCost(body);
  const provider = providerOf(body);

  const exchange: Exchange = {
    id,
    session,
    timestamp: opener.timestamp,
    kind: "chat",
    actor: MAIN_ACTOR,
    ...modelField(body),
    ...sumTokens(body),
    meta: {
      source_id: opener.id,
      ...(provider && { provider }),
      ...(cost > 0 && { cost_usd: cost }),
    },
  };

  const contents: Contents = {
    exchange_id: id,
    input: lineText(opener),
    output: joinBody(body.map(lineText)),
    ...toolsField(body),
  };
  assert(validateContents(contents) === null, "pi.toExchange: body is valid");

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
