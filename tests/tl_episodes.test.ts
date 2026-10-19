// Tests for the episode contract of tools/tl/src/episodes.ts, from episodes.ts and spec.md.
// Precondition tests break an assert above the todo line: they pass already.
// Postcondition tests are bare calls: the asserts below the todo line are the oracle.
// Classifier tests pin the rules of the spec; they go green when the todo bodies are filled.

import { describe, expect, test } from "bun:test";

import {
  dayOfTime,
  episodeBlock,
  episodeId,
  episodeOf,
  inTimeOrder,
  opensDatedBlock,
  spansRefs,
  type Episode,
  type EpisodeInput,
  type ExchangeRef,
} from "../tools/tl/src/episodes.ts";

// Ids in 8-4-4-4-12 form and ISO-8601 UTC times, like the ones tl already uses.
const SESSION = "01234567-89ab-cdef-0123-456789abcdef";
const FIRST = "fedcba98-7654-3210-fedc-ba9876543210";
const SECOND = "13579ace-2468-bdf0-1357-9ace2468bdf0";
const THIRD = "2468ace0-1357-9bdf-2468-ace013579bdf";
const T1 = "2026-09-30T14:23:11.000Z";
const T2 = "2026-09-30T15:42:07.000Z";
const T3 = "2026-10-01T08:00:00.000Z";
const CREATED = "2026-10-01T09:30:00.000Z";
const MODEL = "text-embedding-3-small";

const ref = (id: string, timestamp: string): ExchangeRef => ({ id, timestamp });

const episode = (from: string, to: string): Episode => ({
  id: SESSION,
  session: SESSION,
  exchanges: [FIRST],
  from,
  to,
  summary: "Riassunto",
  extractor: 1,
  model: MODEL,
  created: CREATED,
});

const episodeInput = (refs: readonly ExchangeRef[], summary: string): EpisodeInput => ({
  session: SESSION,
  refs,
  summary,
  extractor: 1,
  model: MODEL,
  created: CREATED,
});

// The ids below are the sha256 of "session:first exchange" in 8-4-4-4-12 form, as the spec says.
const ID_SESSION_FIRST = "76194d9c-bf15-8626-8970-f2bb9ca5019b";
const ID_SESSION_SECOND = "c3d66c1a-63b3-4c62-9acf-11d249c46842";
const ID_SECOND_FIRST = "a5493c72-ea13-ae0c-5543-ec2a03760fe4";

describe("inTimeOrder", () => {
  test("is true only when every time is ISO-8601 UTC and none goes back", () => {
    expect(inTimeOrder([])).toBe(true);
    expect(inTimeOrder([ref(FIRST, T1)])).toBe(true);
    expect(inTimeOrder([ref(FIRST, T1), ref(SECOND, T2)])).toBe(true);
    expect(inTimeOrder([ref(FIRST, T1), ref(SECOND, T1)])).toBe(true);
    expect(inTimeOrder([ref(FIRST, T1), ref(SECOND, T2), ref(THIRD, T2)])).toBe(true);
    expect(inTimeOrder([ref(FIRST, T2), ref(SECOND, T1)])).toBe(false);
    expect(inTimeOrder([ref(FIRST, "not a timestamp"), ref(SECOND, T2)])).toBe(false);
    expect(inTimeOrder([ref(FIRST, T1), ref(SECOND, "not a timestamp")])).toBe(false);
  });
});

describe("spansRefs", () => {
  test("is true only when from and to are the times of the first and the last exchange", () => {
    const refs = [ref(FIRST, T1), ref(SECOND, T2), ref(THIRD, T3)];
    expect(spansRefs(episode(T1, T3), refs)).toBe(true);
    expect(spansRefs(episode(T2, T3), refs)).toBe(false);
    expect(spansRefs(episode(T1, T2), refs)).toBe(false);
    expect(spansRefs(episode(T1, T1), [ref(FIRST, T1)])).toBe(true);
  });
});

describe("opensDatedBlock", () => {
  test("is true only when the text opens with the -- <id8> <day> line", () => {
    expect(opensDatedBlock("-- fedcba98 2026-09-30\nRiassunto", FIRST, T1)).toBe(true);
    expect(opensDatedBlock("-- fedcba98 2026-09-30\nRiassunto", "fedcba98-1111-2222-3333-444444444444", T1)).toBe(true);
    expect(opensDatedBlock("-- fedcba98 2026-09-30\nRiassunto", FIRST, "2026-09-30T23:59:59.999Z")).toBe(true);
    expect(opensDatedBlock("-- 01234567 2026-09-30\nRiassunto", FIRST, T1)).toBe(false);
    expect(opensDatedBlock("-- fedcba98 2026-10-01\nRiassunto", FIRST, T1)).toBe(false);
    expect(opensDatedBlock("-- fedcba98 2026-09-30", FIRST, T1)).toBe(false);
    expect(opensDatedBlock("Riassunto\n-- fedcba98 2026-09-30\n", FIRST, T1)).toBe(false);
  });
});

describe("episodeId", () => {
  test("episodeId: the session is an id", () => {
    expect(() => episodeId("not-an-id", FIRST)).toThrow(/episodeId: the session is an id/);
  });

  test("episodeId: the first exchange is an id", () => {
    expect(() => episodeId(SESSION, "12345678")).toThrow(/episodeId: the first exchange is an id/);
  });

  test("episodeId: the id has the shape of an id", () => {
    // A bare call: the postcondition assert inside episodeId is the oracle.
    episodeId(SESSION, FIRST);
  });

  test("is the sha256 of session:firstExchange, in 8-4-4-4-12 form", () => {
    expect(episodeId(SESSION, FIRST)).toBe(ID_SESSION_FIRST);
    expect(episodeId(SESSION, SECOND)).toBe(ID_SESSION_SECOND);
    expect(episodeId(SECOND, FIRST)).toBe(ID_SECOND_FIRST);
  });

  test("rewrites the same id, and separates different first exchanges", () => {
    expect(episodeId(SESSION, FIRST)).toBe(episodeId(SESSION, FIRST));
    expect(episodeId(SESSION, FIRST)).not.toBe(episodeId(SESSION, SECOND));
  });
});

describe("dayOfTime", () => {
  test("dayOfTime: the timestamp is ISO-8601 UTC", () => {
    expect(() => dayOfTime("not a timestamp")).toThrow(/dayOfTime: the timestamp is ISO-8601 UTC/);
  });

  test("dayOfTime: the day has the shape of a day", () => {
    // A bare call: the postcondition asserts inside dayOfTime are the oracle.
    dayOfTime(T1);
  });

  test("dayOfTime: the day is the start of the timestamp", () => {
    dayOfTime("2026-12-31T23:59:59.999Z");
  });

  test("is the day of the timestamp, without the hour", () => {
    expect(dayOfTime(T1)).toBe("2026-09-30");
    expect(dayOfTime("2026-01-01T00:00:00.000Z")).toBe("2026-01-01");
    expect(dayOfTime("2026-12-31T23:59:59.999Z")).toBe("2026-12-31");
  });
});

describe("episodeOf", () => {
  test("episodeOf: the episode has an exchange", () => {
    expect(() => episodeOf(episodeInput([], "Riassunto"))).toThrow(/episodeOf: the episode has an exchange/);
  });

  test("episodeOf: the exchanges are in time order", () => {
    expect(() => episodeOf(episodeInput([ref(FIRST, T2), ref(SECOND, T1)], "Riassunto"))).toThrow(/episodeOf: the exchanges are in time order/);
  });

  test("episodeOf: the summary is not blank", () => {
    expect(() => episodeOf(episodeInput([ref(FIRST, T1)], ""))).toThrow(/episodeOf: the summary is not blank/);
  });

  test("episodeOf: the id comes from the session and the first exchange", () => {
    // A bare call: the postcondition assert inside episodeOf is the oracle.
    episodeOf(episodeInput([ref(FIRST, T1), ref(SECOND, T2)], "Riassunto"));
  });

  test("episodeOf: from and to are the times of the first and the last exchange", () => {
    episodeOf(episodeInput([ref(SECOND, T2)], "Un solo scambio"));
  });

  test("is the episode of the spec", () => {
    expect(episodeOf(episodeInput([ref(FIRST, T1), ref(SECOND, T2), ref(THIRD, T3)], "Riassunto"))).toEqual({
      id: ID_SESSION_FIRST,
      session: SESSION,
      exchanges: [FIRST, SECOND, THIRD],
      from: T1,
      to: T3,
      summary: "Riassunto",
      extractor: 1,
      model: MODEL,
      created: CREATED,
    });
  });

  test("with one exchange, from and to are that time", () => {
    expect(episodeOf(episodeInput([ref(SECOND, T2)], "Un solo scambio"))).toEqual({
      id: ID_SESSION_SECOND,
      session: SESSION,
      exchanges: [SECOND],
      from: T2,
      to: T2,
      summary: "Un solo scambio",
      extractor: 1,
      model: MODEL,
      created: CREATED,
    });
  });

  test("with exchanges at the same instant, from equals to", () => {
    expect(episodeOf(episodeInput([ref(FIRST, T1), ref(SECOND, T1)], "Stesso istante"))).toEqual({
      id: ID_SESSION_FIRST,
      session: SESSION,
      exchanges: [FIRST, SECOND],
      from: T1,
      to: T1,
      summary: "Stesso istante",
      extractor: 1,
      model: MODEL,
      created: CREATED,
    });
  });
});

describe("episodeBlock", () => {
  test("episodeBlock: the summary is not blank", () => {
    expect(() => episodeBlock({ id: FIRST, from: T1, summary: "" })).toThrow(/episodeBlock: the summary is not blank/);
  });

  test("episodeBlock: the block opens with the short id and the day", () => {
    // A bare call: the postcondition asserts inside episodeBlock are the oracle.
    episodeBlock({ id: FIRST, from: T1, summary: "Riassunto" });
  });

  test("episodeBlock: the block ends with the summary", () => {
    episodeBlock({ id: FIRST, from: T1, summary: "Riassunto, con punteggiatura e spazi." });
  });

  test("episodeBlock: the header and the summary each start a line", () => {
    episodeBlock({ id: FIRST, from: T1, summary: "Prima riga\nSeconda riga" });
  });

  test("is the -- <id8> <day> header line followed by the summary, and nothing else", () => {
    expect(episodeBlock({ id: FIRST, from: T1, summary: "Riassunto" })).toBe("-- fedcba98 2026-09-30\nRiassunto");
    expect(episodeBlock({ id: SESSION, from: T3, summary: "Altro riassunto" })).toBe("-- 01234567 2026-10-01\nAltro riassunto");
    expect(episodeBlock({ id: FIRST, from: T1, summary: "Prima riga\nSeconda riga" })).toBe("-- fedcba98 2026-09-30\nPrima riga\nSeconda riga");
  });
});