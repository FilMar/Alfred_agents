import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi) {
  pi.on("before_agent_start", async (event) => {
    if (!event.prompt?.trim()) return;

    const [tiResult, tbResult] = await Promise.allSettled([
      execSearch("ti", event.prompt, { limit: 3, minScore: 0.6 }),
      execSearch("tb", event.prompt, { depth: 1, limit: 5, minScore: 0.6 }),
    ]);

    let context = "";

    // Third Identity results
    if (tiResult.status === "fulfilled" && tiResult.value.trim()) {
      try {
        const tiData = JSON.parse(tiResult.value);
        const tiFormatted = tiData
          .slice(0, 3)
          .map((r) => `**If**: ${r.if || "—"}\n**Do**: ${r.do || "—"}${r.tags?.length ? `\nTags: ${r.tags.join(", ")}` : ""}`)
          .join("\n\n");
        context += `## Third Identity (ti) matches\n\n${tiFormatted}\n\n`;
      } catch {
        context += `## Third Identity (ti) matches\n\n${tiResult.value.trim()}\n\n`;
      }
    }

    // Third Brain results
    if (tbResult.status === "fulfilled" && tbResult.value.trim()) {
      try {
        const tbData = JSON.parse(tbResult.value);
        const tbFormatted = tbData
          .slice(0, 5)
          .map((r) => {
            const what = r.note?.what || r.what || "—";
            const why = r.note?.why || r.why || "—";
            const tags = r.note?.tags?.length ? `\nTags: ${r.note.tags.join(", ")}` : "";
            const kind = r.note?.kind || r.kind ? `\nKind: ${r.note?.kind || r.kind}` : "";
            return `**What**: ${what}\n**Why**: ${why}${tags}${kind}`;
          })
          .join("\n\n");
        context += `## Third Brain (tb) matches\n\n${tbFormatted}`;
      } catch {
        context += `## Third Brain (tb) matches\n\n${tbResult.value.trim()}`;
      }
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

async function execSearch(cmd, query, opts = {}) {
  const args = [query, "--limit", String(opts.limit ?? 5), "--min-score", String(opts.minScore ?? 0.6)];
  if (opts.depth) args.push("--depth", String(opts.depth));

  try {
    const { stdout } = await runCommand(cmd, args);
    return stdout.trim();
  } catch (err) {
    return "";
  }
}

function runCommand(cmd, args) {
  return new Promise((resolve, reject) => {
    const { spawn } = require("node:child_process");
    const child = spawn(cmd, args, { shell: false });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));

    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`exit ${code}: ${stderr}`));
    });
    child.on("error", reject);
  });
}
