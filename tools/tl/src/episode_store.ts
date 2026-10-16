import { assert, isNonBlank, isPositiveInt } from "../../common/contract.js";
import { errorMessage } from "../../common/cli.js";
import { createCollection, embedDocument, embedQuery, getCollectionInfo, qdrantClient, VECTOR_SIZE } from "../../tb/src/infra.js";
import { matchPrefix } from "../../tb/src/types.js";
import { episodeFromPayload, periodOverlaps } from "./episode_read.js";
import type { Period } from "./episode_read.js";
import type { Episode } from "./episodes.js";
import { ID_SHAPE } from "./types.js";

export const EPISODES_COLLECTION = "tl_episodes";
export const EPISODES_PER_SESSION_MAX = 1000;

async function ensureCollection(): Promise<void> {
  const check = await getCollectionInfo(EPISODES_COLLECTION);
  if (check.exists) return;
  await createCollection(EPISODES_COLLECTION, { vectors: { size: VECTOR_SIZE, distance: "Cosine" } });
}

async function idsOfSession(session: string): Promise<string[]> {
  const res = await qdrantClient.request<{ result?: { points?: Array<{ id: string }> } }>(
    "POST",
    `/collections/${EPISODES_COLLECTION}/points/scroll`,
    { filter: { must: [{ key: "session", match: { value: session } }] }, limit: EPISODES_PER_SESSION_MAX, with_payload: false },
  );
  return (res.result?.points ?? []).map((point) => point.id);
}

function payloadOf(episode: Episode): Record<string, unknown> {
  const { id, ...payload } = episode;
  assert(isNonBlank(id), "payloadOf: the episode has an id");
  return payload;
}

function sameIds(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && [...left].sort().every((id, at) => id === [...right].sort()[at]);
}

function hasDistinctIds(episodes: readonly Episode[]): boolean {
  return new Set(episodes.map((episode) => episode.id)).size === episodes.length;
}

function ofOneSession(session: string, episodes: readonly Episode[]): boolean {
  return episodes.every((episode) => episode.session === session);
}

/** Replaces the episodes of a session with the ones given. Returns a message when the world fails, null when it is done. */
export async function writeEpisodes(session: string, episodes: readonly Episode[]): Promise<string | null> {
  assert(episodes.length > 0, "writeEpisodes: at least one episode");
  assert(episodes.length <= EPISODES_PER_SESSION_MAX, "writeEpisodes: the episodes fit in one page");
  assert(ofOneSession(session, episodes), "writeEpisodes: every episode is of the session");
  assert(hasDistinctIds(episodes), "writeEpisodes: no episode twice");
  let result: string | null = null;
  try {
    await ensureCollection();
    const points = [];
    for (const episode of episodes) {
      points.push({ id: episode.id, vector: await embedDocument(episode.summary), payload: payloadOf(episode) });
    }
    await qdrantClient.request("PUT", `/collections/${EPISODES_COLLECTION}/points`, { points });
    const wanted = episodes.map((episode) => episode.id);
    const stale = (await idsOfSession(session)).filter((id) => !wanted.includes(id));
    if (stale.length > 0) {
      await qdrantClient.request("POST", `/collections/${EPISODES_COLLECTION}/points/delete`, { points: stale });
    }
    if (!sameIds(await idsOfSession(session), wanted)) {
      result = `writeEpisodes: the session does not hold exactly the episodes written, session=${session}`;
    }
  } catch (err) {
    result = `writeEpisodes: ${errorMessage(err)}`;
  }
  assert(result === null || isNonBlank(result), "writeEpisodes: a failure is not blank");
  return result;
}

export const ID_PAGE_SIZE = 1000;
export const ID_CANDIDATES_SHOWN = 5;
const ID_PAGES_MAX = 50;

export type Hit = Readonly<{ episode: Episode; score: number }>;

export type SearchOptions = Readonly<{ limit: number; minScore: number; period: Period }>;

function sortedByScore(hits: readonly Hit[]): boolean {
  return hits.every((hit, at) => at === 0 || hits[at - 1].score >= hit.score);
}

function allInPeriod(hits: readonly Hit[], period: Period): boolean {
  return hits.every((hit) => periodOverlaps(hit.episode, period));
}

/** The Qdrant filter for the episodes that overlap the period, or nothing when the period has no bound. */
function periodFilter(period: Period): { must: unknown[] } | undefined {
  const must: unknown[] = [];
  if (period.since !== null) must.push({ key: "to", range: { gte: `${period.since}T00:00:00.000Z` } });
  if (period.until !== null) must.push({ key: "from", range: { lte: `${period.until}T23:59:59.999Z` } });
  return must.length > 0 ? { must } : undefined;
}

function allAtLeast(hits: readonly Hit[], minScore: number): boolean {
  return hits.every((hit) => hit.score >= minScore);
}

async function collectionExists(): Promise<boolean> {
  return (await getCollectionInfo(EPISODES_COLLECTION)).exists;
}

async function allIds(): Promise<string[]> {
  const ids: string[] = [];
  let offset: unknown = undefined;
  let page = 0;
  do {
    const res: { result?: { points?: Array<{ id: string }>; next_page_offset?: unknown } } = await qdrantClient.request(
      "POST",
      `/collections/${EPISODES_COLLECTION}/points/scroll`,
      { limit: ID_PAGE_SIZE, with_payload: false, ...(offset !== undefined && { offset }) },
    );
    ids.push(...(res.result?.points ?? []).map((point) => point.id));
    offset = res.result?.next_page_offset ?? undefined;
    page += 1;
  } while (offset !== undefined && page < ID_PAGES_MAX);
  assert(offset === undefined, "allIds: the collection fits inside the page cap");
  return ids;
}

/** Searches the episodes by meaning. A missing collection holds no episode. A payload that is not an episode throws. */
export async function searchEpisodes(query: string, options: SearchOptions): Promise<readonly Hit[]> {
  assert(isNonBlank(query), "searchEpisodes: the query is not blank");
  assert(isPositiveInt(options.limit), "searchEpisodes: the limit is a positive integer");
  let result: readonly Hit[] = [];
  if (await collectionExists()) {
    const filter = periodFilter(options.period);
    const res = await qdrantClient.request<{ result?: { points?: Array<{ id: string; score: number; payload: unknown }> } }>(
      "POST",
      `/collections/${EPISODES_COLLECTION}/points/query`,
      { query: await embedQuery(query), limit: options.limit, with_payload: true, score_threshold: options.minScore, ...(filter !== undefined && { filter }) },
    );
    const hits: Hit[] = [];
    for (const point of res.result?.points ?? []) {
      const read = episodeFromPayload(point.id, point.payload);
      if (!read.ok) throw new Error(read.failure);
      hits.push({ episode: read.episode, score: point.score });
    }
    result = hits.slice(0, options.limit);
  }
  assert(sortedByScore(result), "searchEpisodes: the best score comes first");
  assert(allAtLeast(result, options.minScore), "searchEpisodes: no hit is under the minimum score");
  assert(allInPeriod(result, options.period), "searchEpisodes: every hit overlaps the period");
  return result;
}

/** Resolves a full id, or the one episode id that starts with `prefix`. */
export async function resolveEpisodeId(idOrPrefix: string): Promise<string> {
  assert(isNonBlank(idOrPrefix), "resolveEpisodeId: the id is not blank");
  if (ID_SHAPE.test(idOrPrefix)) return idOrPrefix;
  const matches = (await collectionExists()) ? matchPrefix(idOrPrefix, await allIds()) : [];
  if (matches.length === 0) throw new Error(`No episode id starts with "${idOrPrefix}"`);
  if (matches.length > 1) {
    const shown = matches.slice(0, ID_CANDIDATES_SHOWN).join(", ");
    throw new Error(`Ambiguous id "${idOrPrefix}": ${matches.length} episodes match (${shown})`);
  }
  assert(ID_SHAPE.test(matches[0]), "resolveEpisodeId: a resolved id is a full id");
  return matches[0];
}

/** Returns the whole episode for a full id or the one prefix that matches it. */
export async function episodeById(idOrPrefix: string): Promise<Episode> {
  const id = await resolveEpisodeId(idOrPrefix);
  const res = await qdrantClient.request<{ result?: Array<{ id: string; payload: unknown }> }>(
    "POST",
    `/collections/${EPISODES_COLLECTION}/points`,
    { ids: [id], with_payload: true },
  );
  const point = res.result?.[0];
  if (point === undefined) throw new Error(`Episode not found: ${id}`);
  const read = episodeFromPayload(id, point.payload);
  if (!read.ok) throw new Error(read.failure);
  assert(read.episode.id === id, "episodeById: the episode found carries the id asked");
  return read.episode;
}
