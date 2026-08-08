import type { Bank } from "../bank/types.ts";
import type { AgentPrompt, LoadedFile, Retrieval } from "./types.ts";

const BASE_SYSTEM = [
  "You are the cockpit agent. Each call is a fresh session:",
  "the context below is your only memory of this conversation.",
  "The ledger holds facts the user confirmed — trust it over your own inference.",
].join(" ");

/** Bank + input -> the prompt for a fresh call. The whole episodic idea is here. */
export function assembleContext(
  bank: Bank,
  text: string,
  hatOverlay: string | null,
  retrieval: Retrieval,
  files: LoadedFile[],
): AgentPrompt {
  const system = hatOverlay ? `${BASE_SYSTEM}\n\n${hatOverlay.trim()}` : BASE_SYSTEM;
  const parts: string[] = [];
  if (bank.summary) parts.push(`## Session summary\n\n${bank.summary}`);
  if (bank.ledger.length)
    parts.push(
      "## Ledger (confirmed facts)\n\n" +
        bank.ledger.map((e) => `- [${e.at}] ${e.text}`).join("\n"),
    );
  if (bank.tail.length)
    parts.push(
      "## Recent exchanges\n\n" +
        bank.tail.map((ex) => `User: ${ex.user}\nAgent: ${ex.agent}`).join("\n\n"),
    );
  if (retrieval.tb.length)
    parts.push("## Third Brain\n\n" + retrieval.tb.map((s) => `- ${s}`).join("\n"));
  if (retrieval.ti.length)
    parts.push("## Rules (context -> action)\n\n" + retrieval.ti.map((s) => `- ${s}`).join("\n"));
  for (const f of files) parts.push(`## File: ${f.path}\n\n${f.content}`);
  parts.push(`## Request\n\n${text}`);
  return { system, user: parts.join("\n\n") };
}
