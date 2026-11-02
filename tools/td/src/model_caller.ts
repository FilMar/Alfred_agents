import { completeSimple, getEnvApiKey } from "@earendil-works/pi-ai";
import type { AssistantMessage, Message, Usage } from "@earendil-works/pi-ai";

import { assert, isNonBlank, isPositiveInt } from "../../common/contract.js";
import type { Role } from "./config.js";

export type JsonCheck = (json: unknown) => string | null;

// The answer, then one fix.
export const MAX_TRIES = 2;

export const CALL_TIMEOUT_MS = 300_000;

// Ollama wants a key, any key.
const NO_KEY = "none";

type ModelTokensState = {
  readonly input: number;
  readonly output: number;
  readonly cacheRead: number;
  readonly cacheWrite: number;
};

export class ModelTokens {
  readonly #s: ModelTokensState;

  private constructor(s: ModelTokensState) {
    this.#s = Object.freeze(s);
  }

  static zero(): ModelTokens {
    return new ModelTokens({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0 });
  }

  static of(usage: Usage): ModelTokens {
    assert(ModelTokens.#isCount(usage.input), () => `ModelTokens.of: input is a count, got=${usage.input}`);
    assert(ModelTokens.#isCount(usage.output), () => `ModelTokens.of: output is a count, got=${usage.output}`);
    assert(ModelTokens.#isCount(usage.cacheRead), () => `ModelTokens.of: cacheRead is a count, got=${usage.cacheRead}`);
    assert(ModelTokens.#isCount(usage.cacheWrite), () => `ModelTokens.of: cacheWrite is a count, got=${usage.cacheWrite}`);
    return new ModelTokens({ input: usage.input, output: usage.output, cacheRead: usage.cacheRead, cacheWrite: usage.cacheWrite });
  }

  plus(other: ModelTokens): ModelTokens {
    return new ModelTokens({
      input: this.input() + other.input(),
      output: this.output() + other.output(),
      cacheRead: this.cacheRead() + other.cacheRead(),
      cacheWrite: this.cacheWrite() + other.cacheWrite(),
    });
  }

  input(): number {
    return this.#s.input;
  }

  output(): number {
    return this.#s.output;
  }

  cacheRead(): number {
    return this.#s.cacheRead;
  }

  cacheWrite(): number {
    return this.#s.cacheWrite;
  }

  total(): number {
    return this.#s.input + this.#s.output + this.#s.cacheRead + this.#s.cacheWrite;
  }

  static #isCount(value: number): boolean {
    return Number.isInteger(value) && value >= 0;
  }
}

type ModelAnswerState = {
  readonly json: unknown;
  readonly failure: string | null;
  readonly tries: number;
  readonly tokens: ModelTokens;
};

export class ModelAnswer {
  readonly #s: ModelAnswerState;

  private constructor(s: ModelAnswerState) {
    this.#s = Object.freeze(s);
  }

  static accepted(json: unknown, tries: number, tokens: ModelTokens): ModelAnswer {
    assert(ModelAnswer.#isTries(tries), () => `ModelAnswer.accepted: tries is from 1 to MAX_TRIES, got=${tries}`);
    assert(json !== undefined, "ModelAnswer.accepted: the json is given");
    return new ModelAnswer({ json, failure: null, tries, tokens });
  }

  static rejected(failure: string, tries: number, tokens: ModelTokens): ModelAnswer {
    assert(ModelAnswer.#isTries(tries), () => `ModelAnswer.rejected: tries is from 1 to MAX_TRIES, got=${tries}`);
    assert(isNonBlank(failure), "ModelAnswer.rejected: the failure is not blank");
    return new ModelAnswer({ json: undefined, failure, tries, tokens });
  }

  isOk(): boolean {
    return this.#s.failure === null;
  }

  json(): unknown {
    assert(this.isOk(), () => `ModelAnswer.json: only an ok answer has json, failure=${this.#s.failure}`);
    return this.#s.json;
  }

  failure(): string | null {
    return this.#s.failure;
  }

  tries(): number {
    return this.#s.tries;
  }

  tokens(): ModelTokens {
    return this.#s.tokens;
  }

  static #isTries(tries: number): boolean {
    return Number.isInteger(tries) && tries >= 1 && tries <= MAX_TRIES;
  }
}

export class ModelCaller {
  static async ask(role: Role, prompt: string, check: JsonCheck, timeoutMs = CALL_TIMEOUT_MS): Promise<ModelAnswer> {
    assert(isNonBlank(prompt), "ModelCaller.ask: the prompt is not blank");
    assert(isPositiveInt(timeoutMs), () => `ModelCaller.ask: timeoutMs is a positive integer, got=${timeoutMs}`);
    const messages: Message[] = [{ role: "user", content: prompt, timestamp: Date.now() }];
    let tokens = ModelTokens.zero();
    let result: ModelAnswer | null = null;
    let lastError: string | null = null;
    for (let tries = 1; tries <= MAX_TRIES; tries++) {
      const reply = await ModelCaller.#send(role, messages, timeoutMs);
      tokens = tokens.plus(ModelTokens.of(reply.usage));
      if (reply.stopReason === "error" || reply.stopReason === "aborted") {
        result = ModelAnswer.rejected(reply.errorMessage ?? "the model call failed", tries, tokens);
        break;
      }
      const json = ModelCaller.extractJson(ModelCaller.#textOf(reply));
      const error = json === null ? "no JSON object or array in the answer" : check(json);
      if (error === null) {
        result = ModelAnswer.accepted(json, tries, tokens);
        break;
      }
      lastError = error;
      messages.push(reply);
      messages.push({ role: "user", content: ModelCaller.#correction(error), timestamp: Date.now() });
    }
    if (result === null) {
      const failure = `the JSON is still wrong after ${MAX_TRIES} tries: ${lastError}`;
      result = ModelAnswer.rejected(failure, MAX_TRIES, tokens);
    }
    return result;
  }

  static extractJson(text: string): unknown {
    const fence = /```(?:json)?\n([\s\S]*?)```/.exec(text);
    const body = fence === null ? text : fence[1];
    const objectAt = body.indexOf("{");
    const arrayAt = body.indexOf("[");
    const objectFirst = objectAt !== -1 && (arrayAt === -1 || objectAt < arrayAt);
    const start = objectFirst ? objectAt : arrayAt;
    const end = objectFirst ? body.lastIndexOf("}") : body.lastIndexOf("]");
    let result: unknown = null;
    if (start !== -1 && end > start) {
      try {
        result = JSON.parse(body.slice(start, end + 1));
      } catch {
        result = null;
      }
    }
    return result;
  }

  static async #send(role: Role, messages: readonly Message[], timeoutMs: number): Promise<AssistantMessage> {
    assert(messages.length % 2 === 1, () => `ModelCaller.#send: the last message is the user's, count=${messages.length}`);
    const connection = role.connection();
    const thinking = role.thinking();
    const apiKey = ModelCaller.#apiKey(connection.toJson().provider);
    const temperature = role.temperature();
    const signal = AbortSignal.timeout(timeoutMs);
    const options = thinking === "off"
      ? { apiKey, temperature, signal }
      : { apiKey, temperature, signal, reasoning: thinking };
    const result = await completeSimple(
      connection.toPiModel(),
      { systemPrompt: role.system(), messages: [...messages] },
      options,
    );
    assert(result.role === "assistant", "ModelCaller.#send: the reply is the assistant's");
    return result;
  }

  static #correction(error: string): string {
    assert(isNonBlank(error), "ModelCaller.#correction: the error is not blank");
    return `Your JSON is wrong: ${error}. Answer again with only the corrected JSON.`;
  }

  static #apiKey(provider: string): string {
    const result = getEnvApiKey(provider) || NO_KEY;
    assert(isNonBlank(result), () => `ModelCaller.#apiKey: the key is not blank, provider=${provider}`);
    return result;
  }

  static #textOf(reply: AssistantMessage): string {
    let result = "";
    for (const part of reply.content) {
      if (part.type === "text") {
        result += part.text;
      }
    }
    return result;
  }
}
