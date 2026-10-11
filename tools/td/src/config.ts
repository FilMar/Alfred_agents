import { getApiProvider, getSupportedThinkingLevels } from "@earendil-works/pi-ai";
import type { Api, Model, ModelThinkingLevel } from "@earendil-works/pi-ai";

import { assert, isNonBlank, isPositiveInt, isRecord, isUnit, sameJson } from "../../contract/contract.js";
import { CANDIDATE_KINDS } from "../../tl/src/types.js";
import type { CandidateKind } from "../../tl/src/types.js";

export const DROP_WHEN = ["atLeast", "under"] as const;
export type DropWhen = (typeof DROP_WHEN)[number];

type ModelConnectionState = {
  readonly provider: string;
  readonly id: string;
  readonly api: string;
  readonly baseUrl: string;
  readonly reasoning: boolean;
  readonly compat: Readonly<Record<string, boolean>>;
  readonly contextWindow: number;
  readonly maxTokens: number;
};

export type ModelConnectionJson = ModelConnectionState;

export class ModelConnection {
  readonly #s: ModelConnectionState;

  private constructor(s: ModelConnectionState) {
    assert(isNonBlank(s.provider), () => `ModelConnection: provider is not blank, provider=${JSON.stringify(s.provider)}`);
    assert(isNonBlank(s.id), () => `ModelConnection: id is not blank, id=${JSON.stringify(s.id)}`);
    assert(URL.canParse(s.baseUrl), () => `ModelConnection: baseUrl is a url, baseUrl=${s.baseUrl}`);
    assert(isPositiveInt(s.contextWindow), () => `ModelConnection: contextWindow is a positive integer, contextWindow=${s.contextWindow}`);
    assert(ModelConnection.#fits(s.maxTokens, s.contextWindow), () => `ModelConnection: maxTokens is a positive integer within contextWindow, maxTokens=${s.maxTokens}, contextWindow=${s.contextWindow}`);
    this.#s = Object.freeze({
      provider: s.provider,
      id: s.id,
      api: s.api,
      baseUrl: s.baseUrl,
      reasoning: s.reasoning,
      compat: Object.freeze({ ...s.compat }),
      contextWindow: s.contextWindow,
      maxTokens: s.maxTokens,
    });
  }

  static fromJson(raw: unknown): ModelConnection {
    assert(ModelConnection.#isJson(raw), () => `ModelConnection.fromJson: raw is a model connection with a known api, raw=${JSON.stringify(raw)}`);
    const result = new ModelConnection(raw);
    assert(sameJson(result.toJson(), raw), "ModelConnection.fromJson: the connection writes back the json it came from");
    assert(result.#s.compat !== raw.compat, "ModelConnection.fromJson: the connection does not share compat with raw");
    return result;
  }

  toJson(): ModelConnectionJson {
    const result = { ...this.#s, compat: { ...this.#s.compat } };
    assert(sameJson(result, this.#s), () => `ModelConnection.toJson: the json carries every field of the connection, id=${this.#s.id}`);
    assert(result.compat !== this.#s.compat, "ModelConnection.toJson: the json does not share compat with the connection");
    return result;
  }

  toPiModel(): Model<Api> {
    const result: Model<Api> = {
      id: this.#s.id,
      name: this.#s.id,
      api: this.#s.api,
      provider: this.#s.provider,
      baseUrl: this.#s.baseUrl,
      reasoning: this.#s.reasoning,
      input: ["text"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: this.#s.contextWindow,
      maxTokens: this.#s.maxTokens,
      compat: { ...this.#s.compat },
    };
    assert(this.#carriedBy(result), () => `ModelConnection.toPiModel: the model carries every field of the connection, id=${this.#s.id}`);
    assert(result.compat !== this.#s.compat, "ModelConnection.toPiModel: the model does not share compat with the connection");
    return result;
  }

  static #isJson(raw: unknown): raw is ModelConnectionJson {
    return (
      isRecord(raw) &&
      typeof raw.provider === "string" &&
      typeof raw.id === "string" &&
      typeof raw.api === "string" &&
      getApiProvider(raw.api) !== undefined &&
      typeof raw.baseUrl === "string" &&
      typeof raw.reasoning === "boolean" &&
      isRecord(raw.compat) &&
      Object.values(raw.compat).every((flag) => typeof flag === "boolean") &&
      typeof raw.contextWindow === "number" &&
      typeof raw.maxTokens === "number"
    );
  }

  #carriedBy(model: Model<Api>): boolean {
    return sameJson(
      {
        provider: model.provider,
        id: model.id,
        api: model.api,
        baseUrl: model.baseUrl,
        reasoning: model.reasoning,
        compat: model.compat ?? {},
        contextWindow: model.contextWindow,
        maxTokens: model.maxTokens,
      },
      this.#s,
    );
  }

  static #fits(maxTokens: number, contextWindow: number): boolean {
    return isPositiveInt(maxTokens) && maxTokens <= contextWindow;
  }
}

type RoleState = {
  readonly connection: ModelConnection;
  readonly thinking: ModelThinkingLevel;
  readonly temperature: number;
  readonly system: string;
};

export type RoleJson = Omit<RoleState, "connection"> & { readonly connection: ModelConnectionJson };

export class Role {
  readonly #s: RoleState;

  private constructor(s: RoleState) {
    assert(isNonBlank(s.system), () => `Role: system is not blank, model=${s.connection.toJson().id}`);
    assert(Role.#isTemperature(s.temperature), () => `Role: temperature is finite and not negative, temperature=${s.temperature}`);
    assert(Role.#supports(s.connection, s.thinking), () => `Role: the model supports the thinking level, model=${s.connection.toJson().id}, thinking=${s.thinking}`);
    this.#s = Object.freeze({ connection: s.connection, thinking: s.thinking, temperature: s.temperature, system: s.system });
  }

  static fromJson(raw: unknown): Role {
    assert(Role.#isJson(raw), () => `Role.fromJson: raw is a role, raw=${JSON.stringify(raw)}`);
    const result = new Role({
      ...raw,
      connection: ModelConnection.fromJson(raw.connection),
    });
    assert(sameJson(result.toJson(), raw), "Role.fromJson: the role writes back the json it came from");
    return result;
  }

  toJson(): RoleJson {
    const result = { ...this.#s, connection: this.#s.connection.toJson() };
    assert(sameJson(result, { ...this.#s, connection: this.#s.connection.toJson() }), () => `Role.toJson: the json carries every field of the role, model=${this.#s.connection.toJson().id}`);
    return result;
  }

  connection(): ModelConnection {
    return this.#s.connection;
  }

  thinking(): ModelThinkingLevel {
    return this.#s.thinking;
  }

  temperature(): number {
    return this.#s.temperature;
  }

  system(): string {
    return this.#s.system;
  }

  static #isJson(raw: unknown): raw is RoleJson {
    return (
      isRecord(raw) &&
      isRecord(raw.connection) &&
      typeof raw.thinking === "string" &&
      typeof raw.temperature === "number" &&
      typeof raw.system === "string"
    );
  }

  static #isTemperature(value: number): boolean {
    return Number.isFinite(value) && value >= 0;
  }

  static #supports(connection: ModelConnection, thinking: string): boolean {
    return (getSupportedThinkingLevels(connection.toPiModel()) as readonly string[]).includes(thinking);
  }
}

type CriticCheckState = {
  readonly name: string;
  readonly text: string;
  readonly kind: CandidateKind;
  readonly dropWhen: DropWhen;
  readonly threshold: number;
};

export type CriticCheckJson = CriticCheckState;

export class CriticCheck {
  readonly #s: CriticCheckState;

  private constructor(s: CriticCheckState) {
    assert(isNonBlank(s.name), () => `CriticCheck: name is not blank, name=${JSON.stringify(s.name)}`);
    assert(isNonBlank(s.text), () => `CriticCheck: text is not blank, name=${s.name}`);
    assert(isUnit(s.threshold), () => `CriticCheck: threshold is a number from 0 to 1, name=${s.name}, threshold=${s.threshold}`);
    this.#s = Object.freeze({ name: s.name, text: s.text, kind: s.kind, dropWhen: s.dropWhen, threshold: s.threshold });
  }

  static fromJson(raw: unknown): CriticCheck {
    assert(CriticCheck.#isJson(raw), () => `CriticCheck.fromJson: raw is a critic check, raw=${JSON.stringify(raw)}`);
    const result = new CriticCheck(raw);
    assert(sameJson(result.toJson(), raw), "CriticCheck.fromJson: the check writes back the json it came from");
    return result;
  }

  toJson(): CriticCheckJson {
    const result = { ...this.#s };
    assert(sameJson(result, this.#s), () => `CriticCheck.toJson: the json carries every field of the check, name=${this.#s.name}`);
    return result;
  }

  name(): string {
    return this.#s.name;
  }

  text(): string {
    return this.#s.text;
  }

  kind(): CandidateKind {
    return this.#s.kind;
  }

  drops(p: number): boolean {
    assert(isUnit(p), () => `CriticCheck.drops: p is a number from 0 to 1, check=${this.#s.name}, p=${p}`);
    const result = this.#s.dropWhen === "atLeast" ? p >= this.#s.threshold : p < this.#s.threshold;
    assert(this.#s.dropWhen !== "atLeast" || result === p >= this.#s.threshold, () => `CriticCheck.drops: atLeast drops at the threshold or over it, check=${this.#s.name}, p=${p}, threshold=${this.#s.threshold}`);
    assert(this.#s.dropWhen !== "under" || result === p < this.#s.threshold, () => `CriticCheck.drops: under drops below the threshold, check=${this.#s.name}, p=${p}, threshold=${this.#s.threshold}`);
    return result;
  }

  static #isJson(raw: unknown): raw is CriticCheckJson {
    return (
      isRecord(raw) &&
      typeof raw.name === "string" &&
      typeof raw.text === "string" &&
      (CANDIDATE_KINDS as readonly unknown[]).includes(raw.kind) &&
      (DROP_WHEN as readonly unknown[]).includes(raw.dropWhen) &&
      typeof raw.threshold === "number"
    );
  }
}

type ExtractorState = {
  readonly episodes: Role;
  readonly extract: Role;
  readonly critic: Role;
  readonly novelty: Role;
  readonly checks: readonly CriticCheck[];
  readonly episodeChars: number;
  readonly targetInputChars: number;
  readonly targetOutputChars: number;
  readonly listingChars: number;
  readonly vocabularySize: number;
  readonly topK: number;
};

const SIZES = ["episodeChars", "targetInputChars", "targetOutputChars", "listingChars", "vocabularySize", "topK"] as const;

export type ExtractorJson = Omit<ExtractorState, "episodes" | "extract" | "critic" | "novelty" | "checks"> & {
  readonly episodes: RoleJson;
  readonly extract: RoleJson;
  readonly critic: RoleJson;
  readonly novelty: RoleJson;
  readonly checks: readonly CriticCheckJson[];
};

export class Extractor {
  readonly #s: ExtractorState;

  private constructor(s: ExtractorState) {
    assert(Extractor.#hasKind(s.checks, "note"), () => `Extractor: at least one check for a note, checks=${s.checks.length}`);
    assert(Extractor.#hasKind(s.checks, "rule"), () => `Extractor: at least one check for a rule, checks=${s.checks.length}`);
    assert(Extractor.#hasUniqueNames(s.checks), () => `Extractor: check names are unique, names=${s.checks.map((c) => c.name()).join(",")}`);
    assert(Extractor.#badSize(s) === null, () => `Extractor: every size is a positive integer, bad=${Extractor.#badSize(s)}`);
    this.#s = Object.freeze({
      episodes: s.episodes,
      extract: s.extract,
      critic: s.critic,
      novelty: s.novelty,
      checks: Object.freeze([...s.checks]),
      episodeChars: s.episodeChars,
      targetInputChars: s.targetInputChars,
      targetOutputChars: s.targetOutputChars,
      listingChars: s.listingChars,
      vocabularySize: s.vocabularySize,
      topK: s.topK,
    });
  }

  static fromJson(raw: unknown): Extractor {
    assert(Extractor.#isJson(raw), () => `Extractor.fromJson: raw is an extractor, raw=${JSON.stringify(raw)}`);
    const result = new Extractor({
      ...raw,
      episodes: Role.fromJson(raw.episodes),
      extract: Role.fromJson(raw.extract),
      critic: Role.fromJson(raw.critic),
      novelty: Role.fromJson(raw.novelty),
      checks: raw.checks.map((c) => CriticCheck.fromJson(c)),
    });
    assert(sameJson(result.toJson(), raw), "Extractor.fromJson: the extractor writes back the json it came from");
    return result;
  }

  toJson(): ExtractorJson {
    const result = {
      ...this.#s,
      episodes: this.#s.episodes.toJson(),
      extract: this.#s.extract.toJson(),
      critic: this.#s.critic.toJson(),
      novelty: this.#s.novelty.toJson(),
      checks: this.#s.checks.map((c) => c.toJson()),
    };
    assert(this.#carriedBy(result), "Extractor.toJson: the json carries every field of the extractor");
    return result;
  }

  episodes(): Role {
    return this.#s.episodes;
  }

  extract(): Role {
    return this.#s.extract;
  }

  critic(): Role {
    return this.#s.critic;
  }

  novelty(): Role {
    return this.#s.novelty;
  }

  checksFor(kind: CandidateKind): readonly CriticCheck[] {
    const result = this.#s.checks.filter((c) => c.kind() === kind);
    assert(Extractor.#allOfKind(result, kind), () => `Extractor.checksFor: every check is for the kind asked, kind=${kind}`);
    assert(result.length === this.#countOf(kind), () => `Extractor.checksFor: no check of the kind is missing, kind=${kind}, result=${result.length}`);
    return result;
  }

  episodeChars(): number {
    return this.#s.episodeChars;
  }

  targetInputChars(): number {
    return this.#s.targetInputChars;
  }

  targetOutputChars(): number {
    return this.#s.targetOutputChars;
  }

  listingChars(): number {
    return this.#s.listingChars;
  }

  vocabularySize(): number {
    return this.#s.vocabularySize;
  }

  topK(): number {
    return this.#s.topK;
  }

  #carriedBy(json: ExtractorJson): boolean {
    return sameJson(json, {
      episodes: this.#s.episodes.toJson(),
      extract: this.#s.extract.toJson(),
      critic: this.#s.critic.toJson(),
      novelty: this.#s.novelty.toJson(),
      checks: this.#s.checks.map((c) => c.toJson()),
      episodeChars: this.#s.episodeChars,
      targetInputChars: this.#s.targetInputChars,
      targetOutputChars: this.#s.targetOutputChars,
      listingChars: this.#s.listingChars,
      vocabularySize: this.#s.vocabularySize,
      topK: this.#s.topK,
    });
  }

  static #isJson(raw: unknown): raw is ExtractorJson {
    return (
      isRecord(raw) &&
      isRecord(raw.episodes) &&
      isRecord(raw.extract) &&
      isRecord(raw.critic) &&
      isRecord(raw.novelty) &&
      Array.isArray(raw.checks) &&
      SIZES.every((k) => typeof raw[k] === "number")
    );
  }

  static #badSize(s: ExtractorState): string | null {
    return SIZES.find((k) => !isPositiveInt(s[k])) ?? null;
  }

  #countOf(kind: CandidateKind): number {
    return this.#s.checks.filter((c) => c.kind() === kind).length;
  }

  static #allOfKind(checks: readonly CriticCheck[], kind: CandidateKind): boolean {
    return checks.every((c) => c.kind() === kind);
  }

  static #hasKind(checks: readonly CriticCheck[], kind: CandidateKind): boolean {
    return checks.some((c) => c.kind() === kind);
  }

  static #hasUniqueNames(checks: readonly CriticCheck[]): boolean {
    return new Set(checks.map((c) => c.name())).size === checks.length;
  }
}
