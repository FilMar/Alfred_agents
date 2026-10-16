import { createHash } from "node:crypto";

import { assert, isNonBlank } from "../../common/contract.js";
import { BLOCK_MARK, lineCountAtLeast, shortId } from "../../common/render.js";
import { ID_SHAPE, TIMESTAMP_SHAPE } from "./types.js";

export const DAY_SHAPE = /^\d{4}-\d{2}-\d{2}$/;

export type ExchangeRef = Readonly<{ id: string; timestamp: string }>;

export type Episode = Readonly<{
  id: string;
  session: string;
  exchanges: readonly string[];
  from: string;
  to: string;
  summary: string;
  extractor: number;
  model: string;
  created: string;
}>;

export type EpisodeInput = Readonly<{
  session: string;
  refs: readonly ExchangeRef[];
  summary: string;
  extractor: number;
  model: string;
  created: string;
}>;

export type EpisodeHead = Pick<Episode, "id" | "from" | "summary">;

export function inTimeOrder(refs: readonly ExchangeRef[]): boolean {
  return refs.every((ref, at) => TIMESTAMP_SHAPE.test(ref.timestamp) && (at === 0 || refs[at - 1].timestamp <= ref.timestamp));
}

export function spansRefs(episode: Episode, refs: readonly ExchangeRef[]): boolean {
  return episode.from === refs[0].timestamp && episode.to === refs[refs.length - 1].timestamp;
}

export function opensDatedBlock(text: string, id: string, from: string): boolean {
  return text.startsWith(`${BLOCK_MARK}${id.slice(0, 8)} ${from.slice(0, 10)}\n`);
}

export function episodeId(session: string, firstExchange: string): string {
  assert(ID_SHAPE.test(session), "episodeId: the session is an id");
  assert(ID_SHAPE.test(firstExchange), "episodeId: the first exchange is an id");
  let result = "";
  const digest = createHash("sha256").update(`${session}:${firstExchange}`).digest("hex");
  result = [digest.slice(0, 8), digest.slice(8, 12), digest.slice(12, 16), digest.slice(16, 20), digest.slice(20, 32)].join("-");
  assert(ID_SHAPE.test(result), "episodeId: the id has the shape of an id");
  return result;
}

export function dayOf(timestamp: string): string {
  assert(TIMESTAMP_SHAPE.test(timestamp), "dayOf: the timestamp is ISO-8601 UTC");
  let result = "";
  result = timestamp.slice(0, 10);
  assert(DAY_SHAPE.test(result), "dayOf: the day has the shape of a day");
  assert(timestamp.startsWith(result), "dayOf: the day is the start of the timestamp");
  return result;
}

export function episodeOf(input: EpisodeInput): Episode {
  assert(input.refs.length > 0, "episodeOf: the episode has an exchange");
  assert(inTimeOrder(input.refs), "episodeOf: the exchanges are in time order");
  assert(isNonBlank(input.summary), "episodeOf: the summary is not blank");
  let result = {} as Episode;
  result = {
    id: episodeId(input.session, input.refs[0].id),
    session: input.session,
    exchanges: input.refs.map((ref) => ref.id),
    from: input.refs[0].timestamp,
    to: input.refs[input.refs.length - 1].timestamp,
    summary: input.summary,
    extractor: input.extractor,
    model: input.model,
    created: input.created,
  };
  assert(result.id === episodeId(input.session, input.refs[0].id), "episodeOf: the id comes from the session and the first exchange");
  assert(spansRefs(result, input.refs), "episodeOf: from and to are the times of the first and the last exchange");
  return result;
}

export function episodeBlock(episode: EpisodeHead): string {
  assert(isNonBlank(episode.summary), "episodeBlock: the summary is not blank");
  let result = "";
  result = `${BLOCK_MARK}${shortId(episode.id)} ${dayOf(episode.from)}\n${episode.summary}`;
  assert(opensDatedBlock(result, episode.id, episode.from), "episodeBlock: the block opens with the short id and the day");
  assert(result.endsWith(episode.summary), "episodeBlock: the block ends with the summary");
  assert(lineCountAtLeast(result, 2), "episodeBlock: the header and the summary each start a line");
  return result;
}
