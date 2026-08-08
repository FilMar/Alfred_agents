import { readFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { pushExchange, setSummary } from "../bank/core.ts";
import type { Bank, Exchange } from "../bank/types.ts";
import type { Command } from "../router/types.ts";
import type { runAgent } from "./agent.ts";
import type { condense } from "./condense.ts";
import { assembleContext } from "./context.ts";
import type { retrieve } from "./retrieve.ts";
import type { AgentReply, LoadedFile, Retrieval } from "./types.ts";

/** Injected edges: milestone 1 runs with a fake agent, tests never touch the network. */
export type TurnDeps = {
  retrieve: typeof retrieve;
  runAgent: typeof runAgent;
  condense: typeof condense;
};

const EMPTY_RETRIEVAL: Retrieval = { tb: [], ti: [] };

/** One episodic turn: retrieve -> load @files -> assemble -> run. Reply comes back now. */
export async function runTurn(
  bank: Bank,
  input: Command & { kind: "turn" },
  hatOverlay: string | null,
  deps: TurnDeps,
): Promise<AgentReply> {
  const retrieval = await deps.retrieve(input.text).catch(() => EMPTY_RETRIEVAL);
  const files = await loadFiles(input.files, bank.cwd);
  const prompt = assembleContext(bank, input.text, hatOverlay, retrieval, files);
  return deps.runAgent(prompt, bank.safe, bank.cwd);
}

/** Post-reply bookkeeping, run async by the server: push the exchange into the tail,
 *  delta-merge the summary. A condense failure must not lose the exchange. */
export async function afterTurn(bank: Bank, ex: Exchange, deps: TurnDeps): Promise<Bank> {
  const withTail = pushExchange(bank, ex);
  try {
    return setSummary(withTail, await deps.condense(bank.summary, ex));
  } catch {
    return withTail;
  }
}

async function loadFiles(paths: string[], cwd: string | null): Promise<LoadedFile[]> {
  const out: LoadedFile[] = [];
  for (const p of paths) {
    const full = isAbsolute(p) ? p : join(cwd ?? process.cwd(), p);
    try {
      out.push({ path: p, content: await readFile(full, "utf8") });
    } catch {
      out.push({ path: p, content: "(unreadable)" });
    }
  }
  return out;
}
