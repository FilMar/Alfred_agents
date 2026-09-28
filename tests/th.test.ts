import { describe, it, expect, afterAll, beforeAll } from "bun:test";
import { mkdirSync, rmSync, writeFileSync, readFileSync, utimesSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";

const TEST_BASE = join(tmpdir(), `th-test-${Date.now()}`);

const { validateName, composeSystemPrompt, parseTools } = await import("../tools/th/src/hats.ts");
const { waitForJobs, sanitize, checkStaleness, makeJobPaths, sandboxExec, OUT_STALE_MS } = await import("../tools/th/src/runner.ts");

function statusFile(name: string, content: string): string {
  const p = join(TEST_BASE, `status-${name}`);
  writeFileSync(p, content);
  return p;
}

beforeAll(() => {
  mkdirSync(TEST_BASE, { recursive: true });
});

afterAll(() => {
  try { rmSync(TEST_BASE, { recursive: true, force: true }); } catch {}
});

describe("validateName", () => {
  it("accepts letters, digits, dash, underscore", () => {
    expect(() => validateName("mario")).not.toThrow();
    expect(() => validateName("mario-rossi")).not.toThrow();
    expect(() => validateName("mario_rossi")).not.toThrow();
    expect(() => validateName("Mario123")).not.toThrow();
  });

  it("rejects an empty string", () => {
    expect(() => validateName("")).toThrow();
  });

  it("rejects path traversal with slash", () => {
    expect(() => validateName("../etc/passwd")).toThrow();
    expect(() => validateName("a/b")).toThrow();
  });

  it("rejects backslash", () => {
    expect(() => validateName("a\\b")).toThrow();
  });

  it("rejects spaces", () => {
    expect(() => validateName("mario rossi")).toThrow();
  });

  it("rejects special characters", () => {
    expect(() => validateName("mario@rossi")).toThrow();
    expect(() => validateName("mario.rossi")).toThrow();
    expect(() => validateName("mario!")).toThrow();
  });
});

describe("waitForJobs", () => {
  it("returns ok=true when all jobs are done", async () => {
    const paths = [statusFile("a", "done"), statusFile("b", "done")];
    const outcomes = await waitForJobs(paths, 5);
    expect(outcomes.every(o => o.ok)).toBe(true);
  });

  it("does not hang on an errored job and marks it ok=false (hang regression)", async () => {
    const paths = [statusFile("ok", "done"), statusFile("ko", "error: boom")];
    const outcomes = await waitForJobs(paths, 5);
    expect(outcomes[0]?.ok).toBe(true);
    expect(outcomes[1]?.ok).toBe(false);
    expect(outcomes[1]?.status).toBe("error: boom");
  });

  it("treats the timeout state as terminal", async () => {
    const paths = [statusFile("t", "timeout")];
    const outcomes = await waitForJobs(paths, 5);
    expect(outcomes[0]?.ok).toBe(false);
  });

  it("understands the running → done transition", async () => {
    const p = statusFile("trans", "running");
    const waiting = waitForJobs([p], 10);
    writeFileSync(p, "done");
    const outcomes = await waiting;
    expect(outcomes[0]?.ok).toBe(true);
  });
});

describe("composeSystemPrompt", () => {
  it("puts the caller's instructions in front of the hat, with the old separator", () => {
    expect(composeSystemPrompt("you audit renderers", "think in black")).toBe("you audit renderers\n\n---\n\nthink in black");
  });

  it("with no instructions it is the hat alone, and no dangling separator", () => {
    expect(composeSystemPrompt(undefined, "think in black")).toBe("think in black");
  });

  it("an empty string counts as no instructions", () => {
    expect(composeSystemPrompt("   ", "think in black")).toBe("think in black");
  });

  it("with an empty hat it is the instructions alone", () => {
    expect(composeSystemPrompt("you audit renderers", "")).toBe("you audit renderers");
  });
});

describe("parseTools", () => {
  it("reads a comma separated list", () => {
    expect(parseTools("read,bash")).toEqual(["read", "bash"]);
  });

  it("reads the bracketed form too", () => {
    expect(parseTools("[read, bash]")).toEqual(["read", "bash"]);
  });

  it("nothing means every tool, which is an empty list", () => {
    expect(parseTools(undefined)).toEqual([]);
  });

  it("drops the empty pieces a trailing comma leaves", () => {
    expect(parseTools("read,,bash,")).toEqual(["read", "bash"]);
  });
});

describe("sanitize", () => {
  it("removes ANSI escape codes", () => {
    expect(sanitize("\x1b[31mred\x1b[0m")).toBe("red");
    expect(sanitize("\x1b[1;32mbold green\x1b[0m")).toBe("bold green");
  });

  it("removes control characters (except tab/LF/CR)", () => {
    expect(sanitize("a\x01b\x02c")).toBe("abc");
    expect(sanitize("a\tb\nc\rd")).toBe("a\tb\nc\rd");
  });

  it("removes Unicode characters above U+00FF", () => {
    expect(sanitize("a→b")).toBe("ab");
  });

  it("leaves printable ASCII text untouched", () => {
    const s = "hello world [tool:Read] result 42";
    expect(sanitize(s)).toBe(s);
  });
});

describe("makeJobPaths", () => {
  it("all paths share the same base and have the right extension", () => {
    const paths = makeJobPaths("test-member");
    const base = paths.status.replace(/\.status$/, "");
    expect(paths.out).toBe(`${base}.out`);
    expect(paths.log).toBe(`${base}.log`);
    expect(paths.pid).toBe(`${base}.pid`);
  });
});

describe("sandboxExec", () => {
  const bwrapAvailable = spawnSync("which", ["bwrap"], { stdio: "ignore" }).status === 0;

  it.skipIf(!bwrapAvailable)("runs a binary and returns exit code 0", async () => {
    expect(await sandboxExec("true", [])).toBe(0);
  });

  it.skipIf(!bwrapAvailable)("forwards a non-zero exit code", async () => {
    expect(await sandboxExec("sh", ["-c", "exit 3"])).toBe(3);
  });

  it.skipIf(!bwrapAvailable)("the sandbox blocks writes outside the bind paths", async () => {
    // $HOME is ro-bind (only ~/.pi, ~/.bun, cwd and /tmp are writable)
    const code = await sandboxExec("sh", ["-c", `touch "$HOME/th-sandbox-test-${process.pid}" 2>/dev/null`]);
    expect(code).not.toBe(0);
  });
});

describe("checkStaleness (crash detection)", () => {
  function staleState(lastChangeMsAgo: number) {
    return { mtime: 0, lastChange: Date.now() - lastChangeMsAgo };
  }

  it("marks crashed when stale and PID dead", () => {
    const statusPath = join(TEST_BASE, "cs-dead.status");
    const pidPath = statusPath.replace(/\.status$/, ".pid");
    writeFileSync(statusPath, "running");
    writeFileSync(pidPath, "9999999");
    const state = staleState(OUT_STALE_MS + 1000);
    checkStaleness(statusPath, state, Date.now());
    expect(readFileSync(statusPath, "utf8")).toBe("error: process died unexpectedly");
  });

  it("does NOT mark crashed when stale but PID still alive", () => {
    const statusPath = join(TEST_BASE, "cs-alive.status");
    const pidPath = statusPath.replace(/\.status$/, ".pid");
    writeFileSync(statusPath, "running");
    writeFileSync(pidPath, String(process.pid));
    const state = staleState(OUT_STALE_MS + 1000);
    checkStaleness(statusPath, state, Date.now());
    expect(readFileSync(statusPath, "utf8")).toBe("running");
  });

  it("does NOT mark crashed when .out is fresh (not stale)", () => {
    const statusPath = join(TEST_BASE, "cs-fresh.status");
    const outPath = statusPath.replace(/\.status$/, ".out");
    const pidPath = statusPath.replace(/\.status$/, ".pid");
    writeFileSync(statusPath, "running");
    writeFileSync(outPath, "fresh output");
    writeFileSync(pidPath, "9999999");
    const state = { mtime: 0, lastChange: Date.now() };
    checkStaleness(statusPath, state, Date.now());
    expect(readFileSync(statusPath, "utf8")).toBe("running");
  });

  it("updates lastChange when the .out mtime changes", () => {
    const statusPath = join(TEST_BASE, "cs-mtime.status");
    const outPath = statusPath.replace(/\.status$/, ".out");
    writeFileSync(statusPath, "running");
    writeFileSync(outPath, "v1");
    const oldMtime = 1000;
    const state = { mtime: oldMtime, lastChange: Date.now() - OUT_STALE_MS - 1000 };
    checkStaleness(statusPath, state, Date.now());
    expect(state.mtime).not.toBe(oldMtime);
    expect(Date.now() - state.lastChange).toBeLessThan(1000);
  });
});
