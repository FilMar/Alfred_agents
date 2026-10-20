import { assert, isNonBlank } from "../../common/contract.js";

export type RuleText = Readonly<{ id: string; if: string }>;
export type ReachRule = Readonly<{ id: string; if: string; reached: number }>;
export type Reach = Readonly<{ prompts: number; rules: readonly ReachRule[]; unreached: readonly ReachRule[] }>;
export type PromptTexts = Readonly<{ ok: true; texts: readonly string[] }> | Readonly<{ ok: false; error: string }>;

function distinctIds(rules: readonly RuleText[]): boolean {
  return new Set(rules.map((rule) => rule.id)).size === rules.length;
}

function everyRuleOnce(reach: Reach, rules: readonly RuleText[]): boolean {
  const ids = new Set(reach.rules.map((rule) => rule.id));
  return reach.rules.length === rules.length && rules.every((rule) => ids.has(rule.id));
}

function countsHold(reach: Reach, found: readonly (readonly string[])[]): boolean {
  return reach.rules.every((rule) => rule.reached === found.filter((ids) => ids.includes(rule.id)).length);
}

function unreachedHolds(reach: Reach): boolean {
  const zero = reach.rules.filter((rule) => rule.reached === 0).map((rule) => rule.id);
  return zero.length === reach.unreached.length && reach.unreached.every((rule) => zero.includes(rule.id));
}

function textsUsable(outcome: PromptTexts): boolean {
  return !outcome.ok || outcome.texts.every(isNonBlank);
}

export function reachOf(rules: readonly RuleText[], found: readonly (readonly string[])[]): Reach {
  assert(distinctIds(rules), "reachOf: no rule id twice");
  let result: Reach;
  const counted = rules
    .map((rule) => ({ id: rule.id, if: rule.if, reached: found.filter((ids) => ids.includes(rule.id)).length }))
    .sort((a, b) => a.reached - b.reached || (a.id < b.id ? -1 : 1));
  result = {
    prompts: found.length,
    rules: counted,
    unreached: counted.filter((rule) => rule.reached === 0),
  };
  assert(result.prompts === found.length, "reachOf: prompts is the number of searches");
  assert(everyRuleOnce(result, rules), "reachOf: every rule once");
  assert(countsHold(result, found), "reachOf: reached counts the prompts that returned the rule");
  assert(unreachedHolds(result), "reachOf: unreached are the rules reached zero times");
  return result;
}

export function promptTextsOf(input: unknown): PromptTexts {
  let result: PromptTexts;
  const hasText = (element: unknown): element is { text: string } =>
    typeof element === "object" && element !== null && typeof (element as { text?: unknown }).text === "string";
  result =
    Array.isArray(input) && input.every(hasText)
      ? {
          ok: true,
          texts: (input as readonly { text: string }[])
            .map((prompt) => prompt.text.trim())
            .filter((text) => text !== ""),
        }
      : { ok: false, error: "stdin must be a JSON array of { text }, as tl prompts prints" };
  assert(textsUsable(result), "promptTextsOf: no blank text");
  return result;
}
