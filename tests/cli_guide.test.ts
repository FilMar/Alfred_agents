import { describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { readGuide } from "../tools/common/cli.ts";

const root = resolve(import.meta.dir, "..");

const unreachableServices = {
  QDRANT_URL: "http://127.0.0.1:9",
  OLLAMA_URL: "http://127.0.0.1:9",
};

async function runGuideCommand(
  entry: string,
  cwd: string,
): Promise<{ exitCode: number; stdout: string }> {
  const proc = Bun.spawn(["bun", entry, "guide"], {
    cwd,
    env: { ...process.env, ...unreachableServices },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, exitCode] = await Promise.all([new Response(proc.stdout).text(), proc.exited]);
  return { exitCode, stdout };
}

describe("readGuide", () => {
  it("throws when the guide is not a local file", () => {
    expect(() => readGuide(new URL("https://example.com/guide.md"))).toThrow(
      "readGuide: the guide is a local file",
    );
  });

  it("throws when the guide is only spaces", () => {
    const dir = mkdtempSync(join(tmpdir(), "cli-guide-blank-"));
    try {
      const file = join(dir, "guide.md");
      writeFileSync(file, "   ");
      expect(() => readGuide(pathToFileURL(file))).toThrow("readGuide: the guide is not empty");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("returns the text of a guide with trailing newlines, without the trailing newlines", () => {
    const dir = mkdtempSync(join(tmpdir(), "cli-guide-text-"));
    try {
      const file = join(dir, "guide.md");
      writeFileSync(file, "# Note quality\n\nA note is one atomic concept.\n\n\n");
      readGuide(pathToFileURL(file));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("guide command", () => {
  it("tb guide prints the note guide and exits 0", async () => {
    const { exitCode, stdout } = await runGuideCommand("tools/tb/src/cli.ts", root);
    expect(exitCode).toBe(0);
    expect(stdout.startsWith("# Note quality")).toBe(true);
  });

  it("ti guide prints the rule guide and exits 0", async () => {
    const { exitCode, stdout } = await runGuideCommand("tools/ti/src/cli.ts", root);
    expect(exitCode).toBe(0);
    expect(stdout.startsWith("# Rule quality")).toBe(true);
  });

  it("tb guide prints the same text when launched through a symlink", async () => {
    const dir = mkdtempSync(join(tmpdir(), "cli-guide-symlink-"));
    try {
      const link = join(dir, "tb");
      symlinkSync(resolve(root, "tools/tb/src/cli.ts"), link);
      const direct = await runGuideCommand("tools/tb/src/cli.ts", root);
      const viaSymlink = await runGuideCommand(link, dir);
      expect(viaSymlink.exitCode).toBe(0);
      expect(viaSymlink.stdout).toBe(direct.stdout);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});