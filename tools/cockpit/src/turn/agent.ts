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

/** Shape-check a done-line payload into an AgentReply. Extra fields (e.g. "type") are ignored. */
function toAgentReply(data: unknown): AgentReply {
  const d = data as Record<string, unknown>;
  if (typeof d.text !== "string" || !Array.isArray(d.widgets) || !Array.isArray(d.ledgerProposals)) {
    throw new Error(`malformed agent reply: ${JSON.stringify(data).slice(0, 200)}`);
  }
  return data as AgentReply;
}

/** Parse a single agent-runner NDJSON line into an AgentReply. Exposed for tests. */
export function parseReply(raw: string): AgentReply {
  return toAgentReply(JSON.parse(raw));
}

/** Split an NDJSON byte stream into complete lines, buffering the trailing partial one. */
export function splitLines(buffer: string, chunk: string): { lines: string[]; rest: string } {
  const combined = buffer + chunk;
  const parts = combined.split("\n");
  const rest = parts.pop() ?? "";
  return { lines: parts.filter((l) => l.length > 0), rest };
}

/** Fresh pi SDK session, full toolset, th sandbox from the bank's safe profile, bank's cwd.
 *  Runs in a spawned bwrap child (sandboxing wraps a process, not an in-process call).
 *  Streams "tool: x" / "thinking…" progress lines to onProgress as the agent works. */
export async function runAgent(
  prompt: AgentPrompt,
  safe: SafeProfile,
  cwd: string | null,
  onProgress?: (text: string) => void,
): Promise<AgentReply> {
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
    let buffer = "";
    let stderr = "";
    let result: AgentReply | null = null;

    child.stdout?.on("data", (d) => {
      const { lines, rest } = splitLines(buffer, d.toString());
      buffer = rest;
      for (const line of lines) {
        let obj: unknown;
        try {
          obj = JSON.parse(line);
        } catch {
          continue; // a stray non-JSON line on stdout must not kill the turn
        }
        const type = (obj as { type?: string }).type;
        if (type === "progress") onProgress?.((obj as { text: string }).text);
        else if (type === "done") result = toAgentReply(obj);
      }
    });
    child.stderr?.on("data", (d) => (stderr += d));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) return reject(new Error(stderr || `agent runner exited with code ${code}`));
      if (!result) return reject(new Error(`agent runner produced no result${stderr ? `: ${stderr}` : ""}`));
      resolve(result);
    });
    child.stdin?.end(input);
  });
}
