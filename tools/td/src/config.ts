import type { Api, Model, Provider } from "@earendil-works/pi-ai";

import { assert } from "../../tb/src/types.js";
import { CANDIDATE_KINDS } from "../../tl/src/types.js";
import type { CandidateKind } from "../../tl/src/types.js";

export const THINKS = ["minimal", "low", "medium", "high"] as const;
export type Think = (typeof THINKS)[number];

export const DROPS = ["above", "below"] as const;
export type Drops = (typeof DROPS)[number];

export type ModelSpecJson = {
  readonly provider: string;
  readonly id: string;
  readonly api: string;
  readonly baseUrl: string;
  readonly reasoning: boolean;
  readonly compat: Readonly<Record<string, boolean>>;
};

export type QuestionJson = {
  readonly name: string;
  readonly text: string;
  readonly kind: CandidateKind;
  readonly drops: Drops;
  readonly threshold: number;
};

export type CallJson = {
  readonly model: ModelSpecJson;
  readonly think: Think;
  readonly temperature: number;
  readonly system: string;
};

export type ExtractorConfigJson = {
  readonly episodes: CallJson;
  readonly extract: CallJson;
  readonly critic: CallJson;
  readonly novelty: CallJson;
  readonly questions: readonly QuestionJson[];
  readonly episodeChars: number;
  readonly topK: number;
};

export class Probability {
  readonly #s: { readonly value: number };

  private constructor(s: { readonly value: number }) {
    this.#s = s;
  }

  static of(value: number): Probability {
    assert(Number.isFinite(value), `Probability.of: value is a finite number, value=${value}`);
    assert(value >= 0, `Probability.of: value is at least 0, value=${value}`);
    assert(value <= 1, `Probability.of: value is at most 1, value=${value}`);
    const result = new Probability({ value });
    assert(result.value() === value, "Probability.of: the value is kept");
    return result;
  }

  value(): number {
    const result = this.#s.value;
    assert(isUnit(result), "Probability.value: the value is between 0 and 1");
    return result;
  }
}

type QuestionState = {
  readonly name: string;
  readonly text: string;
  readonly kind: CandidateKind;
  readonly drops: Drops;
  readonly threshold: Probability;
};

export class Question {
  readonly #s: QuestionState;

  private constructor(s: QuestionState) {
    this.#s = s;
  }

  static new(name: string, text: string, kind: CandidateKind, drops: Drops, threshold: Probability): Question {
    assert(isNonBlank(name), `Question.new: name is not blank, name=${JSON.stringify(name)}`);
    assert(isNonBlank(text), `Question.new: text is not blank, name=${name}`);
    const result = new Question({ name, text, kind, drops, threshold });
    assert(isQuestionOf(result, name, text, kind, drops, threshold), "Question.new: the question keeps its arguments");
    return result;
  }

  name(): string {
    const result = this.#s.name;
    assert(isNonBlank(result), "Question.name: the name is not blank");
    return result;
  }

  text(): string {
    const result = this.#s.text;
    assert(isNonBlank(result), "Question.text: the text is not blank");
    return result;
  }

  kind(): CandidateKind {
    const result = this.#s.kind;
    assert(isCandidateKind(result), "Question.kind: the kind is note or rule");
    return result;
  }

  drops(): Drops {
    const result = this.#s.drops;
    assert(isDrops(result), "Question.drops: the side is above or below");
    return result;
  }

  threshold(): Probability {
    const result = this.#s.threshold;
    assert(result instanceof Probability, "Question.threshold: the threshold is a probability");
    return result;
  }

  fires(answer: Probability): boolean {
    const result = firesBySpec(this.#s.drops, answer.value(), this.#s.threshold.value());
    assert(result === firesBySpec(this.#s.drops, answer.value(), this.#s.threshold.value()), "Question.fires: above drops at the threshold or over, below drops under it");
    return result;
  }

  toJson(): QuestionJson {
    const result = { name: this.#s.name, text: this.#s.text, kind: this.#s.kind, drops: this.#s.drops, threshold: this.#s.threshold.value() };
    assert(isQuestionJsonOf(this.#s, result), "Question.toJson: the json carries every field of the question");
    return result;
  }

  static fromJson(raw: unknown): Question {
    assert(isQuestionJson(raw), `Question.fromJson: raw is a question, raw=${JSON.stringify(raw)}`);
    const result = new Question({ name: raw.name, text: raw.text, kind: raw.kind, drops: raw.drops, threshold: Probability.of(raw.threshold) });
    assert(sameJson(result.toJson(), raw), "Question.fromJson: the question writes back the json it came from");
    return result;
  }
}

type ModelSpecState = {
  readonly provider: string;
  readonly id: string;
  readonly api: string;
  readonly baseUrl: string;
  readonly reasoning: boolean;
  readonly compat: Readonly<Record<string, boolean>>;
};

export class ModelSpec {
  readonly #s: ModelSpecState;

  private constructor(s: ModelSpecState) {
    this.#s = s;
  }

  static new(
    provider: string,
    id: string,
    api: string,
    baseUrl: string,
    reasoning: boolean,
    compat: Readonly<Record<string, boolean>>,
  ): ModelSpec {
    assert(isNonBlank(provider), `ModelSpec.new: provider is not blank, provider=${JSON.stringify(provider)}`);
    assert(isNonBlank(id), `ModelSpec.new: id is not blank, id=${JSON.stringify(id)}`);
    assert(isNonBlank(api), `ModelSpec.new: api is not blank, api=${JSON.stringify(api)}`);
    assert(URL.canParse(baseUrl), `ModelSpec.new: baseUrl is a url, baseUrl=${baseUrl}`);
    const result = new ModelSpec({ provider, id, api, baseUrl, reasoning, compat });
    assert(isModelSpecOf(result, { provider, id, api, baseUrl, reasoning, compat }), "ModelSpec.new: the model keeps its arguments");
    return result;
  }

  provider(): string {
    const result = this.#s.provider;
    assert(isNonBlank(result), "ModelSpec.provider: the provider is not blank");
    return result;
  }

  id(): string {
    const result = this.#s.id;
    assert(isNonBlank(result), "ModelSpec.id: the id is not blank");
    return result;
  }

  toPiModel(): Model<Api> {
    const result = {
      id: this.#s.id,
      name: this.#s.id,
      api: this.#s.api as Api,
      provider: this.#s.provider as Provider,
      baseUrl: this.#s.baseUrl,
      reasoning: this.#s.reasoning,
      input: ["text"] as ("text" | "image")[],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 128000,
      maxTokens: 4096,
      compat: this.#s.compat as any,
    };
    assert(result.id === this.#s.id, "ModelSpec.toPiModel: the id is kept");
    assert(result.provider === this.#s.provider, "ModelSpec.toPiModel: the provider is kept");
    assert(result.reasoning === this.#s.reasoning, "ModelSpec.toPiModel: the reasoning flag is kept");
    assert(sameJson(result.compat ?? {}, this.#s.compat), "ModelSpec.toPiModel: the compat flags are kept");
    return result;
  }

  toJson(): ModelSpecJson {
    const result = { ...this.#s };
    assert(sameJson(result, this.#s), "ModelSpec.toJson: the json carries every field of the model");
    return result;
  }

  static fromJson(raw: unknown): ModelSpec {
    assert(isModelSpecJson(raw), `ModelSpec.fromJson: raw is a model spec, raw=${JSON.stringify(raw)}`);
    const result = new ModelSpec({ ...raw });
    assert(sameJson(result.toJson(), raw), "ModelSpec.fromJson: the model writes back the json it came from");
    return result;
  }
}

type CallState = {
  readonly model: ModelSpec;
  readonly think: Think;
  readonly temperature: number;
  readonly system: string;
};

export class Call {
  readonly #s: CallState;

  private constructor(s: CallState) {
    this.#s = s;
  }

  static new(model: ModelSpec, think: Think, temperature: number, system: string): Call {
    assert(isTemperature(temperature), `Call.new: temperature is finite and not negative, temperature=${temperature}`);
    assert(isNonBlank(system), `Call.new: system is not blank, model=${model.id()}`);
    const result = new Call({ model, think, temperature, system });
    assert(isCallOf(result, model, think, temperature, system), "Call.new: the call keeps its arguments");
    return result;
  }

  model(): ModelSpec {
    const result = this.#s.model;
    assert(result instanceof ModelSpec, "Call.model: the model is a model spec");
    return result;
  }

  think(): Think {
    const result = this.#s.think;
    assert(isThink(result), "Call.think: the think level is a known one");
    return result;
  }

  temperature(): number {
    const result = this.#s.temperature;
    assert(isTemperature(result), "Call.temperature: the temperature is finite and not negative");
    return result;
  }

  system(): string {
    const result = this.#s.system;
    assert(isNonBlank(result), "Call.system: the system prompt is not blank");
    return result;
  }

  toJson(): CallJson {
    const result = { model: this.#s.model.toJson(), think: this.#s.think, temperature: this.#s.temperature, system: this.#s.system };
    assert(isCallJsonOf(this.#s, result), "Call.toJson: the json carries every field of the call");
    return result;
  }

  static fromJson(raw: unknown): Call {
    assert(isCallJson(raw), `Call.fromJson: raw is a call, raw=${JSON.stringify(raw)}`);
    const result = new Call({ model: ModelSpec.fromJson(raw.model), think: raw.think, temperature: raw.temperature, system: raw.system });
    assert(sameJson(result.toJson(), raw), "Call.fromJson: the call writes back the json it came from");
    return result;
  }
}

type ExtractorConfigState = {
  readonly episodes: Call;
  readonly extract: Call;
  readonly critic: Call;
  readonly novelty: Call;
  readonly questions: readonly Question[];
  readonly episodeChars: number;
  readonly topK: number;
};

export class ExtractorConfig {
  readonly #s: ExtractorConfigState;

  private constructor(s: ExtractorConfigState) {
    this.#s = s;
  }

  static new(
    episodes: Call,
    extract: Call,
    critic: Call,
    novelty: Call,
    questions: readonly Question[],
    episodeChars: number,
    topK: number,
  ): ExtractorConfig {
    assert(hasKind(questions, "note"), `ExtractorConfig.new: at least one question for a note, questions=${questions.length}`);
    assert(hasKind(questions, "rule"), `ExtractorConfig.new: at least one question for a rule, questions=${questions.length}`);
    assert(hasUniqueNames(questions), `ExtractorConfig.new: question names are unique, questions=${questions.length}`);
    assert(isPositiveInt(episodeChars), `ExtractorConfig.new: episodeChars is a positive integer, episodeChars=${episodeChars}`);
    assert(isPositiveInt(topK), `ExtractorConfig.new: topK is a positive integer, topK=${topK}`);
    const result = new ExtractorConfig({ episodes, extract, critic, novelty, questions, episodeChars, topK });
    assert(isConfigOf(result, { episodes, extract, critic, novelty, questions, episodeChars, topK }), "ExtractorConfig.new: the config keeps its arguments");
    return result;
  }

  episodes(): Call {
    const result = this.#s.episodes;
    assert(result instanceof Call, "ExtractorConfig.episodes: the episodes call is a call");
    return result;
  }

  extract(): Call {
    const result = this.#s.extract;
    assert(result instanceof Call, "ExtractorConfig.extract: the extract call is a call");
    return result;
  }

  critic(): Call {
    const result = this.#s.critic;
    assert(result instanceof Call, "ExtractorConfig.critic: the critic call is a call");
    return result;
  }

  novelty(): Call {
    const result = this.#s.novelty;
    assert(result instanceof Call, "ExtractorConfig.novelty: the novelty call is a call");
    return result;
  }

  questionsFor(kind: CandidateKind): readonly Question[] {
    const result = this.#s.questions.filter((q) => q.kind() === kind);
    assert(result.length > 0, `ExtractorConfig.questionsFor: at least one question, kind=${kind}`);
    assert(allOfKind(result, kind), `ExtractorConfig.questionsFor: every question is for the kind asked, kind=${kind}`);
    return result;
  }

  episodeChars(): number {
    const result = this.#s.episodeChars;
    assert(isPositiveInt(result), "ExtractorConfig.episodeChars: the limit is a positive integer");
    return result;
  }

  topK(): number {
    const result = this.#s.topK;
    assert(isPositiveInt(result), "ExtractorConfig.topK: top k is a positive integer");
    return result;
  }

  toJson(): ExtractorConfigJson {
    const result = {
      episodes: this.#s.episodes.toJson(),
      extract: this.#s.extract.toJson(),
      critic: this.#s.critic.toJson(),
      novelty: this.#s.novelty.toJson(),
      questions: this.#s.questions.map((q) => q.toJson()),
      episodeChars: this.#s.episodeChars,
      topK: this.#s.topK,
    };
    assert(isConfigJsonOf(this.#s, result), "ExtractorConfig.toJson: the json carries every field of the config");
    return result;
  }

  static fromJson(raw: unknown): ExtractorConfig {
    assert(isExtractorConfigJson(raw), `ExtractorConfig.fromJson: raw is an extractor config, raw=${JSON.stringify(raw)}`);
    const result = new ExtractorConfig({
      episodes: Call.fromJson(raw.episodes),
      extract: Call.fromJson(raw.extract),
      critic: Call.fromJson(raw.critic),
      novelty: Call.fromJson(raw.novelty),
      questions: raw.questions.map((q) => Question.fromJson(q)),
      episodeChars: raw.episodeChars,
      topK: raw.topK,
    });
    assert(sameJson(result.toJson(), raw), "ExtractorConfig.fromJson: the config writes back the json it came from");
    return result;
  }
}

function isUnit(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

function isNonBlank(text: string): boolean {
  return typeof text === "string" && text.trim().length > 0;
}

function isPositiveInt(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function isTemperature(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function isThink(value: unknown): value is Think {
  return (THINKS as readonly unknown[]).includes(value);
}

function isDrops(value: unknown): value is Drops {
  return (DROPS as readonly unknown[]).includes(value);
}

function isCandidateKind(value: unknown): value is CandidateKind {
  return (CANDIDATE_KINDS as readonly unknown[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sameJson(a: unknown, b: unknown): boolean {
  const sorted = (_key: string, value: unknown): unknown =>
    isRecord(value) ? Object.fromEntries(Object.entries(value).sort(([p], [q]) => (p < q ? -1 : 1))) : value;
  return JSON.stringify(a, sorted) === JSON.stringify(b, sorted);
}

function firesBySpec(drops: Drops, answer: number, threshold: number): boolean {
  return drops === "above" ? answer >= threshold : answer < threshold;
}

function hasKind(questions: readonly Question[], kind: CandidateKind): boolean {
  return questions.some((q) => q.kind() === kind);
}

function allOfKind(questions: readonly Question[], kind: CandidateKind): boolean {
  return questions.every((q) => q.kind() === kind);
}

function hasUniqueNames(questions: readonly Question[]): boolean {
  return new Set(questions.map((q) => q.name())).size === questions.length;
}

function isQuestionOf(q: Question, name: string, text: string, kind: CandidateKind, drops: Drops, threshold: Probability): boolean {
  return sameJson(q.toJson(), { name, text, kind, drops, threshold: threshold.value() });
}

function isModelSpecOf(m: ModelSpec, expected: ModelSpecJson): boolean {
  return sameJson(m.toJson(), expected);
}

function isCallOf(c: Call, model: ModelSpec, think: Think, temperature: number, system: string): boolean {
  return sameJson(c.toJson(), { model: model.toJson(), think, temperature, system });
}

function isConfigOf(
  c: ExtractorConfig,
  expected: {
    episodes: Call;
    extract: Call;
    critic: Call;
    novelty: Call;
    questions: readonly Question[];
    episodeChars: number;
    topK: number;
  },
): boolean {
  return sameJson(c.toJson(), {
    episodes: expected.episodes.toJson(),
    extract: expected.extract.toJson(),
    critic: expected.critic.toJson(),
    novelty: expected.novelty.toJson(),
    questions: expected.questions.map((q) => q.toJson()),
    episodeChars: expected.episodeChars,
    topK: expected.topK,
  });
}

function isQuestionJsonOf(s: QuestionState, json: QuestionJson): boolean {
  return sameJson(json, { name: s.name, text: s.text, kind: s.kind, drops: s.drops, threshold: s.threshold.value() });
}

function isCallJsonOf(s: CallState, json: CallJson): boolean {
  return sameJson(json, { model: s.model.toJson(), think: s.think, temperature: s.temperature, system: s.system });
}

function isConfigJsonOf(s: ExtractorConfigState, json: ExtractorConfigJson): boolean {
  return sameJson(json, {
    episodes: s.episodes.toJson(),
    extract: s.extract.toJson(),
    critic: s.critic.toJson(),
    novelty: s.novelty.toJson(),
    questions: s.questions.map((q) => q.toJson()),
    episodeChars: s.episodeChars,
    topK: s.topK,
  });
}

function isQuestionJson(raw: unknown): raw is QuestionJson {
  return (
    isRecord(raw) &&
    typeof raw.name === "string" &&
    typeof raw.text === "string" &&
    isCandidateKind(raw.kind) &&
    isDrops(raw.drops) &&
    typeof raw.threshold === "number"
  );
}

function isModelSpecJson(raw: unknown): raw is ModelSpecJson {
  return (
    isRecord(raw) &&
    typeof raw.provider === "string" &&
    typeof raw.id === "string" &&
    typeof raw.api === "string" &&
    typeof raw.baseUrl === "string" &&
    typeof raw.reasoning === "boolean" &&
    isRecord(raw.compat) &&
    Object.values(raw.compat).every((flag) => typeof flag === "boolean")
  );
}

function isCallJson(raw: unknown): raw is CallJson {
  return (
    isRecord(raw) &&
    isModelSpecJson(raw.model) &&
    isThink(raw.think) &&
    typeof raw.temperature === "number" &&
    typeof raw.system === "string"
  );
}

function isExtractorConfigJson(raw: unknown): raw is ExtractorConfigJson {
  return (
    isRecord(raw) &&
    isCallJson(raw.episodes) &&
    isCallJson(raw.extract) &&
    isCallJson(raw.critic) &&
    isCallJson(raw.novelty) &&
    Array.isArray(raw.questions) &&
    raw.questions.every(isQuestionJson) &&
    typeof raw.episodeChars === "number" &&
    typeof raw.topK === "number"
  );
}
