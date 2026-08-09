import { spawnSandboxed, type ExtraBind } from "../../../th/src/runner.ts";
import type { SafeProfile } from "../bank/types.ts";
import type { AgentPrompt, AgentReply } from "./types.ts";

const RUNNER_PATH = new URL("./agent-runner.ts", import.meta.url).pathname;
const MODEL = process.env.COCKPIT_AGENT_MODEL; // "provider/model-id"; unset -> pi picks from settings
const THINKING_LEVEL = process.env.COCKPIT_AGENT_THINKING;
const TIMEOUT_SEC = Number(process.env.COCKPIT_AGENT_TIMEOUT_SEC ?? 120);

/** bank.safe -> bwrap binds: read paths ro, write paths rw. Starts empty = no extra access. */
export function buildExtraBinds(safe: SafeProfile): ExtraBind[] {
  return [
    ...safe.read.map((path): ExtraBind => ({ path, mode: "ro" })),
    ...safe.write.map((path): ExtraBind => ({ path, mode: "rw" })),
  ];
}

/** Parse the agent-runner's stdout JSON, rejecting on a shape that isn't a real AgentReply. */
export function parseReply(raw: string): AgentReply {
  const data = JSON.parse(raw);
  if (typeof data.text !== "string" || !Array.isArray(data.widgets) || !Array.isArray(data.ledgerProposals)) {
    throw new Error(`malformed agent reply: ${raw.slice(0, 200)}`);
  }
  return data as AgentReply;
}

/** Fresh pi SDK session, full toolset, th sandbox from the bank's safe profile, bank's cwd.
 *  Runs in a spawned bwrap child (sandboxing wraps a process, not an in-process call). */
export async function runAgent(prompt: AgentPrompt, safe: SafeProfile, cwd: string | null): Promise<AgentReply> {
  const child = spawnSandboxed("bun", ["run", RUNNER_PATH], { stdio: ["pipe", "pipe", "pipe"] }, buildExtraBinds(safe));

  const input = JSON.stringify({
    systemPrompt: prompt.system,
    userPrompt: prompt.user,
    cwd,
    modelStr: MODEL,
    thinkingLevel: THINKING_LEVEL,
    timeoutSec: TIMEOUT_SEC,
  });

  return new Promise<AgentReply>((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d) => (stdout += d));
    child.stderr?.on("data", (d) => (stderr += d));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) return reject(new Error(stderr || `agent runner exited with code ${code}`));
      try {
        resolve(parseReply(stdout));
      } catch (err) {
        reject(err);
      }
    });
    child.stdin?.end(input);
  });
}
