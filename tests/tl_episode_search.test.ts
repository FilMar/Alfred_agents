// searchEpisodes, episodeById and the tl CLI (search, episode) on the memory stubs.

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { startMemoryStubs } from "./helpers/td_stubs.ts";

const memory = startMemoryStubs();
afterAll(() => memory.stop());

const { writeEpisodes, searchEpisodes, episodeById, resolveEpisodeId, EPISODES_COLLECTION } = await import("../tools/tl/src/episode_store.ts");
const { episodeOf } = await import("../tools/tl/src/episodes.ts");

const NONE = { since: null, until: null };
const SESSION_A = "01a0f33d-4816-7451-b415-be09424330e4";
const SESSION_B = "01a0f33d-4816-7451-b415-be09424330e5";
const X = Array.from({ length: 8 }, (_, k) => `7792f37d-47cb-e4a1-6b66-c580e210fd0${k}`);

const made = (session: string, first: number, last: number, from: string, to: string, summary: string) =>
  episodeOf({
    session,
    refs: [{ id: X[first], timestamp: from }, ...(last > first ? [{ id: X[last], timestamp: to }] : [])],
    summary,
    extractor: 2,
    model: "glm-5.3-flash",
    created: "2026-10-16T14:00:00.000Z",
  });

const run = async (...args: string[]): Promise<{ code: number; out: string; err: string }> => {
  const proc = Bun.spawn(["bun", "tools/tl/src/cli.ts", ...args], { env: process.env, stdout: "pipe", stderr: "pipe" });
  const code = await proc.exited;
  return { code, out: await new Response(proc.stdout).text(), err: await new Response(proc.stderr).text() };
};

describe("an empty store", () => {
  test("search finds nothing, without an error", async () => {
    expect(await searchEpisodes("zebra quagga", { limit: 5, minScore: 0.1, period: NONE })).toEqual([]);
  });

  test("an id starts no episode", async () => {
    await expect(resolveEpisodeId("ffffffff")).rejects.toThrow('No episode id starts with "ffffffff"');
  });

  test("tl search prints nothing", async () => {
    const result = await run("search", "zebra quagga");
    expect(result.code).toBe(0);
    expect(result.out).toBe("");
  });
});

const zebra = made(SESSION_A, 0, 1, "2026-09-28T10:00:00.000Z", "2026-09-29T09:00:00.000Z", "zebra quagga okapi savana");
const cactus = made(SESSION_A, 2, 3, "2026-10-05T10:00:00.000Z", "2026-10-05T11:00:00.000Z", "cactus succulenta deserto arido");
const penguin = made(SESSION_B, 4, 5, "2026-10-10T08:00:00.000Z", "2026-10-12T08:00:00.000Z", "pinguino foca iceberg polare zebra");

describe("the store with episodes", () => {
  beforeAll(async () => {
    await writeEpisodes(SESSION_A, [zebra, cactus]);
    await writeEpisodes(SESSION_B, [penguin]);
  });

  test("search puts the best score first and keeps the ones over the minimum", async () => {
    const hits = await searchEpisodes("zebra quagga okapi savana", { limit: 5, minScore: 0.25, period: NONE });
    expect(hits.map((hit) => hit.episode.id)).toEqual([zebra.id, penguin.id]);
    expect(hits[0].score).toBeGreaterThan(hits[1].score);
  });

  test("a high minimum score leaves out the weaker hit", async () => {
    const hits = await searchEpisodes("zebra quagga okapi savana", { limit: 5, minScore: 0.5, period: NONE });
    expect(hits.map((hit) => hit.episode.id)).toEqual([zebra.id]);
  });

  test("the limit cuts the list", async () => {
    const hits = await searchEpisodes("zebra quagga okapi savana", { limit: 1, minScore: 0.25, period: NONE });
    expect(hits.map((hit) => hit.episode.id)).toEqual([zebra.id]);
  });

  test("the period keeps the episodes that overlap it", async () => {
    const ask = (since: string | null, until: string | null) =>
      searchEpisodes("zebra quagga okapi savana", { limit: 5, minScore: 0.25, period: { since, until } }).then((hits) => hits.map((hit) => hit.episode.id));
    expect(await ask("2026-10-11", null)).toEqual([penguin.id]);
    expect(await ask(null, "2026-09-28")).toEqual([zebra.id]);
    expect(await ask("2026-09-29", "2026-09-29")).toEqual([zebra.id]);
    expect(await ask("2026-09-30", "2026-10-09")).toEqual([]);
  });

  test("with a period, the limit counts the episodes inside it", async () => {
    const hits = await searchEpisodes("zebra quagga okapi savana", { limit: 1, minScore: 0.25, period: { since: "2026-10-11", until: null } });
    expect(hits.map((hit) => hit.episode.id)).toEqual([penguin.id]);
  });

  test("a payload that is not an episode is an error that names the field", async () => {
    const points = memory.collection(EPISODES_COLLECTION)!;
    const bad = points.get(cactus.id)!;
    const saved = bad.payload.summary;
    bad.payload.summary = "";
    await expect(searchEpisodes("cactus succulenta deserto arido", { limit: 5, minScore: 0.1, period: NONE })).rejects.toThrow("summary");
    bad.payload.summary = saved;
  });

  test("a prefix gives the episode that search --json shows", async () => {
    const found = JSON.parse((await run("search", "zebra quagga okapi savana", "--json", "--min-score", "0.5")).out);
    const shown = await run("episode", zebra.id.slice(0, 8));
    expect(shown.code).toBe(0);
    expect(JSON.parse(shown.out)).toEqual(found[0].episode);
    expect(await episodeById(zebra.id)).toEqual(zebra);
  });

  test("a prefix shared by two episodes is ambiguous", async () => {
    const ids = [zebra.id, cactus.id, penguin.id];
    const shared = ids.map((id) => id[0]).find((ch, at, all) => all.indexOf(ch) !== at);
    if (shared === undefined) return;
    await expect(resolveEpisodeId(shared)).rejects.toThrow("Ambiguous id");
  });
});

describe("tl search as a process", () => {
  test("prints one block per hit: the short id, the day, the summary", async () => {
    const result = await run("search", "zebra quagga okapi savana", "--min-score", "0.5");
    expect(result.code).toBe(0);
    expect(result.out).toBe(`-- ${zebra.id.slice(0, 8)} 2026-09-28\nzebra quagga okapi savana\n`);
  });

  test("with --json prints the hits with a score and no vector", async () => {
    const result = await run("search", "zebra quagga okapi savana", "--json", "--min-score", "0.5");
    const parsed = JSON.parse(result.out);
    expect(Object.keys(parsed[0]).sort()).toEqual(["episode", "score"]);
    expect("vector" in parsed[0].episode).toBe(false);
  });

  test("--since and --until filter by day", async () => {
    const result = await run("search", "zebra quagga okapi savana", "--since", "2026-10-11", "--min-score", "0.25");
    expect(result.out).toContain(`-- ${penguin.id.slice(0, 8)} 2026-10-10`);
    expect(result.out).not.toContain(zebra.id.slice(0, 8));
  });

  test("a bad day or an inverted period fails with a message", async () => {
    const bad = await run("search", "zebra", "--since", "ieri");
    expect(bad.code).toBe(1);
    expect(bad.err).toContain("--since must be a day");
    const inverted = await run("search", "zebra", "--since", "2026-10-02", "--until", "2026-10-01");
    expect(inverted.code).toBe(1);
    expect(inverted.err).toContain("--since is after --until");
  });

  test("a bad limit fails with a message", async () => {
    const result = await run("search", "zebra", "--limit", "0");
    expect(result.code).toBe(1);
    expect(result.err).toContain("--limit must be a positive integer");
  });
});
