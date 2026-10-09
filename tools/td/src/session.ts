import { assert, isNonBlank } from "../../contract/contract.js";
import { fetchContents, fetchExchanges } from "../../tl/src/client.js";
import { TIMESTAMP_SHAPE } from "../../tl/src/types.js";
import type { Contents, Exchange } from "../../tl/src/types.js";

export type Noise = "task-notification" | "harness-error";

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
    const result = new Turn({ exchange, contents });
    assert(result.id() === exchange.id, "Turn.of: the turn carries the exchange id");
    assert(result.output() === contents.output, "Turn.of: the turn carries the contents");
    return result;
  }

  noise(): Noise | null {
    let result: Noise | null = null;
    if (this.#s.exchange.meta?.trigger === "task-notification") {
      result = "task-notification";
    } else if (this.#s.contents.output.trimStart().startsWith("API Error:")) {
      result = "harness-error";
    }
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
};

export class SessionRead {
  readonly #s: SessionReadState;

  private constructor(s: SessionReadState) {
    this.#s = Object.freeze(s);
  }

  static async read(session: string): Promise<SessionRead> {
    assert(isNonBlank(session), "SessionRead.read: the session is not blank");
    const pending = await SessionRead.#pending(session);
    const turns: Turn[] = [];
    for (const exchange of pending) {
      turns.push(await SessionRead.#turn(exchange));
    }
    const result = SessionRead.of(session, turns);
    assert(result.session() === session, "SessionRead.read: the result is the session asked");
    return result;
  }

  static of(session: string, turns: readonly Turn[]): SessionRead {
    assert(SessionRead.#belong(turns, session), () => `SessionRead.of: every turn belongs to the session, session=${session}`);
    assert(SessionRead.#unique(turns), "SessionRead.of: turn ids are unique");
    const key = (t: Turn): string => `${t.timestamp()} ${t.id()}`;
    const sorted = [...turns].sort((a, b) => (key(a) < key(b) ? -1 : 1));
    const result = new SessionRead({
      session,
      turns: sorted.filter((t) => t.noise() === null),
      noise: sorted.filter((t) => t.noise() !== null),
    });
    assert(result.#s.turns.length + result.#s.noise.length === turns.length, "SessionRead.of: each turn lands in one list");
    assert(result.#splitByNoise(), "SessionRead.of: a turn is kept exactly when it is not noise");
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

  static async #pending(session: string): Promise<readonly Exchange[]> {
    const result = await fetchExchanges({ session, distilled: false, limit: PENDING_CAP });
    assert(result.length < PENDING_CAP, () => `SessionRead.#pending: the session holds fewer pending exchanges than the cap, got=${result.length}`);
    assert(SessionRead.#ofSession(result, session), "SessionRead.#pending: every exchange belongs to the session");
    assert(SessionRead.#undistilled(result), "SessionRead.#pending: every exchange is still pending");
    return result;
  }

  static async #turn(exchange: Exchange): Promise<Turn> {
    const contents = await fetchContents(exchange.id, false);
    const result = Turn.of(exchange, contents);
    assert(result.id() === exchange.id, "SessionRead.#turn: the turn is the exchange given");
    return result;
  }

  static #belong(turns: readonly Turn[], session: string): boolean {
    return turns.every((t) => t.session() === session);
  }

  #splitByNoise(): boolean {
    return this.#s.turns.every((t) => t.noise() === null) && this.#s.noise.every((t) => t.noise() !== null);
  }

  static #ofSession(exchanges: readonly Exchange[], session: string): boolean {
    return exchanges.every((e) => e.session === session);
  }

  static #undistilled(exchanges: readonly Exchange[]): boolean {
    return exchanges.every((e) => e.distilled === undefined);
  }

  static #unique(turns: readonly Turn[]): boolean {
    return new Set(turns.map((t) => t.id())).size === turns.length;
  }

  static #sorted(turns: readonly Turn[]): boolean {
    return turns.every((t, i) => i === 0 || turns[i - 1].timestamp() <= t.timestamp());
  }
}
