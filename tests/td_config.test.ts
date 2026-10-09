import { describe, expect, test } from "bun:test";

import { CriticCheck, Extractor, ModelConnection, Role } from "../tools/td/src/config.ts";

const connection = {
  provider: "ollama",
  id: "glm-5.3-flash",
  api: "openai-completions",
  baseUrl: "http://localhost:11434/v1",
  reasoning: true,
  compat: { supportsDeveloperRole: false },
  contextWindow: 128000,
  maxTokens: 8192,
};

const role = { connection, thinking: "low", temperature: 0.1, system: "You are the critic." };

const noteCheck = { name: "is_textbook_definition", text: "A manual already says this.", kind: "note", dropWhen: "atLeast", threshold: 0.6 };
const ruleCheck = { name: "is_user_rejection", text: "The user rejected something.", kind: "rule", dropWhen: "under", threshold: 0.4 };

const extractor = {
  episodes: role,
  extract: role,
  critic: role,
  novelty: role,
  checks: [noteCheck, ruleCheck],
  episodeChars: 4000,
  targetInputChars: 6000,
  targetOutputChars: 8000,
  listingChars: 300,
  vocabularySize: 80,
  topK: 5,
};

describe("ModelConnection", () => {
  test("valid json", () => {
    ModelConnection.fromJson(connection);
  });

  test("toJson and toPiModel", () => {
    ModelConnection.fromJson(connection).toJson();
    ModelConnection.fromJson(connection).toPiModel();
  });

  test("maxTokens equal to contextWindow", () => {
    ModelConnection.fromJson({ ...connection, maxTokens: connection.contextWindow });
  });

  test("not an object", () => {
    expect(() => ModelConnection.fromJson("x")).toThrow("ModelConnection.fromJson: raw is a model connection with a known api");
  });

  test("unknown api", () => {
    expect(() => ModelConnection.fromJson({ ...connection, api: "smoke-signals" })).toThrow("ModelConnection.fromJson: raw is a model connection with a known api");
  });

  test("compat flag that is not a boolean", () => {
    expect(() => ModelConnection.fromJson({ ...connection, compat: { x: "yes" } })).toThrow("ModelConnection.fromJson: raw is a model connection with a known api");
  });

  test("blank provider", () => {
    expect(() => ModelConnection.fromJson({ ...connection, provider: " " })).toThrow("ModelConnection: provider is not blank");
  });

  test("blank id", () => {
    expect(() => ModelConnection.fromJson({ ...connection, id: "" })).toThrow("ModelConnection: id is not blank");
  });

  test("baseUrl that is not a url", () => {
    expect(() => ModelConnection.fromJson({ ...connection, baseUrl: "pippo" })).toThrow("ModelConnection: baseUrl is a url");
  });

  test("contextWindow not positive", () => {
    expect(() => ModelConnection.fromJson({ ...connection, contextWindow: -3 })).toThrow("ModelConnection: contextWindow is a positive integer");
  });

  test("maxTokens above contextWindow", () => {
    expect(() => ModelConnection.fromJson({ ...connection, maxTokens: 200000 })).toThrow("ModelConnection: maxTokens is a positive integer within contextWindow");
  });

  test("maxTokens not an integer", () => {
    expect(() => ModelConnection.fromJson({ ...connection, maxTokens: 1.5 })).toThrow("ModelConnection: maxTokens is a positive integer within contextWindow");
  });

  test("an extra field breaks the round trip", () => {
    expect(() => ModelConnection.fromJson({ ...connection, extra: 1 })).toThrow("ModelConnection.fromJson: the connection writes back the json it came from");
  });
});

describe("Role", () => {
  test("valid json", () => {
    Role.fromJson(role);
  });

  test("toJson", () => {
    Role.fromJson(role).toJson();
  });

  test("temperature zero", () => {
    Role.fromJson({ ...role, temperature: 0 });
  });

  test("off on a model that does not reason", () => {
    Role.fromJson({ ...role, connection: { ...connection, reasoning: false }, thinking: "off" });
  });

  test("not an object", () => {
    expect(() => Role.fromJson(null)).toThrow("Role.fromJson: raw is a role");
  });

  test("blank system", () => {
    expect(() => Role.fromJson({ ...role, system: "  " })).toThrow("Role: system is not blank");
  });

  test("negative temperature", () => {
    expect(() => Role.fromJson({ ...role, temperature: -0.1 })).toThrow("Role: temperature is finite and not negative");
  });

  test("thinking on a model that does not reason", () => {
    expect(() => Role.fromJson({ ...role, connection: { ...connection, reasoning: false } })).toThrow("Role: the model supports the thinking level");
  });

  test("unknown thinking level", () => {
    expect(() => Role.fromJson({ ...role, thinking: "huge" })).toThrow("Role: the model supports the thinking level");
  });

  test("an extra field breaks the round trip", () => {
    expect(() => Role.fromJson({ ...role, extra: 1 })).toThrow("Role.fromJson: the role writes back the json it came from");
  });
});

describe("CriticCheck", () => {
  test("valid json", () => {
    CriticCheck.fromJson(noteCheck);
    CriticCheck.fromJson(ruleCheck);
  });

  test("toJson and getters", () => {
    const check = CriticCheck.fromJson(noteCheck);
    check.toJson();
    check.name();
    check.text();
    check.kind();
  });

  test("atLeast at, under and over the threshold", () => {
    const check = CriticCheck.fromJson(noteCheck);
    check.drops(0.6);
    check.drops(0.59);
    check.drops(1);
  });

  test("under at, under and over the threshold", () => {
    const check = CriticCheck.fromJson(ruleCheck);
    check.drops(0.4);
    check.drops(0.39);
    check.drops(0);
  });

  test("unknown kind", () => {
    expect(() => CriticCheck.fromJson({ ...noteCheck, kind: "idea" })).toThrow("CriticCheck.fromJson: raw is a critic check");
  });

  test("unknown dropWhen", () => {
    expect(() => CriticCheck.fromJson({ ...noteCheck, dropWhen: "above" })).toThrow("CriticCheck.fromJson: raw is a critic check");
  });

  test("blank name", () => {
    expect(() => CriticCheck.fromJson({ ...noteCheck, name: "" })).toThrow("CriticCheck: name is not blank");
  });

  test("blank text", () => {
    expect(() => CriticCheck.fromJson({ ...noteCheck, text: " " })).toThrow("CriticCheck: text is not blank");
  });

  test("threshold above one", () => {
    expect(() => CriticCheck.fromJson({ ...noteCheck, threshold: 1.5 })).toThrow("CriticCheck: threshold is a number from 0 to 1");
  });

  test("p above one", () => {
    expect(() => CriticCheck.fromJson(noteCheck).drops(1.1)).toThrow("CriticCheck.drops: p is a number from 0 to 1");
  });

  test("p not a number", () => {
    expect(() => CriticCheck.fromJson(noteCheck).drops(Number.NaN)).toThrow("CriticCheck.drops: p is a number from 0 to 1");
  });

  test("an extra field breaks the round trip", () => {
    expect(() => CriticCheck.fromJson({ ...noteCheck, extra: 1 })).toThrow("CriticCheck.fromJson: the check writes back the json it came from");
  });
});

describe("Extractor", () => {
  test("valid json", () => {
    Extractor.fromJson(extractor);
  });

  test("toJson and getters", () => {
    const x = Extractor.fromJson(extractor);
    x.toJson();
    x.episodes();
    x.extract();
    x.critic();
    x.novelty();
    x.episodeChars();
    x.targetInputChars();
    x.targetOutputChars();
    x.listingChars();
    x.vocabularySize();
    x.topK();
  });

  test("checksFor each kind", () => {
    const x = Extractor.fromJson(extractor);
    x.checksFor("note");
    x.checksFor("rule");
  });

  test("checks that are not a list", () => {
    expect(() => Extractor.fromJson({ ...extractor, checks: {} })).toThrow("Extractor.fromJson: raw is an extractor");
  });

  test("no check for a note", () => {
    expect(() => Extractor.fromJson({ ...extractor, checks: [ruleCheck] })).toThrow("Extractor: at least one check for a note");
  });

  test("no check for a rule", () => {
    expect(() => Extractor.fromJson({ ...extractor, checks: [noteCheck] })).toThrow("Extractor: at least one check for a rule");
  });

  test("two checks with the same name", () => {
    expect(() => Extractor.fromJson({ ...extractor, checks: [noteCheck, ruleCheck, noteCheck] })).toThrow("Extractor: check names are unique");
  });

  for (const size of ["episodeChars", "targetInputChars", "targetOutputChars", "listingChars", "vocabularySize", "topK"]) {
    test(`${size} zero`, () => {
      expect(() => Extractor.fromJson({ ...extractor, [size]: 0 })).toThrow(`Extractor: every size is a positive integer, bad=${size}`);
    });

    test(`${size} one, the smallest size`, () => {
      Extractor.fromJson({ ...extractor, [size]: 1 });
    });

    test(`${size} not an integer`, () => {
      expect(() => Extractor.fromJson({ ...extractor, [size]: 1.5 })).toThrow(`Extractor: every size is a positive integer, bad=${size}`);
    });

    test(`${size} missing`, () => {
      const { [size]: _, ...rest } = extractor as Record<string, unknown>;
      expect(() => Extractor.fromJson(rest)).toThrow("Extractor.fromJson: raw is an extractor");
    });
  }

  test("an extra field breaks the round trip", () => {
    expect(() => Extractor.fromJson({ ...extractor, extra: 1 })).toThrow("Extractor.fromJson: the extractor writes back the json it came from");
  });
});
