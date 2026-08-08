import type { SafeProfile } from "../bank/types.ts";
import type { AgentPrompt, AgentReply } from "./types.ts";

/** Fresh pi SDK session, full toolset, th sandbox from the bank's safe profile, bank's cwd. */
export async function runAgent(
  prompt: AgentPrompt,
  safe: SafeProfile,
  cwd: string | null,
): Promise<AgentReply> {
  throw new Error("TODO");
}
