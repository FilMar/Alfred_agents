import { spawn } from "node:child_process";
import { realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const DISTILL = join(dirname(realpathSync(fileURLToPath(import.meta.url))), "distill.sh");

function detached(command: string, args: string[]): void {
  spawn(command, args, { detached: true, stdio: "ignore" })
    .on("error", () => {})
    .unref();
}

export default function (pi: ExtensionAPI): void {
  pi.on("session_start", async () => {
    // Detached and silent: opening a session never waits for these, and never fails because of them.
    detached("tb", ["refine", "--apply"]);
    detached(DISTILL, []);
  });
}
