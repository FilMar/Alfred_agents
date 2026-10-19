// writeEpisodes on the memory stubs: it replaces the episodes of one session and leaves the others alone.

import { afterAll, describe, expect, test } from "bun:test";
import { embed, startMemoryStubs } from "./helpers/td_stubs.ts";

const memory = startMemoryStubs();
afterAll(() => memory.stop());

const { writeEpisodes, EPISODES_COLLECTION, EPISODES_REAL_COLLECTION } = await import("../tools/tl/src/episode_store.ts");
const { episodeOf } = await import("../tools/tl/src/episodes.ts");
const { DOCUMENT_PREFIX } = await import("../tools/tb/src/infra.ts");

const SESSION = "01a0f33d-4816-7451-b415-be09424330e4";
const OTHER = "01a0f33d-4816-7451-b415-be09424330e5";
const X1 = "7792f37d-47cb-e4a1-6b66-c580e210fdc9";
const X2 = "a8f1cc0b-c3fe-b766-d055-830dadc092fd";
const X3 = "056850c8-7163-6b41-23a7-b217569dd59f";
const T1 = "2026-09-30T16:55:27.903Z";
const T2 = "2026-09-30T16:56:31.264Z";
const T3 = "2026-09-30T16:57:15.109Z";

const made = (session: string, refs: Array<[string, string]>, summary: string) =>
  episodeOf({ session, refs: refs.map(([id, timestamp]) => ({ id, timestamp })), summary, extractor: 2, model: "glm-5.3-flash", created: "2026-10-16T14:00:00.000Z" });

const stored = () => memory.collection(EPISODES_COLLECTION) ?? new Map();
const idsOf = (session: string) => [...stored().entries()].filter(([, p]) => (p.payload as { session: string }).session === session).map(([id]) => id).sort();

describe("writeEpisodes", () => {
  test("keeps the episodes in a collection named after the model, behind an alias", async () => {
    await writeEpisodes(SESSION, [made(SESSION, [[X1, T1]], "Uno")]);
    expect(EPISODES_REAL_COLLECTION).toBe("tl_episodes__v2moe-768");
    expect(memory.aliases.get(EPISODES_COLLECTION)).toBe(EPISODES_REAL_COLLECTION);
    expect(memory.collections.has(EPISODES_COLLECTION)).toBe(false);
    expect(memory.collections.get(EPISODES_REAL_COLLECTION)?.size).toBe(1);
  });

  test("stores the payload and a vector, and no text of the exchanges", async () => {
    const episode = made(SESSION, [[X1, T1], [X2, T2], [X3, T3]], "Tre video estratti e spiegati");
    expect(await writeEpisodes(SESSION, [episode])).toBeNull();
    const point = stored().get(episode.id)!;
    expect(point.vector).toEqual(embed(DOCUMENT_PREFIX + "Tre video estratti e spiegati"));
    expect(point.payload).toEqual({ session: SESSION, exchanges: [X1, X2, X3], from: T1, to: T3, summary: "Tre video estratti e spiegati", extractor: 2, model: "glm-5.3-flash", created: "2026-10-16T14:00:00.000Z" });
  });

  test("writing the same session twice leaves the same episodes", async () => {
    const episode = made(SESSION, [[X1, T1], [X2, T2]], "Due scambi");
    await writeEpisodes(SESSION, [episode]);
    await writeEpisodes(SESSION, [episode]);
    expect(idsOf(SESSION)).toEqual([episode.id]);
  });

  test("a new split replaces the old episodes of the session and leaves other sessions", async () => {
    const other = made(OTHER, [[X1, T1]], "Un'altra sessione");
    await writeEpisodes(OTHER, [other]);
    const old = made(SESSION, [[X2, T2], [X3, T3]], "Vecchia divisione");
    await writeEpisodes(SESSION, [old]);
    const whole = made(SESSION, [[X1, T1], [X2, T2], [X3, T3]], "Tutto in uno");
    expect(await writeEpisodes(SESSION, [whole])).toBeNull();
    expect(idsOf(SESSION)).toEqual([whole.id]);
    expect(idsOf(OTHER)).toEqual([other.id]);
  });

  test("a store that is down is a returned failure", async () => {
    memory.failPath("/collections/tl_episodes");
    const message = await writeEpisodes(SESSION, [made(SESSION, [[X1, T1]], "Non scritto")]);
    memory.failPath(null);
    expect(message).toContain("writeEpisodes: ");
  });

  test("wants at least one episode", async () => {
    await expect(writeEpisodes(SESSION, [])).rejects.toThrow("writeEpisodes: at least one episode");
  });

  test("wants every episode to be of the session", async () => {
    await expect(writeEpisodes(SESSION, [made(OTHER, [[X1, T1]], "Di un'altra")])).rejects.toThrow("writeEpisodes: every episode is of the session");
  });

  test("wants no episode twice", async () => {
    const episode = made(SESSION, [[X1, T1]], "Doppio");
    await expect(writeEpisodes(SESSION, [episode, episode])).rejects.toThrow("writeEpisodes: no episode twice");
  });
});
