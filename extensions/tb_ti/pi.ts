import { spawn } from "node:child_process";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI): void {
  pi.on("before_agent_start", async (event) => {
    if (!event.prompt?.trim()) return;

    const [tiResult, tbResult] = await Promise.allSettled([
      execSearch("ti", event.prompt, { limit: 2, minScore: HOOK_MIN_SCORE }),
      execSearch("tb", event.prompt, { depth: 1, limit: 2, minScore: HOOK_MIN_SCORE, relatedLimit: 3, noArchived: true }),
    ]);

    let context = "";

    if (tiResult.status === "fulfilled" && tiResult.value.trim()) {
      context += `## Third Identity (ti) matches\n\n${tiResult.value.trim()}\n\n`;
    }

    if (tbResult.status === "fulfilled" && tbResult.value.trim()) {
      context += `## Third Brain (tb) matches\n\n${tbResult.value.trim()}`;
    }

    if (!context.trim()) return;

    return {
      message: {
        customType: "ti-tb-context",
        content: context.trim(),
        display: false,
      },
    };
  });
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

// The cutoff belongs to the model: on nomic-embed-text-v2-moe a real prompt tops out
// near 0.53 and an off-topic one never passes 0.25. The old 0.8 fired on no prompt at all.
const HOOK_MIN_SCORE = 0.5;

// Eight characters are enough: tb and ti accept a unique prefix of an id.
function shortId(id: string | undefined): string {
  return (id ?? "").slice(0, 8);
}

async function execSearch(
  cmd: string,
  query: string,
  opts: { limit?: number; minScore?: number; depth?: number; relatedLimit?: number; noArchived?: boolean } = {},
): Promise<string> {
  const args = ["search", query, "--limit", String(opts.limit ?? 5), "--min-score", String(opts.minScore ?? HOOK_MIN_SCORE)];
  if (opts.depth) args.push("--depth", String(opts.depth));
  if (opts.relatedLimit !== undefined) args.push("--related-limit", String(opts.relatedLimit));
  if (opts.noArchived) args.push("--no-archived");

  try {
    const { stdout } = await runCommand(cmd, args);
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
