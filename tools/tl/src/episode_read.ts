import { assert, isNonBlank } from "../../common/contract.js";
import { DAY_SHAPE, episodeId } from "./episodes.js";
import type { Episode } from "./episodes.js";
import { ID_SHAPE, TIMESTAMP_SHAPE } from "./types.js";

export type Period = Readonly<{ since: string | null; until: string | null }>;

export type EpisodeRead = Readonly<{ ok: true; episode: Episode } | { ok: false; failure: string }>;

export function isDayOrNull(value: string | null): boolean {
  return value === null || DAY_SHAPE.test(value);
}

export function periodInOrder(period: Period): boolean {
  return period.since === null || period.until === null || period.since <= period.until;
}

export function unboundedAccepts(period: Period, accepted: boolean): boolean {
  return period.since !== null || period.until !== null || accepted;
}

export function readHolds(result: EpisodeRead, id: string): boolean {
  return result.ok ? result.episode.id === id : isNonBlank(result.failure);
}

export function periodOverlaps(episode: Pick<Episode, "from" | "to">, period: Period): boolean {
  assert(isDayOrNull(period.since), "periodOverlaps: since is a day or null");
  assert(isDayOrNull(period.until), "periodOverlaps: until is a day or null");
  assert(periodInOrder(period), "periodOverlaps: since is not after until");
  let result = false;
  result =
    (period.since === null || `${period.since}T00:00:00.000Z` <= episode.to) &&
    (period.until === null || episode.from <= `${period.until}T23:59:59.999Z`);
  assert(unboundedAccepts(period, result), "periodOverlaps: a period with no bound accepts every episode");
  return result;
}

export function episodeFromPayload(id: string, payload: unknown): EpisodeRead {
  assert(ID_SHAPE.test(id), "episodeFromPayload: the id is an id");
  let result = { ok: false, failure: "todo" } as EpisodeRead;
  const record = typeof payload === "object" && payload !== null && !Array.isArray(payload);
  const p = (record ? payload : {}) as Record<string, unknown>;
  const session = typeof p.session === "string" && ID_SHAPE.test(p.session) ? p.session : null;
  const rawExchanges = Array.isArray(p.exchanges) ? p.exchanges : null;
  const exchanges =
    rawExchanges !== null && rawExchanges.length > 0 && rawExchanges.every((x) => typeof x === "string" && ID_SHAPE.test(x))
      ? (rawExchanges as string[])
      : null;
  const from = typeof p.from === "string" && TIMESTAMP_SHAPE.test(p.from) ? p.from : null;
  const to = typeof p.to === "string" && TIMESTAMP_SHAPE.test(p.to) ? p.to : null;
  const summary = typeof p.summary === "string" && isNonBlank(p.summary) ? p.summary : null;
  const extractor = typeof p.extractor === "number" && Number.isInteger(p.extractor) && p.extractor > 0 ? p.extractor : null;
  const model = typeof p.model === "string" && isNonBlank(p.model) ? p.model : null;
  const created = typeof p.created === "string" && TIMESTAMP_SHAPE.test(p.created) ? p.created : null;

  result =
    !record ? { ok: false, failure: "the payload is not an episode" } :
    session === null ? { ok: false, failure: "session is not an id" } :
    exchanges === null ? { ok: false, failure: "exchanges is not a non-empty list of ids" } :
    from === null ? { ok: false, failure: "from is not ISO-8601 UTC" } :
    to === null ? { ok: false, failure: "to is not ISO-8601 UTC" } :
    from > to ? { ok: false, failure: "from is after to" } :
    summary === null ? { ok: false, failure: "summary is blank" } :
    extractor === null ? { ok: false, failure: "extractor is not a positive integer" } :
    model === null ? { ok: false, failure: "model is blank" } :
    created === null ? { ok: false, failure: "created is not ISO-8601 UTC" } :
    episodeId(session, exchanges[0]) !== id ? { ok: false, failure: "the id is not the one from the session and the first exchange" } :
    { ok: true, episode: { id, session, exchanges, from, to, summary, extractor, model, created } };
  assert(readHolds(result, id), "episodeFromPayload: an episode carries the id asked, a failure is not blank");
  return result;
}
