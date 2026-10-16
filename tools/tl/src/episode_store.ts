import { assert, isNonBlank } from "../../common/contract.js";
import { errorMessage } from "../../common/cli.js";
import { createCollection, embedDocument, getCollectionInfo, qdrantClient, VECTOR_SIZE } from "../../tb/src/infra.js";
import type { Episode } from "./episodes.js";

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
