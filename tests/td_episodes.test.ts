import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import { extractorJson } from "./helpers/td_stubs.ts";

import { Episode, SessionMap } from "../tools/td/src/episodes.ts";
import { Turn, SessionRead } from "../tools/td/src/session.ts";
import { Extractor } from "../tools/td/src/config.ts";
import type { Contents, Exchange } from "../tools/tl/src/types.ts";

let seq = 0;

function turn(input = "vai", output = "Fatto.", session = "s-1"): Turn {
  seq += 1;
  const id = `00000000-0000-4000-8000-${String(seq).padStart(12, "0")}`;
  const exchange: Exchange = {
    id,
    session,
    timestamp: new Date(Date.UTC(2026, 0, 1) + seq * 1000).toISOString(),
    kind: "chat",
    actor: "alfredo",
  };
  const contents: Contents = { exchange_id: id, input, output };
  return Turn.of(exchange, contents);
}

const readOf = (turns: Turn[]): SessionRead => SessionRead.of("s-1", turns);

type Fake = { readonly text?: string; readonly status?: number };

type Wire = { readonly messages: ReadonlyArray<{ readonly role: string; readonly content: string }> };

const queue: Fake[] = [];
const seen: Wire[] = [];

function sse(text: string): Response {
  const chunks = [
    { id: "chatcmpl-fake", object: "chat.completion.chunk", model: "glm-5.3-flash",
      choices: [{ index: 0, delta: { content: text }, finish_reason: null }] },
    { id: "chatcmpl-fake", object: "chat.completion.chunk", model: "glm-5.3-flash",
      choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } },
  ];
  const body = chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("") + "data: [DONE]\n\n";
  return new Response(body, { headers: { "content-type": "text/event-stream" } });
}

const server = Bun.serve({
  port: 0,
  async fetch(request: Request): Promise<Response> {
    if (request.method === "POST") {
      seen.push((await request.json()) as Wire);
    }
    const reply = queue.shift();
    if (reply === undefined) {
      return Response.json({ error: { message: "the fake queue is empty" } }, { status: 500 });
    }
    if (reply.status !== undefined) {
      return Response.json({ error: { message: "the fake model denies the request" } }, { status: reply.status });
    }
    return sse(reply.text ?? "");
  },
});

afterAll(() => server.stop(true));

const extractor = Extractor.fromJson(extractorJson(`http://localhost:${server.port}/v1`, "You split sessions."));

const GOOD = '{"episodes":[{"from":0,"to":2,"summary":"s"}]}';
const GAP = '{"episodes":[{"from":0,"to":1,"summary":"a"}]}';

beforeEach(() => {
  queue.length = 0;
  seen.length = 0;
});

describe("Episode.of", () => {
  const RANGE = "Episode.of: from and to are indices with from <= to";
  const SUMMARY = "Episode.of: the summary is not blank";
  const TURNS = "Episode.of: one turn per index";
  const refused: [string, () => unknown, string][] = [
    ["a range that ends before it starts", () => Episode.of(1, 0, "s", []), RANGE],
    ["a negative index", () => Episode.of(-1, 0, "s", []), RANGE],
    ["a non-integer index", () => Episode.of(0.5, 1, "s", []), RANGE],
    ["an empty summary", () => Episode.of(0, 0, "", [turn()]), SUMMARY],
    ["a blank summary", () => Episode.of(0, 0, "   ", [turn()]), SUMMARY],
    ["fewer turns than the range", () => Episode.of(0, 2, "s", [turn(), turn()]), TURNS],
    ["more turns than the range", () => Episode.of(0, 0, "s", [turn(), turn()]), TURNS],
  ];

  for (const [name, call, message] of refused) {
    it(`refuses ${name}`, () => {
      expect(call).toThrow(message);
    });
  }

  it("carries the range", () => {
    Episode.of(0, 2, "s", [turn(), turn(), turn()]);
    Episode.of(0, 0, "s", [turn()]);
    Episode.of(2, 4, "s", [turn(), turn(), turn()]);
  });
});

describe("SessionMap.listing", () => {
  it("refuses no turns", () => {
    expect(() => SessionMap.listing([], 300)).toThrow("SessionMap.listing: there are turns");
  });

  it("refuses a listingChars that is not a positive integer", () => {
    expect(() => SessionMap.listing([turn()], 0)).toThrow("SessionMap.listing: listingChars is a positive integer");
    expect(() => SessionMap.listing([turn()], -1)).toThrow("SessionMap.listing: listingChars is a positive integer");
    expect(() => SessionMap.listing([turn()], 0.5)).toThrow("SessionMap.listing: listingChars is a positive integer");
  });

  it("numbers every turn on two lines", () => {
    SessionMap.listing([turn(), turn(), turn()], 300);
    SessionMap.listing([turn()], 1);
  });

  const listings: [string, () => string, string][] = [
    ["lists one turn", () => SessionMap.listing([turn()], 300), "0: USER: \"vai\"\n   AGENT: \"Fatto.\""],
    ["escapes the newline of the input", () => SessionMap.listing([turn("a\nb")], 300), "0: USER: \"a\\nb\"\n   AGENT: \"Fatto.\""],
    ["cuts the input at the limit", () => SessionMap.listing([turn("abcdef")], 3), "0: USER: \"abc\"\n   AGENT: \"Fat\""],
    ["never splits an emoji", () => SessionMap.listing([turn("😀x")], 1), "0: USER: \"😀\"\n   AGENT: \"F\""],
    ["joins one entry per turn", () => SessionMap.listing([turn(), turn()], 300), "0: USER: \"vai\"\n   AGENT: \"Fatto.\"\n1: USER: \"vai\"\n   AGENT: \"Fatto.\""],
  ];

  for (const [name, call, expected] of listings) {
    it(name, () => {
      expect(call()).toBe(expected);
    });
  }
});

describe("SessionMap.check", () => {
  it("refuses a turnCount that is not a positive integer", () => {
    expect(() => SessionMap.check(0)).toThrow("SessionMap.check: turnCount is a positive integer");
    expect(() => SessionMap.check(-1)).toThrow("SessionMap.check: turnCount is a positive integer");
    expect(() => SessionMap.check(0.5)).toThrow("SessionMap.check: turnCount is a positive integer");
  });

  const NEED_LIST = "need list `episodes`";
  const SUMMARY = "every episode needs a summary";
  const LAST = "the last episode must end at 2";
  const cover = (want: number) => `episodes must cover 0..2 in order with no gap: expected from=${want}`;

  const rows: ReadonlyArray<readonly [unknown, number, string | null]> = [
    [{ episodes: [{ from: 0, to: 2, summary: "s" }] }, 3, null],
    [{ episodes: [{ from: 0, to: 0, summary: "a" }, { from: 1, to: 2, summary: "b" }] }, 3, null],
    [{ episodes: [{ from: 0, to: 0, summary: "a" }, { from: 1, to: 1, summary: "b" }, { from: 2, to: 2, summary: "c" }] }, 3, null],
    [{ episodes: [{ from: 0, to: 0, summary: "s" }] }, 1, null],
    [{ episodes: [{ from: 0, to: 2, summary: "s" }], extra: 1 }, 3, null],
    [null, 3, NEED_LIST],
    [[], 3, NEED_LIST],
    [[{ from: 0, to: 2, summary: "s" }], 3, NEED_LIST],
    [{}, 3, NEED_LIST],
    [{ episodes: "x" }, 3, NEED_LIST],
    [{ episodes: [] }, 3, NEED_LIST],
    [{ episodes: [1] }, 3, cover(0)],
    [{ episodes: [{ from: 1, to: 2, summary: "s" }] }, 3, cover(0)],
    [{ episodes: [{ from: "0", to: 2, summary: "s" }] }, 3, cover(0)],
    [{ episodes: [{ from: 0, to: 1.5, summary: "s" }] }, 3, cover(0)],
    [{ episodes: [{ from: 0, to: "2", summary: "s" }] }, 3, cover(0)],
    [{ episodes: [{ from: 0, summary: "s" }] }, 3, cover(0)],
    [{ episodes: [{ from: 2, to: 1, summary: "s" }] }, 3, cover(0)],
    [{ episodes: [{ from: 0, to: 0, summary: "a" }, { from: 2, to: 2, summary: "b" }] }, 3, cover(1)],
    [{ episodes: [{ from: 0, to: 1, summary: "a" }, { from: 1, to: 2, summary: "b" }] }, 3, cover(2)],
    [{ episodes: [{ from: 0, to: 2 }] }, 3, SUMMARY],
    [{ episodes: [{ from: 0, to: 2, summary: "" }] }, 3, SUMMARY],
    [{ episodes: [{ from: 0, to: 2, summary: "   " }] }, 3, SUMMARY],
    [{ episodes: [{ from: 0, to: 2, summary: 5 }] }, 3, SUMMARY],
    [{ episodes: [{ from: 0, to: 1, summary: "s" }] }, 3, LAST],
    [{ episodes: [{ from: 0, to: 3, summary: "s" }] }, 3, LAST],
    [{ episodes: [{ from: 0, to: 2, summary: "a" }, { from: 3, to: 3, summary: "b" }] }, 3, LAST],
    [{ episodes: [{ from: 1, to: 2 }] }, 3, cover(0)],
  ];

  let i = 0;
  for (const [json, n, expected] of rows) {
    i += 1;
    it(`row ${i}: ${JSON.stringify(json)} with n=${n} gives ${JSON.stringify(expected)}`, () => {
      expect(SessionMap.check(n)(json)).toBe(expected);
    });
  }
});

describe("SessionMap.fromJson", () => {
  it("refuses a session with no turns", () => {
    expect(() => SessionMap.fromJson({ episodes: [{ from: 0, to: 0, summary: "s" }] }, readOf([])))
      .toThrow("SessionMap.fromJson: the session has turns");
  });

  it("refuses a json that fails the check", () => {
    expect(() => SessionMap.fromJson({ episodes: [{ from: 0, to: 1, summary: "s" }] }, readOf([turn(), turn(), turn()])))
      .toThrow("SessionMap.fromJson: the json passes the check");
  });

  it("maps every field", () => {
    const read = readOf([turn(), turn(), turn()]);
    const map = SessionMap.fromJson(
      { episodes: [{ from: 0, to: 0, summary: "a" }, { from: 1, to: 2, summary: "b" }] },
      read,
    );
    expect(map.session()).toBe("s-1");
    expect(map.episodes().length).toBe(2);
    const [first, second] = map.episodes();
    expect(first.from()).toBe(0);
    expect(first.to()).toBe(0);
    expect(first.summary()).toBe("a");
    expect(first.turns().map((t) => t.id())).toEqual([read.turns()[0].id()]);
    expect(second.from()).toBe(1);
    expect(second.to()).toBe(2);
    expect(second.summary()).toBe("b");
    expect(second.turns().map((t) => t.id())).toEqual([read.turns()[1].id(), read.turns()[2].id()]);
  });
});

describe("SessionMap.text", () => {
  it("writes the map", () => {
    const map = SessionMap.fromJson(
      { episodes: [{ from: 0, to: 0, summary: "a" }, { from: 1, to: 2, summary: "b" }] },
      readOf([turn(), turn(), turn()]),
    );
    expect(map.text()).toBe(
      "## The whole session, episode by episode (later episodes can deny claims made earlier)\n- [0-0] a\n- [1-2] b",
    );
  });
});

describe("SessionMap.split", () => {
  it("refuses a session with no turns", async () => {
    await expect(SessionMap.split(readOf([]), extractor)).rejects.toThrow("SessionMap.split: the session has turns");
  });

  it("splits the session when the model answers well", async () => {
    queue.push({ text: GOOD });
    const read = readOf([turn(), turn(), turn()]);
    const { answer, map } = await SessionMap.split(read, extractor);
    expect(answer.isOk()).toBe(true);
    expect(map).not.toBeNull();
    expect(map?.episodes().length).toBe(1);
    const system = seen[0]?.messages.find((m) => m.role === "system");
    expect(system?.content).toBe("You split sessions.");
    const user = seen[0]?.messages.find((m) => m.role === "user");
    expect(user?.content).toBe(SessionMap.listing(read.turns(), 300));
  });

  it("repairs the answer when the json has a gap", async () => {
    queue.push({ text: GAP });
    queue.push({ text: GOOD });
    const { answer, map } = await SessionMap.split(readOf([turn(), turn(), turn()]), extractor);
    expect(answer.isOk()).toBe(true);
    expect(answer.tries()).toBe(2);
    expect(map).not.toBeNull();
    expect(map?.episodes().length).toBe(1);
  });

  it("gives up when the json is still wrong", async () => {
    queue.push({ text: GAP });
    queue.push({ text: GAP });
    const { answer, map } = await SessionMap.split(readOf([turn(), turn(), turn()]), extractor);
    expect(answer.isOk()).toBe(false);
    expect(map).toBeNull();
  });

  it("gives up when the model call fails", async () => {
    queue.push({ status: 400 });
    const { answer, map } = await SessionMap.split(readOf([turn(), turn(), turn()]), extractor);
    expect(answer.isOk()).toBe(false);
    expect(map).toBeNull();
  });
});