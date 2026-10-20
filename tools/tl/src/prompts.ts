import { assert } from "../../common/contract.js";
import type { Exchange } from "./types.js";

export type PromptSource = Readonly<{ exchange: Exchange; text: string }>;
export type Prompt = Readonly<{ exchange: string; timestamp: string; text: string }>;

function noBlank(prompts: readonly Prompt[]): boolean {
  return prompts.every((prompt) => prompt.text.trim().length > 0);
}

function noRepeat(prompts: readonly Prompt[]): boolean {
  return new Set(prompts.map((prompt) => prompt.text)).size === prompts.length;
}

function inOrder(before: Prompt, after: Prompt): boolean {
  if (before.timestamp !== after.timestamp) return before.timestamp < after.timestamp;
  return before.exchange < after.exchange;
}

function oldestFirst(prompts: readonly Prompt[]): boolean {
  return prompts.every((prompt, i) => i === 0 || inOrder(prompts[i - 1], prompt));
}

function trimmed(prompts: readonly Prompt[]): boolean {
  return prompts.every((prompt) => prompt.text === prompt.text.trim());
}

function fromHumans(prompts: readonly Prompt[], sources: readonly PromptSource[]): boolean {
  const human = new Set(sources.filter((source) => isHumanPrompt(source.exchange)).map((source) => source.exchange.id));
  return prompts.every((prompt) => human.has(prompt.exchange));
}

export function isHumanPrompt(exchange: Exchange): boolean {
  let result: boolean;
  const trigger = exchange.meta?.trigger;
  result = exchange.kind === "chat" && (trigger === undefined || trigger === "human");
  return result;
}

export function promptsOf(sources: readonly PromptSource[]): Prompt[] {
  let result: Prompt[];
  const kept: PromptSource[] = [];
  for (const source of sources) {
    if (isHumanPrompt(source.exchange) && source.text.trim().length > 0) {
      kept.push(source);
    }
  }
  kept.sort(
    (one, two) =>
      Number(one.exchange.timestamp > two.exchange.timestamp) - Number(one.exchange.timestamp < two.exchange.timestamp) ||
      Number(one.exchange.id > two.exchange.id) - Number(one.exchange.id < two.exchange.id),
  );
  const seen = new Set<string>();
  const prompts: Prompt[] = [];
  for (const source of kept) {
    const text = source.text.trim();
    if (!seen.has(text)) {
      seen.add(text);
      prompts.push({ exchange: source.exchange.id, timestamp: source.exchange.timestamp, text });
    }
  }
  result = prompts;
  assert(noBlank(result), "promptsOf: no blank text");
  assert(noRepeat(result), "promptsOf: no text twice");
  assert(oldestFirst(result), "promptsOf: oldest first, ties by exchange id");
  assert(trimmed(result), "promptsOf: text is trimmed");
  assert(fromHumans(result, sources), "promptsOf: every prompt comes from a human exchange");
  return result;
}
