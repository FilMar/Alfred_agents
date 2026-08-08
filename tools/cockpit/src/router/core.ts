import type { Command } from "./types.ts";

/**
 * Raw input -> Command. Pure.
 * ":" prefix selects a command (vim style); knownHats decides which ":x" are hats.
 * "::" escapes a literal leading colon. Plain text becomes a turn;
 * "@path" mentions are extracted into files.
 */
export function parseCommand(input: string, knownHats: string[]): Command {
  const trimmed = input.trim();
  if (trimmed.startsWith("::")) return toTurn(trimmed.slice(1));
  if (!trimmed.startsWith(":")) return toTurn(trimmed);

  const m = /^:([a-z-]+)(?:\s+([\s\S]+))?$/.exec(trimmed);
  const unknown: Command = { kind: "unknown", raw: trimmed };
  if (!m) return unknown;
  const word = m[1]!;
  const arg = m[2]?.trim();

  if (knownHats.includes(word)) return arg ? unknown : { kind: "hat", name: word };
  switch (word) {
    case "bash":
      return arg ? { kind: "bash", cmd: arg } : unknown;
    case "mem":
      return arg ? { kind: "mem", name: arg } : { kind: "mem" };
    case "new":
      return arg ? { kind: "new", name: arg } : unknown;
    case "delete":
      return arg ? { kind: "delete", name: arg } : { kind: "delete" };
    case "clear":
      return arg ? unknown : { kind: "clear" };
    case "safe":
      return arg ? unknown : { kind: "safe" };
    case "cd":
      return arg ? { kind: "cd", path: arg } : { kind: "cd" };
    case "detach":
      return arg ? { kind: "detach", task: arg } : unknown;
    case "edit-memory":
      return arg ? unknown : { kind: "edit-memory" };
    default:
      return unknown;
  }
}

function toTurn(text: string): Command {
  const files = [...new Set([...text.matchAll(/(?:^|\s)@([^\s@]+)/g)].map((m) => m[1]!))];
  return { kind: "turn", text, files };
}
