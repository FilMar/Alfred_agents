import { assert, isNonBlank, isPositiveInt, isRecord } from "../../contract/contract.js";
import type { Extractor } from "./config.js";
import { ModelCaller } from "./model_caller.js";
import type { JsonCheck, ModelAnswer } from "./model_caller.js";
import type { SessionRead, Turn } from "./session.js";

const MAP_HEADER = "## The whole session, episode by episode (later episodes can deny claims made earlier)";

export function cut(text: string, chars: number): string {
  assert(isPositiveInt(chars), () => `cut: chars is a positive integer, got=${chars}`);
  const result = Array.from(text).slice(0, chars).join("");
  assert(Array.from(result).length <= chars, "cut: at most chars code points");
  assert(text.startsWith(result), "cut: the cut is a prefix of the text");
  return result;
}

type EpisodeState = {
  readonly from: number;
  readonly to: number;
  readonly summary: string;
  readonly turns: readonly Turn[];
};

export class Episode {
  readonly #s: EpisodeState;

  private constructor(s: EpisodeState) {
    this.#s = Object.freeze(s);
  }

  static of(from: number, to: number, summary: string, turns: readonly Turn[]): Episode {
    assert(Episode.#isRange(from, to), () => `Episode.of: from and to are indices with from <= to, from=${from}, to=${to}`);
    assert(isNonBlank(summary), "Episode.of: the summary is not blank");
    assert(turns.length === to - from + 1, () => `Episode.of: one turn per index, expected=${to - from + 1}, got=${turns.length}`);
    const result = new Episode({ from, to, summary, turns: [...turns] });
    assert(result.to() - result.from() + 1 === result.turns().length, "Episode.of: the episode carries the range");
    return result;
  }

  from(): number {
    return this.#s.from;
  }

  to(): number {
    return this.#s.to;
  }

  summary(): string {
    return this.#s.summary;
  }

  turns(): readonly Turn[] {
    return this.#s.turns;
  }

  static #isRange(from: number, to: number): boolean {
    return Number.isInteger(from) && Number.isInteger(to) && from >= 0 && to >= from;
  }
}

export type SessionSplit = { readonly answer: ModelAnswer; readonly map: SessionMap | null };

type SessionMapState = {
  readonly session: string;
  readonly episodes: readonly Episode[];
};

export class SessionMap {
  readonly #s: SessionMapState;

  private constructor(s: SessionMapState) {
    this.#s = Object.freeze(s);
  }

  static async split(read: SessionRead, extractor: Extractor): Promise<SessionSplit> {
    assert(read.turns().length > 0, () => `SessionMap.split: the session has turns, session=${read.session()}`);
    const prompt = SessionMap.listing(read.turns(), extractor.listingChars());
    const answer = await ModelCaller.ask(extractor.episodes(), prompt, SessionMap.check(read.turns().length));
    const map = answer.isOk() ? SessionMap.fromJson(answer.json(), read) : null;
    const result: SessionSplit = { answer, map };
    assert((result.map !== null) === result.answer.isOk(), "SessionMap.split: a map exactly when the answer is ok");
    assert(result.map === null || result.map.session() === read.session(), "SessionMap.split: the map is of the session read");
    return result;
  }

  static listing(turns: readonly Turn[], listingChars: number): string {
    assert(turns.length > 0, "SessionMap.listing: there are turns");
    assert(isPositiveInt(listingChars), () => `SessionMap.listing: listingChars is a positive integer, got=${listingChars}`);
    const result = turns
      .map((t, k) => `${k}: USER: ${JSON.stringify(cut(t.input(), listingChars))}\n   AGENT: ${JSON.stringify(cut(t.output(), listingChars))}`)
      .join("\n");
    assert(result.split("\n").length === 2 * turns.length, "SessionMap.listing: two lines per turn");
    assert(result.startsWith("0: USER: "), "SessionMap.listing: the first turn is number 0");
    return result;
  }

  static check(turnCount: number): JsonCheck {
    assert(isPositiveInt(turnCount), () => `SessionMap.check: turnCount is a positive integer, got=${turnCount}`);
    const result: JsonCheck = (json) => SessionMap.#badEpisodes(json, turnCount);
    assert(typeof result === "function", "SessionMap.check: the check is a function");
    return result;
  }

  static fromJson(json: unknown, read: SessionRead): SessionMap {
    assert(read.turns().length > 0, () => `SessionMap.fromJson: the session has turns, session=${read.session()}`);
    assert(SessionMap.check(read.turns().length)(json) === null, "SessionMap.fromJson: the json passes the check");
    const episodes = (json as { episodes: readonly { from: number; to: number; summary: string }[] }).episodes;
    const result = new SessionMap({
      session: read.session(),
      episodes: episodes.map((e) => Episode.of(e.from, e.to, e.summary, read.turns().slice(e.from, e.to + 1))),
    });
    assert(result.session() === read.session(), "SessionMap.fromJson: the map is of the session read");
    assert(SessionMap.#covers(result.episodes(), read.turns().length), "SessionMap.fromJson: the episodes cover every turn in order");
    return result;
  }

  session(): string {
    return this.#s.session;
  }

  episodes(): readonly Episode[] {
    return this.#s.episodes;
  }

  text(): string {
    const result = [MAP_HEADER, ...this.#s.episodes.map((e) => `- [${e.from()}-${e.to()}] ${e.summary()}`)].join("\n");
    assert(result.startsWith(`${MAP_HEADER}\n`), "SessionMap.text: the text starts with the header");
    assert(this.#namesEvery(result), "SessionMap.text: the text names every episode");
    return result;
  }

  static #badEpisodes(json: unknown, turnCount: number): string | null {
    const episodes: readonly unknown[] | null =
      isRecord(json) && Array.isArray(json.episodes) && json.episodes.length > 0 ? json.episodes : null;
    let result: string | null = null;
    if (episodes === null) {
      result = `need list \`episodes\``;
    } else {
      let want = 0;
      for (const e of episodes) {
        if (!isRecord(e) || e.from !== want || !Number.isInteger(e.to) || Number(e.to) < Number(e.from)) {
          result = `episodes must cover 0..${turnCount - 1} in order with no gap: expected from=${want}`;
          break;
        }
        if (typeof e.summary !== "string" || !isNonBlank(e.summary)) {
          result = "every episode needs a summary";
          break;
        }
        want = Number(e.to) + 1;
      }
      if (result === null && want !== turnCount) {
        result = `the last episode must end at ${turnCount - 1}`;
      }
    }
    assert(result === null || isNonBlank(result), "SessionMap.#badEpisodes: an error is not blank");
    return result;
  }

  static #covers(episodes: readonly Episode[], turnCount: number): boolean {
    let next = 0;
    let inOrder = true;
    for (const e of episodes) {
      inOrder = inOrder && e.from() === next;
      next = e.to() + 1;
    }
    return inOrder && next === turnCount;
  }

  #namesEvery(text: string): boolean {
    return this.#s.episodes.every((e) => text.includes(`- [${e.from()}-${e.to()}] ${e.summary()}`));
  }
}
