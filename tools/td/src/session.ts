import { allNonBlank, assert, isNonBlank } from "../../common/contract.js";
import { fetchContents, fetchExchanges } from "../../tl/src/client.js";
import { TIMESTAMP_SHAPE } from "../../tl/src/types.js";
import type { Contents, Exchange } from "../../tl/src/types.js";

export type Noise = "task-notification" | "harness-error" | "delegated";

// Longest session seen: 210 exchanges.
export const PENDING_CAP = 1000;

type TurnState = {
  readonly exchange: Exchange;
  readonly contents: Contents;
};

export class Turn {
  readonly #s: TurnState;

  private constructor(s: TurnState) {
    this.#s = Object.freeze(s);
  }

  static of(exchange: Exchange, contents: Contents): Turn {
    assert(contents.exchange_id === exchange.id, () => `Turn.of: the contents belong to the exchange, id=${exchange.id}, contents=${contents.exchange_id}`);
    assert(TIMESTAMP_SHAPE.test(exchange.timestamp), () => `Turn.of: the timestamp is ISO-8601 UTC, got=${exchange.timestamp}`);
    return new Turn({ exchange, contents });
  }

  noise(): Noise | null {
    let result: Noise | null = null;
    if (this.#s.exchange.kind === "subtask") {
      result = "delegated";
    } else if (this.#s.exchange.meta?.trigger === "task-notification") {
      result = "task-notification";
    } else if (this.#s.contents.output.trimStart().startsWith("API Error:")) {
      result = "harness-error";
    }
    assert(result !== "delegated" || this.#s.exchange.kind === "subtask", "Turn.noise: a delegated turn is a subtask exchange");
    assert(result !== "task-notification" || this.#s.exchange.meta?.trigger === "task-notification", "Turn.noise: a task notification has that trigger");
    assert(result !== "harness-error" || this.#s.contents.output.trimStart().startsWith("API Error:"), "Turn.noise: a harness error is an output that starts with API Error:");
    return result;
  }

  id(): string {
    return this.#s.exchange.id;
  }

  session(): string {
    return this.#s.exchange.session;
  }

  timestamp(): string {
    return this.#s.exchange.timestamp;
  }

  actor(): string {
    return this.#s.exchange.actor;
  }

  input(): string {
    return this.#s.contents.input;
  }

  output(): string {
    return this.#s.contents.output;
  }
}

type SessionReadState = {
  readonly session: string;
  readonly turns: readonly Turn[];
  readonly noise: readonly Turn[];
  readonly earlier: readonly Turn[];
};

export class SessionRead {
  readonly #s: SessionReadState;

  private constructor(s: SessionReadState) {
    this.#s = Object.freeze(s);
  }

  static async read(session: string): Promise<SessionRead> {
    assert(isNonBlank(session), "SessionRead.read: the session is not blank");
    const pending = await SessionRead.#fetch(session, false);
    const turns: Turn[] = [];
    for (const exchange of pending) {
      turns.push(await SessionRead.#turn(exchange));
    }
    const earlier: Turn[] = [];
    for (const exchange of await SessionRead.#fetch(session, true)) {
      const turn = await SessionRead.#turn(exchange);
      if (turn.noise() === null) earlier.push(turn);
    }
    return SessionRead.of(session, turns, earlier);
  }

  static of(session: string, turns: readonly Turn[], earlier: readonly Turn[] = []): SessionRead {
    assert(SessionRead.#belong(turns, session), () => `SessionRead.of: every turn belongs to the session, session=${session}`);
    const earlierInTime = SessionRead.#earlierOf(session, turns, earlier);
    const sorted = SessionRead.#inTime(turns);
    const result = new SessionRead({
      session,
      turns: sorted.filter((t) => t.noise() === null),
      noise: sorted.filter((t) => t.noise() !== null),
      earlier: earlierInTime,
    });
    assert(SessionRead.#sorted(result.#s.turns), "SessionRead.of: the turns are sorted by time");
    return result;
  }

  session(): string {
    return this.#s.session;
  }

  turns(): readonly Turn[] {
    return this.#s.turns;
  }

  noise(): readonly Turn[] {
    return this.#s.noise;
  }

  earlier(): readonly Turn[] {
    return this.#s.earlier;
  }

  whole(): readonly Turn[] {
    const result = SessionRead.#inTime([...this.#s.earlier, ...this.#s.turns]);
    assert(SessionRead.#sorted(result), "SessionRead.whole: the turns are sorted by time");
    return result;
  }

  isPending(turn: Turn): boolean {
    const result = this.#s.turns.includes(turn);
    assert(result || this.#s.earlier.includes(turn), "SessionRead.isPending: a turn not pending is an earlier turn of the session");
    return result;
  }

  static async #fetch(session: string, distilled: boolean): Promise<readonly Exchange[]> {
    const result = await fetchExchanges({ session, distilled, limit: PENDING_CAP });
    assert(result.length < PENDING_CAP, () => `SessionRead.#fetch: the session holds fewer exchanges than the cap, distilled=${distilled}, got=${result.length}`);
    assert(SessionRead.#ofSession(result, session), "SessionRead.#fetch: every exchange belongs to the session");
    assert(SessionRead.#allAre(result, distilled), () => `SessionRead.#fetch: every exchange has the distilled state asked, distilled=${distilled}`);
    return result;
  }

  static #earlierOf(session: string, turns: readonly Turn[], earlier: readonly Turn[]): readonly Turn[] {
    assert(SessionRead.#belong(earlier, session), () => `SessionRead.of: every turn belongs to the session, session=${session}`);
    assert(SessionRead.#unique([...turns, ...earlier]), "SessionRead.of: turn ids are unique, earlier turns included");
    assert(SessionRead.#noNoise(earlier), "SessionRead.of: an earlier turn is not noise");
    return SessionRead.#inTime(earlier);
  }

  static #noNoise(turns: readonly Turn[]): boolean {
    return turns.every((t) => t.noise() === null);
  }

  static #inTime(turns: readonly Turn[]): readonly Turn[] {
    const key = (t: Turn): string => `${t.timestamp()} ${t.id()}`;
    return [...turns].sort((a, b) => (key(a) < key(b) ? -1 : 1));
  }

  static async #turn(exchange: Exchange): Promise<Turn> {
    return Turn.of(exchange, await fetchContents(exchange.id, false));
  }

  static #belong(turns: readonly Turn[], session: string): boolean {
    return turns.every((t) => t.session() === session);
  }

  static #ofSession(exchanges: readonly Exchange[], session: string): boolean {
    return exchanges.every((e) => e.session === session);
  }

  static #allAre(exchanges: readonly Exchange[], distilled: boolean): boolean {
    return exchanges.every((e) => (e.distilled !== undefined) === distilled);
  }

  static #unique(turns: readonly Turn[]): boolean {
    return new Set(turns.map((t) => t.id())).size === turns.length;
  }

  static #sorted(turns: readonly Turn[]): boolean {
    return turns.every((t, i) => i === 0 || turns[i - 1].timestamp() <= t.timestamp());
  }
}

export const PENDING_SESSIONS_CAP = 100000;

export async function pendingSessions(): Promise<readonly string[]> {
  let result: readonly string[];
  const exchanges = await fetchExchanges({ distilled: false, limit: PENDING_SESSIONS_CAP });
  assert(exchanges.length < PENDING_SESSIONS_CAP, () => `pendingSessions: the store holds fewer pending exchanges than the cap, got=${exchanges.length}`);
  result = [...new Set([...exchanges].reverse().map((exchange) => exchange.session))];
  assert(allNonBlank(result), "pendingSessions: every session id is not blank");
  return result;
}

