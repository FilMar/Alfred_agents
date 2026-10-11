import { describe, it, expect } from "bun:test";

import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const { makeJobPaths, spoolPathFor } = await import("../tools/th/src/runner.ts");
const { spoolDir, SPOOL_SUFFIX } = await import("../tools/th/src/archive.ts");

// The client reads its URL at import, so each case runs in a fresh process pointed at a dead port.
function inFreshProcess(state: string, script: string) {
  return spawnSync("bun", ["-e", script], {
    cwd: join(import.meta.dir, ".."),
    env: { ...process.env, XDG_STATE_HOME: state, TL_API_URL: "http://127.0.0.1:1" },
    encoding: "utf8",
  });
}

describe("spoolDir", () => {
  it("creates the directory under the state home", () => {
    const state = mkdtempSync(join(tmpdir(), "th-state-"));
    const previous = process.env.XDG_STATE_HOME;
    process.env.XDG_STATE_HOME = state;
    try {
      const dir = spoolDir();
      expect(dir).toBe(join(state, "th", "spool"));
      expect(existsSync(dir)).toBe(true);
    } finally {
      if (previous === undefined) delete process.env.XDG_STATE_HOME;
      else process.env.XDG_STATE_HOME = previous;
    }
  });
});

describe("makeJobPaths", () => {
  it("gives two runs of one hat different files, even in the same millisecond", () => {
    const now = Date.now;
    Date.now = () => 1_700_000_000_000;
    try {
      expect(makeJobPaths("black-core").status).not.toBe(makeJobPaths("black-core").status);
    } finally {
      Date.now = now;
    }
  });
});

describe("spoolPathFor", () => {
  it("leaves /tmp and keeps the run's name", () => {
    const path = spoolPathFor("/tmp/th-black-core-1-ab12.status");
    expect(path.startsWith(tmpdir())).toBe(false);
    expect(path.endsWith(`th-black-core-1-ab12${SPOOL_SUFFIX}`)).toBe(true);
  });

  it("refuses a path that is not a status file", () => {
    expect(() => spoolPathFor("/tmp/th-black-core-1.out")).toThrow("spoolPathFor: takes a status path");
  });
});

describe("drainSpool", () => {
  const drain = `const { drainSpool, spoolDir } = await import("./tools/th/src/archive.ts");
    await drainSpool(); console.log(JSON.stringify(spoolDir()));`;

  it("returns cleanly when the archive is down, and the file stays", () => {
    const state = mkdtempSync(join(tmpdir(), "th-state-"));
    const file = join(state, "th", "spool", `th-hat-1-ab12${SPOOL_SUFFIX}`);
    inFreshProcess(state, `const { spoolDir } = await import("./tools/th/src/archive.ts"); spoolDir();`);
    writeFileSync(file, JSON.stringify({ session: {}, exchange: {}, contents: {} }));
    const result = inFreshProcess(state, drain);
    expect(result.status).toBe(0);
    expect(existsSync(file)).toBe(true);
  });

  it("makes no request when nothing is spooled", () => {
    const state = mkdtempSync(join(tmpdir(), "th-state-"));
    const result = inFreshProcess(state, drain);
    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
  });

  it("gives up after the deadline when the archive hangs, however many files wait", async () => {
    const server = Bun.serve({ port: 0, fetch: () => new Promise<Response>(() => {}) });
    const state = mkdtempSync(join(tmpdir(), "th-state-"));
    inFreshProcess(state, `const { spoolDir } = await import("./tools/th/src/archive.ts"); spoolDir();`);
    for (const n of [1, 2, 3]) writeFileSync(join(state, "th", "spool", `th-hat-${n}-ab12${SPOOL_SUFFIX}`), "{}");
    const timed = `const { drainSpool } = await import("./tools/th/src/archive.ts");
      const t = Date.now(); await drainSpool(); console.log(Date.now() - t); process.exit(0);`;
    const child = Bun.spawn(["bun", "-e", timed], {
      cwd: join(import.meta.dir, ".."),
      env: { ...process.env, XDG_STATE_HOME: state, TL_API_URL: `http://127.0.0.1:${server.port}` },
      stdout: "pipe", stderr: "ignore",
    });
    const elapsed = Number(await new Response(child.stdout).text());
    server.stop(true);
    expect(elapsed).toBeLessThan(3_000);
  });
});
