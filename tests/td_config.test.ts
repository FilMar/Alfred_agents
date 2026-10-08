import { describe, it, expect } from "bun:test";
import { 
  Probability, 
  Question, 
  ModelSpec, 
  Call, 
  ExtractorConfig, 
  Think, 
  Drops 
} from "../tools/td/src/config";

// Fixtures
const prob = (v: number) => Probability.of(v);
const model = () => ModelSpec.new("p", "id", "api", "http://a.b", false, {});
const call = (m = model()) => Call.new(m, "low" as Think, 0.7, "sys");
const q = (name = "n", text = "t", kind: any = "note", drops: Drops = "above", v = 0.5) => 
  Question.new(name, text, kind, drops, prob(v));

describe("Probability", () => {
  it("valid", () => {
    prob(0);
    prob(1);
    prob(0.5).value();
  });

  it("invalid", () => {
    expect(() => prob(NaN)).toThrow("Probability.of: value is a finite number");
    expect(() => prob(Infinity)).toThrow("Probability.of: value is a finite number");
    expect(() => prob(-0.1)).toThrow("Probability.of: value is at least 0");
    expect(() => prob(1.1)).toThrow("Probability.of: value is at most 1");
  });
});

describe("Question", () => {
  it("valid", () => {
    const question = q();
    question.name();
    question.text();
    question.kind();
    question.drops();
    question.threshold().value();
    
    const qAbove = q("n", "t", "note", "above", 0.5);
    qAbove.fires(prob(0.6));
    qAbove.fires(prob(0.5));
    qAbove.fires(prob(0.4));
    
    const qBelow = q("n", "t", "note", "below", 0.5);
    qBelow.fires(prob(0.4));
    qBelow.fires(prob(0.5));
    qBelow.fires(prob(0.6));
  });

  it("invalid", () => {
    expect(() => q("", "t")).toThrow("Question.new: name is not blank");
    expect(() => q("n", "")).toThrow("Question.new: text is not blank");
  });

  it("json", () => {
    const question = q();
    const json = question.toJson();
    Question.fromJson(json);
    
    expect(() => Question.fromJson(null)).toThrow("Question.fromJson: raw is a question");
    expect(() => Question.fromJson({ name: "n" })).toThrow("Question.fromJson: raw is a question");
    expect(() => Question.fromJson({ 
      name: "n", text: "t", kind: "invalid", drops: "above", threshold: 0.5 
    })).toThrow("Question.fromJson: raw is a question");
  });
});

describe("ModelSpec", () => {
  it("valid", () => {
    const m = model();
    m.provider();
    m.id();
    m.toPiModel();
  });

  it("invalid", () => {
    expect(() => ModelSpec.new("", "id", "api", "http://a.b", false, {})).toThrow("ModelSpec.new: provider is not blank");
    expect(() => ModelSpec.new("p", "", "api", "http://a.b", false, {})).toThrow("ModelSpec.new: id is not blank");
    expect(() => ModelSpec.new("p", "id", "", "http://a.b", false, {})).toThrow("ModelSpec.new: api is not blank");
    expect(() => ModelSpec.new("p", "id", "api", "not-a-url", false, {})).toThrow("ModelSpec.new: baseUrl is a url");
  });

  it("json", () => {
    const m = model();
    const json = m.toJson();
    ModelSpec.fromJson(json);
    
    expect(() => ModelSpec.fromJson(null)).toThrow("ModelSpec.fromJson: raw is a model spec");
    expect(() => ModelSpec.fromJson({ provider: "p" })).toThrow("ModelSpec.fromJson: raw is a model spec");
    expect(() => ModelSpec.fromJson({ 
      provider: "p", id: "id", api: "api", baseUrl: "http://a.b", reasoning: "not-bool", compat: {} 
    })).toThrow("ModelSpec.fromJson: raw is a model spec");
  });
});

describe("Call", () => {
  it("valid", () => {
    const c = call();
    c.model();
    c.think();
    c.temperature();
    c.system();
  });

  it("invalid", () => {
    expect(() => Call.new(model(), "low" as Think, -0.1, "sys")).toThrow("Call.new: temperature is finite and not negative");
    expect(() => Call.new(model(), "low" as Think, NaN, "sys")).toThrow("Call.new: temperature is finite and not negative");
    expect(() => Call.new(model(), "low" as Think, 0.7, "")).toThrow("Call.new: system is not blank");
  });

  it("json", () => {
    const c = call();
    const json = c.toJson();
    Call.fromJson(json);
    
    expect(() => Call.fromJson(null)).toThrow("Call.fromJson: raw is a call");
    expect(() => Call.fromJson({ model: {} })).toThrow("Call.fromJson: raw is a call");
    expect(() => Call.fromJson({ 
      model: model().toJson(), think: "invalid", temperature: 0.7, system: "sys" 
    })).toThrow("Call.fromJson: raw is a call");
  });
});

describe("ExtractorConfig", () => {
  const validQuestions = [q("n1", "t1", "note", "above", 0.5), q("n2", "t2", "rule", "above", 0.5)];
  
  it("valid", () => {
    const cfg = ExtractorConfig.new(call(), call(), call(), call(), validQuestions, 1000, 10);
    cfg.episodes();
    cfg.extract();
    cfg.critic();
    cfg.novelty();
    cfg.episodeChars();
    cfg.topK();
    cfg.questionsFor("note");
    cfg.questionsFor("rule");
  });

  it("invalid", () => {
    expect(() => ExtractorConfig.new(call(), call(), call(), call(), [q("n1", "t1", "rule")], 1000, 10)).toThrow("ExtractorConfig.new: at least one question for a note");
    expect(() => ExtractorConfig.new(call(), call(), call(), call(), [q("n1", "t1", "note")], 1000, 10)).toThrow("ExtractorConfig.new: at least one question for a rule");
    expect(() => ExtractorConfig.new(call(), call(), call(), call(), [q("n1", "t1", "note"), q("n1", "t2", "rule")], 1000, 10)).toThrow("ExtractorConfig.new: question names are unique");
    expect(() => ExtractorConfig.new(call(), call(), call(), call(), validQuestions, 0, 10)).toThrow("ExtractorConfig.new: episodeChars is a positive integer");
    expect(() => ExtractorConfig.new(call(), call(), call(), call(), validQuestions, 1.5, 10)).toThrow("ExtractorConfig.new: episodeChars is a positive integer");
    expect(() => ExtractorConfig.new(call(), call(), call(), call(), validQuestions, 1000, 0)).toThrow("ExtractorConfig.new: topK is a positive integer");
  });

  it("json", () => {
    const cfg = ExtractorConfig.new(call(), call(), call(), call(), validQuestions, 1000, 10);
    const json = cfg.toJson();
    ExtractorConfig.fromJson(json);
    
    expect(() => ExtractorConfig.fromJson(null)).toThrow("ExtractorConfig.fromJson: raw is an extractor config");
    expect(() => ExtractorConfig.fromJson({ episodes: {} })).toThrow("ExtractorConfig.fromJson: raw is an extractor config");
    expect(() => ExtractorConfig.fromJson({ 
      episodes: call().toJson(), extract: call().toJson(), critic: call().toJson(), novelty: call().toJson(), 
      questions: [{ name: "n", text: "t", kind: "invalid", drops: "above", threshold: 0.5 }], episodeChars: 1000, topK: 10 
    })).toThrow("ExtractorConfig.fromJson: raw is an extractor config");
  });
});
