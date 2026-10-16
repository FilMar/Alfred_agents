// The contract of tools/tl/src/episode_read.ts: a stored payload is an episode
// only when every field is in shape, and an episode enters a period when the
// two overlap. Spec: "tl search e tl episode".

import { describe, expect, test } from "bun:test";

import {
  episodeFromPayload,
  isDayOrNull,
  periodInOrder,
  periodOverlaps,
  readHolds,
  unboundedAccepts,
} from "../tools/tl/src/episode_read.ts";
import type { Episode } from "../tools/tl/src/episodes.ts";
import { episodeId } from "../tools/tl/src/episodes.ts";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const SESSION = "11111111-1111-1111-1111-111111111111";
const FIRST_EXCHANGE = "22222222-2222-2222-2222-222222222222";
const SECOND_EXCHANGE = "44444444-4444-4444-4444-444444444444";
const OTHER_ID = "33333333-3333-3333-3333-333333333333";
const EPISODE_ID = episodeId(SESSION, FIRST_EXCHANGE);

// A payload in shape, as the store keeps it: every field the spec asks of an episode, with no id.
// The id travels as the id of the point, and it is the one derived from the session and the first exchange.
const PAYLOAD: Omit<Episode, "id"> = {
  session: SESSION,
  exchanges: [FIRST_EXCHANGE],
  from: "2026-09-30T10:00:00.000Z",
  to: "2026-09-30T11:00:00.000Z",
  summary: "The agent searched the archive and opened an episode.",
  extractor: 1,
  model: "claude-sonnet-4-6",
  created: "2026-09-30T12:00:00.000Z",
};
const EPISODE: Episode = { id: EPISODE_ID, ...PAYLOAD };

// Spans of episode time around the period since 2026-09-30 until 2026-10-02.
type Span = Pick<Episode, "from" | "to">;

const beforeThePeriod: Span = { from: "2026-09-28T00:00:00.000Z", to: "2026-09-29T23:59:59.999Z" };
const endsOnSinceDay: Span = { from: "2026-09-29T00:00:00.000Z", to: "2026-09-30T00:00:00.000Z" };
const spansSinceSide: Span = { from: "2026-09-29T00:00:00.000Z", to: "2026-09-30T12:00:00.000Z" };
const insideSinceDay: Span = { from: "2026-09-30T00:00:00.000Z", to: "2026-09-30T23:59:59.999Z" };
const insideThePeriod: Span = { from: "2026-10-01T00:00:00.000Z", to: "2026-10-01T10:00:00.000Z" };
const spansUntilSide: Span = { from: "2026-10-02T12:00:00.000Z", to: "2026-10-03T00:00:00.000Z" };
const startsOnUntilDay: Span = { from: "2026-10-02T23:59:59.999Z", to: "2026-10-03T00:00:00.000Z" };
const afterThePeriod: Span = { from: "2026-10-03T00:00:00.000Z", to: "2026-10-04T00:00:00.000Z" };
const spansThePeriod: Span = { from: "2026-09-29T00:00:00.000Z", to: "2026-10-03T00:00:00.000Z" };

// ─── The pure helpers ─────────────────────────────────────────────────────────

describe("isDayOrNull", () => {
  test("null is a bound and a day is a day; the shape reads digits, not the calendar", () => {
    expect(isDayOrNull(null)).toBe(true);
    expect(isDayOrNull("2026-09-30")).toBe(true);
    expect(isDayOrNull("2026-13-45")).toBe(true);
    expect(isDayOrNull("2026-9-30")).toBe(false);
    expect(isDayOrNull("2026-09-30T00:00:00.000Z")).toBe(false);
    expect(isDayOrNull("")).toBe(false);
  });
});

describe("periodInOrder", () => {
  test("a missing bound or a since before the until is in order", () => {
    expect(periodInOrder({ since: null, until: null })).toBe(true);
    expect(periodInOrder({ since: "2026-09-30", until: null })).toBe(true);
    expect(periodInOrder({ since: null, until: "2026-10-02" })).toBe(true);
    expect(periodInOrder({ since: "2026-09-30", until: "2026-10-02" })).toBe(true);
    expect(periodInOrder({ since: "2026-09-30", until: "2026-09-30" })).toBe(true);
    expect(periodInOrder({ since: "2026-10-02", until: "2026-09-30" })).toBe(false);
  });
});

describe("unboundedAccepts", () => {
  test("a period with no bound must accept, a period with a bound is free", () => {
    expect(unboundedAccepts({ since: null, until: null }, true)).toBe(true);
    expect(unboundedAccepts({ since: null, until: null }, false)).toBe(false);
    expect(unboundedAccepts({ since: "2026-09-30", until: null }, false)).toBe(true);
    expect(unboundedAccepts({ since: null, until: "2026-10-02" }, false)).toBe(true);
    expect(unboundedAccepts({ since: "2026-09-30", until: "2026-10-02" }, true)).toBe(true);
  });
});

describe("readHolds", () => {
  test("an ok result carries the id asked, a failure is not blank", () => {
    expect(readHolds({ ok: true, episode: EPISODE }, EPISODE_ID)).toBe(true);
    expect(readHolds({ ok: true, episode: EPISODE }, OTHER_ID)).toBe(false);
    expect(readHolds({ ok: false, failure: "session is not an id" }, EPISODE_ID)).toBe(true);
    expect(readHolds({ ok: false, failure: "" }, EPISODE_ID)).toBe(false);
    expect(readHolds({ ok: false, failure: "   " }, EPISODE_ID)).toBe(false);
  });
});

// ─── periodOverlaps ───────────────────────────────────────────────────────────

describe("periodOverlaps", () => {
  test("throws when since is not a day or null", () => {
    const period = { since: "2026-09-30T00:00:00.000Z", until: null };
    expect(() => periodOverlaps(spansThePeriod, period)).toThrow("periodOverlaps: since is a day or null");
  });

  test("throws when until is not a day or null", () => {
    const period = { since: null, until: "2026-10-02T00:00:00.000Z" };
    expect(() => periodOverlaps(spansThePeriod, period)).toThrow("periodOverlaps: until is a day or null");
  });

  test("throws when since is after until", () => {
    const period = { since: "2026-10-02", until: "2026-09-30" };
    expect(() => periodOverlaps(spansThePeriod, period)).toThrow("periodOverlaps: since is not after until");
  });

  test("a period with no bound accepts every episode", () => {
    periodOverlaps(spansThePeriod, { since: null, until: null });
  });

  test("an episode enters when it overlaps the period", () => {
    // no bound: every episode enters
    expect(periodOverlaps(spansThePeriod, { since: null, until: null })).toBe(true);
    expect(periodOverlaps(afterThePeriod, { since: null, until: null })).toBe(true);
    // since: `to` is not before `since`, and the whole since day counts
    expect(periodOverlaps(endsOnSinceDay, { since: "2026-09-30", until: null })).toBe(true); // to at the first millisecond of the day
    expect(periodOverlaps(spansSinceSide, { since: "2026-09-30", until: null })).toBe(true); // to inside the day
    expect(periodOverlaps(beforeThePeriod, { since: "2026-09-30", until: null })).toBe(false); // to one millisecond early
    expect(periodOverlaps(spansSinceSide, { since: "2026-10-01", until: null })).toBe(false); // to a whole day early
    // until: `from` is not after `until`, and the whole until day counts
    expect(periodOverlaps(startsOnUntilDay, { since: null, until: "2026-10-02" })).toBe(true); // from at the last millisecond of the day
    expect(periodOverlaps(spansUntilSide, { since: null, until: "2026-10-02" })).toBe(true); // from inside the day
    expect(periodOverlaps(afterThePeriod, { since: null, until: "2026-10-02" })).toBe(false); // from one millisecond late
    expect(periodOverlaps(spansUntilSide, { since: null, until: "2026-10-01" })).toBe(false); // from a whole day late
    // both bounds
    expect(periodOverlaps(insideThePeriod, { since: "2026-09-30", until: "2026-10-02" })).toBe(true); // strictly inside
    expect(periodOverlaps(spansThePeriod, { since: "2026-09-30", until: "2026-10-02" })).toBe(true); // strictly around
    expect(periodOverlaps(beforeThePeriod, { since: "2026-09-30", until: "2026-10-02" })).toBe(false); // entirely before
    expect(periodOverlaps(afterThePeriod, { since: "2026-09-30", until: "2026-10-02" })).toBe(false); // entirely after
    // a period of one day
    expect(periodOverlaps(insideSinceDay, { since: "2026-09-30", until: "2026-09-30" })).toBe(true);
    expect(periodOverlaps(spansSinceSide, { since: "2026-09-30", until: "2026-09-30" })).toBe(true);
  });
});

// ─── episodeFromPayload ───────────────────────────────────────────────────────

describe("episodeFromPayload", () => {
  test("throws when the id is not an id", () => {
    const oneHexShort = "12345678-1234-1234-1234-12345678901";
    expect(() => episodeFromPayload(oneHexShort, PAYLOAD)).toThrow("episodeFromPayload: the id is an id");
  });

  test("an episode carries the id asked, a failure is not blank", () => {
    episodeFromPayload(EPISODE_ID, PAYLOAD);
    episodeFromPayload(EPISODE_ID, {});
  });

  test("a payload in shape is the episode it claims to be", () => {
    expect(episodeFromPayload(EPISODE_ID, PAYLOAD)).toEqual({ ok: true, episode: EPISODE });
    const oneInstant = { ...PAYLOAD, from: "2026-09-30T10:00:00.000Z", to: "2026-09-30T10:00:00.000Z" };
    expect(episodeFromPayload(EPISODE_ID, oneInstant)).toEqual({ ok: true, episode: { id: EPISODE_ID, ...oneInstant } });
    const twoExchanges = { ...PAYLOAD, exchanges: [FIRST_EXCHANGE, SECOND_EXCHANGE] };
    expect(episodeFromPayload(EPISODE_ID, twoExchanges)).toEqual({ ok: true, episode: { id: EPISODE_ID, ...twoExchanges } });
  });

  test("a payload that breaks one requirement is a world error that names the field", () => {
    const { session, ...withoutSession } = PAYLOAD;
    const worldErrors: Array<[unknown, string | null]> = [
      ["the episode as text", null],
      [{ ...PAYLOAD, session: "not-an-id" }, "session"],
      [withoutSession, "session"],
      [{ ...PAYLOAD, exchanges: "22222222-2222-2222-2222-222222222222" }, "exchanges"],
      [{ ...PAYLOAD, exchanges: [] }, "exchanges"],
      [{ ...PAYLOAD, exchanges: ["not-an-id"] }, "exchanges"],
      [{ ...PAYLOAD, from: "2026-09-30T10:00:00Z" }, "from"],
      [{ ...PAYLOAD, to: "2026-09-30T12:00:00Z" }, "to"],
      [{ ...PAYLOAD, from: "2026-09-30T11:00:00.000Z", to: "2026-09-30T10:00:00.000Z" }, null],
      [{ ...PAYLOAD, summary: "" }, "summary"],
      [{ ...PAYLOAD, extractor: 0 }, "extractor"],
      [{ ...PAYLOAD, extractor: 1.5 }, "extractor"],
      [{ ...PAYLOAD, model: "" }, "model"],
      [{ ...PAYLOAD, created: "2026-09-30T12:00:00Z" }, "created"],
    ];
    for (const [payload, field] of worldErrors) {
      const result = episodeFromPayload(EPISODE_ID, payload);
      expect(result.ok).toBe(false);
      if (field !== null && !result.ok) expect(result.failure).toContain(field);
    }
  });

  test("the id of the point must be the one derived from the session and the first exchange", () => {
    expect(episodeFromPayload(OTHER_ID, PAYLOAD).ok).toBe(false);
  });
});