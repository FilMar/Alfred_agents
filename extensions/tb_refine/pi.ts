import { spawn } from "node:child_process";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI): void {
  pi.on("session_start", async () => {
    // Detached and silent: opening a session never waits for the refiner, and never fails because of it.
    spawn("tb", ["refine", "--apply"], { detached: true, stdio: "ignore" })
      .on("error", () => {})
      .unref();
  });
}
