import { describe, expect, test } from "bun:test";

import { CriticCheck, Extractor, ModelConnection, Role } from "../tools/td/src/config.ts";
import { extractorJson } from "./helpers/td_stubs.ts";

const extractor = extractorJson("http://localhost:11434/v1", "You are the critic.");
const role = extractor.critic;
const connection = role.connection;
const [noteCheck, ruleCheck] = extractor.checks;

const RAW_CONNECTION = "ModelConnection.fromJson: raw is a model connection with a known api";
const MAX_TOKENS = "ModelConnection: maxTokens is a positive integer within contextWindow";
const THINKING = "Role: the model supports the thinking level";
const RAW_CHECK = "CriticCheck.fromJson: raw is a critic check";
const P_UNIT = "CriticCheck.drops: p is a number from 0 to 1";

const preconditions: [string, () => unknown, string][] = [
  ["connection: not an object", () => ModelConnection.fromJson("x"), RAW_CONNECTION],
  ["connection: unknown api", () => ModelConnection.fromJson({ ...connection, api: "smoke-signals" }), RAW_CONNECTION],
  ["connection: compat flag that is not a boolean", () => ModelConnection.fromJson({ ...connection, compat: { x: "yes" } }), RAW_CONNECTION],
  ["connection: blank provider", () => ModelConnection.fromJson({ ...connection, provider: " " }), "ModelConnection: provider is not blank"],
  ["connection: blank id", () => ModelConnection.fromJson({ ...connection, id: "" }), "ModelConnection: id is not blank"],
  ["connection: baseUrl that is not a url", () => ModelConnection.fromJson({ ...connection, baseUrl: "pippo" }), "ModelConnection: baseUrl is a url"],
  ["connection: contextWindow not positive", () => ModelConnection.fromJson({ ...connection, contextWindow: -3 }), "ModelConnection: contextWindow is a positive integer"],
  ["connection: maxTokens above contextWindow", () => ModelConnection.fromJson({ ...connection, maxTokens: 200000 }), MAX_TOKENS],
  ["connection: maxTokens not an integer", () => ModelConnection.fromJson({ ...connection, maxTokens: 1.5 }), MAX_TOKENS],
  ["connection: an extra field breaks the round trip", () => ModelConnection.fromJson({ ...connection, extra: 1 }), "ModelConnection.fromJson: the connection writes back the json it came from"],
  ["role: not an object", () => Role.fromJson(null), "Role.fromJson: raw is a role"],
  ["role: blank system", () => Role.fromJson({ ...role, system: "  " }), "Role: system is not blank"],
  ["role: negative temperature", () => Role.fromJson({ ...role, temperature: -0.1 }), "Role: temperature is finite and not negative"],
  ["role: thinking on a model that does not reason", () => Role.fromJson({ ...role, connection: { ...connection, reasoning: false } }), THINKING],
  ["role: unknown thinking level", () => Role.fromJson({ ...role, thinking: "huge" }), THINKING],
  ["role: an extra field breaks the round trip", () => Role.fromJson({ ...role, extra: 1 }), "Role.fromJson: the role writes back the json it came from"],
  ["check: unknown kind", () => CriticCheck.fromJson({ ...noteCheck, kind: "idea" }), RAW_CHECK],
  ["check: unknown dropWhen", () => CriticCheck.fromJson({ ...noteCheck, dropWhen: "above" }), RAW_CHECK],
  ["check: blank name", () => CriticCheck.fromJson({ ...noteCheck, name: "" }), "CriticCheck: name is not blank"],
  ["check: blank text", () => CriticCheck.fromJson({ ...noteCheck, text: " " }), "CriticCheck: text is not blank"],
  ["check: threshold above one", () => CriticCheck.fromJson({ ...noteCheck, threshold: 1.5 }), "CriticCheck: threshold is a number from 0 to 1"],
  ["check: p above one", () => CriticCheck.fromJson(noteCheck).drops(1.1), P_UNIT],
  ["check: p not a number", () => CriticCheck.fromJson(noteCheck).drops(Number.NaN), P_UNIT],
  ["check: an extra field breaks the round trip", () => CriticCheck.fromJson({ ...noteCheck, extra: 1 }), "CriticCheck.fromJson: the check writes back the json it came from"],
  ["extractor: checks that are not a list", () => Extractor.fromJson({ ...extractor, checks: {} }), "Extractor.fromJson: raw is an extractor"],
  ["extractor: no check for a note", () => Extractor.fromJson({ ...extractor, checks: [ruleCheck] }), "Extractor: at least one check for a note"],
  ["extractor: no check for a rule", () => Extractor.fromJson({ ...extractor, checks: [noteCheck] }), "Extractor: at least one check for a rule"],
  ["extractor: two checks with the same name", () => Extractor.fromJson({ ...extractor, checks: [noteCheck, ruleCheck, noteCheck] }), "Extractor: check names are unique"],
  ["extractor: an extra field breaks the round trip", () => Extractor.fromJson({ ...extractor, extra: 1 }), "Extractor.fromJson: the extractor writes back the json it came from"],
];

for (const [name, call, message] of preconditions) {
  test(name, () => {
    expect(call).toThrow(message);
  });
}

describe("ModelConnection", () => {
  test("toJson and toPiModel", () => {
    ModelConnection.fromJson(connection).toJson();
    ModelConnection.fromJson(connection).toPiModel();
  });

  test("maxTokens equal to contextWindow", () => {
    ModelConnection.fromJson({ ...connection, maxTokens: connection.contextWindow });
  });
});

describe("Role", () => {
  test("toJson", () => {
    Role.fromJson(role).toJson();
  });

  test("temperature zero", () => {
    Role.fromJson({ ...role, temperature: 0 });
  });

  test("off on a model that does not reason", () => {
    Role.fromJson({ ...role, connection: { ...connection, reasoning: false }, thinking: "off" });
  });
});

describe("CriticCheck", () => {
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
});

describe("Extractor", () => {
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
});
