import { spawn } from "node:child_process";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI): void {
  pi.on("before_agent_start", async (event) => {
    if (!event.prompt?.trim()) return;

    const rules = await searchRules(event.prompt);
    if (!rules) return;

    return {
      message: {
        customType: "rules-context",
        content: `## Rule matches\n\n${rules}`,
        display: false,
      },
    };
  });
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

// The cutoff belongs to the model: on nomic-embed-text-v2-moe a real prompt tops out
// near 0.53 and an off-topic one never passes 0.25. The old 0.8 fired on no prompt at all.
// 2026-10-21 spike (spikes/2026-10-21-hook-preview + threshold-fix): 0.5 sat exactly on
// the edge of the used-note band (used notes score 0.506-0.600, misses 0.33-0.50).
// Lowered to 0.3: it trims the noise tail without touching the miss population,
// and it empties the rules channel on conversational prompts (rules rarely pass 0.3).
// Below ~0.25 the threshold is a no-op on this corpus (measured cosine floor).
const HOOK_MIN_SCORE = 0.3;

// Max results, ordered by rank. 5 was chosen in the spike: it stays readable.
const HOOK_LIMIT = 5;

// The search gives up after 1 second: a server that does not answer injects nothing.
const HOOK_TIMEOUT_MS = 1000;

async function searchRules(query: string): Promise<string> {
  const args = [
    "rules", "search", query,
    "--limit", String(HOOK_LIMIT),
    "--min-score", String(HOOK_MIN_SCORE),
    "--no-archived",
    "--timeout", String(HOOK_TIMEOUT_MS),
  ];
  try {
    const { stdout } = await runCommand("alfred", args);
    return stdout.trim();
  } catch {
    return "";
  }
}

function runCommand(cmd: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { shell: false });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (d: Buffer) => (stdout += d));
    child.stderr.on("data", (d: Buffer) => (stderr += d));

    child.on("close", (code: number | null) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`exit ${code}: ${stderr}`));
    });
    child.on("error", reject);
  });
}
