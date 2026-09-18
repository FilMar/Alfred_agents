import { describe, it, expect, afterAll, beforeAll } from "bun:test";
import { mkdirSync, rmSync, unlinkSync, writeFileSync, readFileSync, utimesSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";

const TEST_TH_DB = "/tmp/th-test.db";
process.env.TH_DB_PATH = TEST_TH_DB;

const TEST_BASE = join(tmpdir(), `th-test-${Date.now()}`);
process.env.TH_MEMBERS_DIR = join(TEST_BASE, "local");
process.env.TH_TMP_MEMBERS_DIR = join(TEST_BASE, "tmp");
process.env.TH_GLOBAL_MEMBERS_DIR = join(TEST_BASE, "global");

const { insertRun, finishRun, getRun, listRuns } = await import("../tools/th/src/db.ts");
const { validateName, createMember, createMemberFrom, listMembers, promoteMember, ensureLocalMember, getMember, loadMember } =
  await import("../tools/th/src/members.ts");
const { waitForJobs, sanitize, checkStaleness, makeJobPaths, sandboxExec, OUT_STALE_MS } = await import("../tools/th/src/runner.ts");

function statusFile(name: string, content: string): string {
  const p = join(TEST_BASE, `status-${name}`);
  writeFileSync(p, content);
  return p;
}

beforeAll(() => {
  mkdirSync(join(TEST_BASE, "local"), { recursive: true });
  mkdirSync(join(TEST_BASE, "tmp"), { recursive: true });
  mkdirSync(join(TEST_BASE, "global"), { recursive: true });
});

afterAll(() => {
  for (const f of [TEST_TH_DB, `${TEST_TH_DB}-wal`, `${TEST_TH_DB}-shm`]) {
    try { unlinkSync(f); } catch {}
  }
  try { rmSync(TEST_BASE, { recursive: true, force: true }); } catch {}
});

function makeRun(overrides: Record<string, unknown> = {}) {
  return {
    id: crypto.randomUUID(),
    member: "test-member",
    task: "test task",
    started_at: new Date().toISOString(),
    status: "running" as const,
    ...overrides,
  };
}

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

describe("run history", () => {
  it("insert and get by full id", () => {
    const r = makeRun();
    insertRun(r);
    expect(getRun(r.id)).toMatchObject({ id: r.id, member: r.member, status: "running" });
  });

  it("get by id prefix", () => {
    const r = makeRun();
    insertRun(r);
    expect(getRun(r.id.slice(0, 8))).toMatchObject({ id: r.id });
  });

  it("get on a missing id → null", () => {
    expect(getRun("non-esiste")).toBeNull();
  });

  it("finishRun updates status and finished_at", () => {
    const r = makeRun();
    insertRun(r);
    finishRun(r.id, "done");
    const result = getRun(r.id);
    expect(result?.status).toBe("done");
    expect(result?.finished_at).toBeDefined();
  });

  it("finishRun saves tokens and cost", () => {
    const r = makeRun();
    insertRun(r);
    finishRun(r.id, "done", { inputTokens: 1200, outputTokens: 340, costUsd: 0.0123 });
    const result = getRun(r.id);
    expect(result?.input_tokens).toBe(1200);
    expect(result?.output_tokens).toBe(340);
    expect(result?.cost_usd).toBeCloseTo(0.0123);
  });

  it("finishRun without usage leaves tokens undefined", () => {
    const r = makeRun();
    insertRun(r);
    finishRun(r.id, "done");
    expect(getRun(r.id)?.input_tokens).toBeUndefined();
  });

  it("listRuns descending order by started_at", () => {
    const r1 = makeRun({ started_at: "2024-01-01T00:00:00.000Z" });
    const r2 = makeRun({ started_at: "2024-01-02T00:00:00.000Z" });
    insertRun(r1);
    insertRun(r2);
    const ids = listRuns({ limit: 50 }).map(r => r.id);
    expect(ids.indexOf(r2.id)).toBeLessThan(ids.indexOf(r1.id));
  });

  it("listRuns filters by member", () => {
    const r = makeRun({ member: "member-specific" });
    insertRun(r);
    const results = listRuns({ member: "member-specific" });
    expect(results.every(x => x.member === "member-specific")).toBe(true);
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

describe("hat by reference", () => {
  it("resolves the hat at runtime: changing it updates the member, no snapshot", () => {
    const hatsDir = join(TEST_BASE, "hats-ref");
    mkdirSync(hatsDir, { recursive: true });
    const prev = process.env.TH_HATS_DIR;
    process.env.TH_HATS_DIR = hatsDir;
    try {
      const hatPath = join(hatsDir, "ref-core.md");
      writeFileSync(hatPath, "HAT V1");
      createMember("ref-test", "ref-core", "test role", ["read"]);

      // the member file does NOT contain the hat text: only the reference
      const fileContent = readFileSync(join(process.env.TH_MEMBERS_DIR!, "ref-test.md"), "utf8");
      expect(fileContent).toContain("hat: ref-core");
      expect(fileContent).not.toContain("HAT V1");

      const v1 = loadMember("ref-test").systemPrompt;
      expect(v1).toContain("test role");
      expect(v1).toContain("HAT V1");

      // the hat changes; the member is not recreated → loadMember reflects the new version
      writeFileSync(hatPath, "HAT V2");
      const v2 = loadMember("ref-test").systemPrompt;
      expect(v2).toContain("HAT V2");
      expect(v2).not.toContain("HAT V1");
    } finally {
      if (prev === undefined) delete process.env.TH_HATS_DIR;
      else process.env.TH_HATS_DIR = prev;
    }
  });
});

describe("member globals", () => {
  it("promote moves local → global", () => {
    createMember("promo-test", "blue-core", "test role", ["read"]);
    promoteMember("promo-test");
    const groups = listMembers({ global: true });
    expect(groups.global.some(m => m.name === "promo-test")).toBe(true);
  });

  it("promote fails when global already exists without --force", () => {
    createMember("promo-force", "blue-core", "ruolo", ["read"]);
    promoteMember("promo-force");
    expect(() => promoteMember("promo-force")).toThrow(/already exists/);
  });

  it("promote with --force overwrites", () => {
    createMember("promo-overwrite", "blue-core", "original", ["read"]);
    promoteMember("promo-overwrite");
    // create a new local member with a different role and promote with force
    const localPath = join(process.env.TH_MEMBERS_DIR!, "promo-overwrite.md");
    rmSync(localPath);
    createMember("promo-overwrite", "black-core", "updated", ["read"]);
    expect(() => promoteMember("promo-overwrite", true)).not.toThrow();
    expect(getMember("promo-overwrite").hat).toBe("black-core");
  });

  it("createMemberFrom creates a local member from a global one", () => {
    createMember("base-global", "yellow-core", "base role", ["read"]);
    promoteMember("base-global");
    createMemberFrom("local-from-global", "base-global");
    const groups = listMembers({ local: true });
    expect(groups.local.some(m => m.name === "local-from-global")).toBe(true);
  });

  it("createMemberFrom fails when global does not exist", () => {
    expect(() => createMemberFrom("nobody", "nonexistent")).toThrow(/not found/);
  });

  it("ensureLocalMember does nothing when it already exists locally", () => {
    createMember("already-local", "blue-core", "ruolo", ["read"]);
    expect(ensureLocalMember("already-local")).toBe(false);
  });

  it("ensureLocalMember auto-instantiates from global when missing in local/tmp", () => {
    createMember("only-global", "blue-core", "ruolo", ["read"]);
    promoteMember("only-global");
    rmSync(join(process.env.TH_MEMBERS_DIR!, "only-global.md"));
    expect(ensureLocalMember("only-global")).toBe(true);
    // now it exists locally
    expect(ensureLocalMember("only-global")).toBe(false);
  });

  it("ensureLocalMember throws when found nowhere", () => {
    expect(() => ensureLocalMember("does-not-exist-at-all")).toThrow(/not found/);
  });

  it("listMembers without filters returns 3 groups", () => {
    const groups = listMembers();
    expect(groups).toHaveProperty("local");
    expect(groups).toHaveProperty("global");
    expect(groups).toHaveProperty("tmp");
  });

  it("listMembers --local does not include global or tmp", () => {
    const groups = listMembers({ local: true });
    expect(groups.global).toHaveLength(0);
    expect(groups.tmp).toHaveLength(0);
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
