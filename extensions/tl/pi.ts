import { spawn } from "node:child_process";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI): void {
  pi.on("agent_end", async (_event, ctx) => {
    const transcript = ctx.sessionManager.getSessionFile();
    if (!transcript) return;

    // Detached and silent: a turn never waits for the archive, and never fails because of it.
    spawn("tl", ["ingest", "--transcript", transcript], { detached: true, stdio: "ignore" })
      .on("error", () => {})
      .unref();
  });
}
