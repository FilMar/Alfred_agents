import { ollamaClient } from "../../../tb/src/infra.ts";
import type { Exchange } from "../bank/types.ts";

const CONDENSE_MODEL = process.env.COCKPIT_CONDENSE_MODEL ?? "gemma4:cloud";

function prompt(summary: string, ex: Exchange): string {
  return [
    "You maintain a running summary of a conversation as a short bullet list.",
    "Merge the new exchange into the summary: keep what still matters, drop what is now stale, add what is new.",
    "Reply with the updated bullet list only, no preamble.",
    "",
    "Current summary:",
    summary || "(empty)",
    "",
    "New exchange:",
    `User: ${ex.user}`,
    `Agent: ${ex.agent}`,
  ].join("\n");
}

/** Previous summary + last exchange only -> new delta-merged summary. */
export async function condense(summary: string, ex: Exchange): Promise<string> {
  const data = await ollamaClient.request<{ response: string }>("POST", "/api/generate", {
    model: CONDENSE_MODEL,
    prompt: prompt(summary, ex),
    stream: false,
  });
  return data.response.trim();
}
