import { describe, it, expect, afterAll, beforeAll } from "bun:test";
import { mkdirSync, rmSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// ─── Test Environment ─────────────────────────────────────────────────────────

const TEST_BASE = join(tmpdir(), `orch-test-${Date.now()}`);
process.env.ORCH_DIR = TEST_BASE;

const { extractMetadata } = await import("../tools/orchestrator/src/metadata.js");
const { registerTask, listTasks, getTask, validateName, writeEntry, updateVerdict } =
  await import("../tools/orchestrator/src/catalog.js");
const { createPending, transition, locate, recover, listByState, ensureQueueDirs } =
  await import("../tools/orchestrator/src/queue.js");
const { createScheduler } = await import("../tools/orchestrator/src/scheduler.js");
const { startServer } = await import("../tools/orchestrator/src/server.js");
const { Cron } = await import("croner");

beforeAll(() => {
  mkdirSync(TEST_BASE, { recursive: true });
});

afterAll(() => {
  try { rmSync(TEST_BASE, { recursive: true, force: true }); } catch {}
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VALID_SOURCE = `
export const requiresDesktop = false;
export const schedule = "*/5 * * * *";
export const timeoutSec = 60;

console.log("hello");
`;

const SENTINEL_SOURCE = `
export const requiresDesktop = true;
export const schedule = "*/10 * * * *";

import { writeFileSync } from "node:fs";
writeFileSync("${join(TEST_BASE, "SENTINEL")}", "EXECUTED");
`;

function makePassTask(name: string): ReturnType<typeof writeEntry> {
  writeEntry({
    name,
    schedule: "* * * * * *",
    requiresDesktop: false,
    verdict: "PASS",
  }, TEST_BASE);
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

describe("extractMetadata", () => {
  it("parses schedule, requiresDesktop, timeoutSec", () => {
    const meta = extractMetadata(VALID_SOURCE);
    expect(meta.schedule).toBe("*/5 * * * *");
    expect(meta.requiresDesktop).toBe(false);
    expect(meta.timeoutSec).toBe(60);
  });

  it("parses without timeoutSec (optional)", () => {
    const src = `export const requiresDesktop = true;\nexport const schedule = "0 9 * * *";\n`;
    const meta = extractMetadata(src);
    expect(meta.requiresDesktop).toBe(true);
    expect(meta.schedule).toBe("0 9 * * *");
    expect(meta.timeoutSec).toBeUndefined();
  });

  it("rejects source missing schedule", () => {
    expect(() => extractMetadata(`export const requiresDesktop = true;\n`)).toThrow(/schedule/);
  });

  it("rejects source missing requiresDesktop", () => {
    expect(() => extractMetadata(`export const schedule = "*/5 * * * *";\n`)).toThrow(/requiresDesktop/);
  });

  it("MUST NOT execute script code during parsing", () => {
    const sentinelPath = join(TEST_BASE, "SENTINEL");
    if (existsSync(sentinelPath)) rmSync(sentinelPath);

    extractMetadata(SENTINEL_SOURCE);

    expect(existsSync(sentinelPath)).toBe(false);
  });

  it("MUST NOT execute script code during registerTask", () => {
    const sentinelPath = join(TEST_BASE, "SENTINEL");
    if (existsSync(sentinelPath)) rmSync(sentinelPath);

    registerTask("sentinel-register", SENTINEL_SOURCE, TEST_BASE);

    expect(existsSync(sentinelPath)).toBe(false);
  });
});

// ─── Catalog ──────────────────────────────────────────────────────────────────

describe("catalog", () => {
  it("registerTask stores script + entry with UNAUDITED verdict", () => {
    const entry = registerTask("cat-basic", VALID_SOURCE, TEST_BASE);
    expect(entry.name).toBe("cat-basic");
    expect(entry.verdict).toBe("UNAUDITED");
    expect(entry.schedule).toBe("*/5 * * * *");

    const fetched = getTask("cat-basic", TEST_BASE);
    expect(fetched).not.toBeNull();
    expect(fetched?.verdict).toBe("UNAUDITED");
  });

  it("listTasks returns all registered entries", () => {
    registerTask("cat-list-a", VALID_SOURCE, TEST_BASE);
    registerTask("cat-list-b", VALID_SOURCE, TEST_BASE);
    const names = listTasks(TEST_BASE).map((t) => t.name);
    expect(names).toContain("cat-list-a");
    expect(names).toContain("cat-list-b");
  });

  it("getTask returns null for unregistered name", () => {
    expect(getTask("nonexistent", TEST_BASE)).toBeNull();
  });

  it("updateVerdict changes the verdict in the catalog", () => {
    registerTask("cat-verdict", VALID_SOURCE, TEST_BASE);
    const updated = updateVerdict("cat-verdict", "PASS", TEST_BASE);
    expect(updated.verdict).toBe("PASS");
    expect(getTask("cat-verdict", TEST_BASE)?.verdict).toBe("PASS");
  });

  it("validateName rejects path traversal", () => {
    expect(() => validateName("../etc/passwd")).toThrow();
    expect(() => validateName("a/b")).toThrow();
    expect(() => validateName("")).toThrow();
    expect(() => validateName("mario rossi")).toThrow();
    expect(() => validateName("mario.rossi")).toThrow();
    expect(() => validateName("valid_name-1")).not.toThrow();
  });

  it("T4: rejects duplicate task name on registration", () => {
    registerTask("cat-dup", VALID_SOURCE, TEST_BASE);
    const originalEntry = getTask("cat-dup", TEST_BASE);
    const originalScript = readFileSync(join(TEST_BASE, "scripts", "cat-dup.ts"), "utf-8");

    expect(() => registerTask("cat-dup", VALID_SOURCE.replace("*/5", "*/10"), TEST_BASE)).toThrow(/already registered/);

    const afterEntry = getTask("cat-dup", TEST_BASE);
    expect(afterEntry?.schedule).toBe(originalEntry?.schedule);
    const afterScript = readFileSync(join(TEST_BASE, "scripts", "cat-dup.ts"), "utf-8");
    expect(afterScript).toBe(originalScript);
  });
});

// ─── Queue ────────────────────────────────────────────────────────────────────

describe("queue", () => {
  it("createPending writes to pending/", () => {
    ensureQueueDirs(TEST_BASE);
    const inst = { id: crypto.randomUUID(), taskName: "q-create", createdAt: new Date().toISOString(), scheduledFor: new Date().toISOString() };
    createPending(inst, TEST_BASE);
    const located = locate(inst.id, TEST_BASE);
    expect(located).not.toBeNull();
    expect(located?.state).toBe("pending");
  });

  it("transition moves instance atomically via renameSync", () => {
    const inst = { id: crypto.randomUUID(), taskName: "q-trans", createdAt: new Date().toISOString(), scheduledFor: new Date().toISOString() };
    createPending(inst, TEST_BASE);
    transition(inst.id, "pending", "processing", TEST_BASE);
    expect(locate(inst.id, TEST_BASE)?.state).toBe("processing");
    transition(inst.id, "processing", "completed", TEST_BASE);
    expect(locate(inst.id, TEST_BASE)?.state).toBe("completed");
  });

  it("locate returns null for unknown id", () => {
    expect(locate("nonexistent-id", TEST_BASE)).toBeNull();
  });

  it("recover moves orphans from processing/ back to pending/", () => {
    const inst = { id: crypto.randomUUID(), taskName: "q-recover", createdAt: new Date().toISOString(), scheduledFor: new Date().toISOString() };
    createPending(inst, TEST_BASE);
    transition(inst.id, "pending", "processing", TEST_BASE);
    expect(locate(inst.id, TEST_BASE)?.state).toBe("processing");

    const count = recover(TEST_BASE);
    expect(count).toBeGreaterThanOrEqual(1);
    expect(locate(inst.id, TEST_BASE)?.state).toBe("pending");
  });

  it("listByState returns instances in a given state", () => {
    const inst = { id: crypto.randomUUID(), taskName: "q-list", createdAt: new Date().toISOString(), scheduledFor: new Date().toISOString() };
    createPending(inst, TEST_BASE);
    const pending = listByState("pending", TEST_BASE);
    expect(pending.some((i) => i.id === inst.id)).toBe(true);
  });
});

// ─── Scheduler ────────────────────────────────────────────────────────────────

describe("scheduler", () => {
  it("enqueues a due PASS task into pending/", () => {
    makePassTask("sched-due");
    const sched = createScheduler(TEST_BASE, 100);
    sched.start();

    // Give it a tick
    const deadline = Date.now() + 3000;
    let found = false;
    while (Date.now() < deadline) {
      const pending = listByState("pending", TEST_BASE);
      if (pending.some((i) => i.taskName === "sched-due")) {
        found = true;
        break;
      }
      Bun.sleepSync(100);
    }
    sched.stop();
    expect(found).toBe(true);
  });

  it("skips UNAUDITED tasks", () => {
    registerTask("sched-unaudited", VALID_SOURCE, TEST_BASE);
    const pendingBefore = listByState("pending", TEST_BASE).filter((i) => i.taskName === "sched-unaudited").length;

    const sched = createScheduler(TEST_BASE, 100);
    sched.start();
    Bun.sleepSync(300);
    sched.stop();

    const pendingAfter = listByState("pending", TEST_BASE).filter((i) => i.taskName === "sched-unaudited").length;
    expect(pendingAfter).toBe(pendingBefore);
  });

  it("does not double-enqueue the same due slot", () => {
    makePassTask("sched-no-double");
    const sched = createScheduler(TEST_BASE, 100);
    sched.start();
    Bun.sleepSync(500);
    sched.stop();

    const instances = listByState("pending", TEST_BASE).filter((i) => i.taskName === "sched-no-double");
    const uniqueSlots = new Set(instances.map((i) => i.scheduledFor));
    // Multiple ticks may have happened, but for the same scheduledFor slot
    // there should be at most one instance.
    for (const slot of uniqueSlots) {
      const count = instances.filter((i) => i.scheduledFor === slot).length;
      expect(count).toBe(1);
    }
  });

  it("T3: does not re-enqueue a completed instance in the same due slot", () => {
    writeEntry({
      name: "sched-completed-slot",
      schedule: "* * * * *",
      requiresDesktop: false,
      verdict: "PASS",
    }, TEST_BASE);

    const slot = new Cron("* * * * *").previousRuns(1, new Date())[0].toISOString();

    const completedInst = {
      id: crypto.randomUUID(),
      taskName: "sched-completed-slot",
      createdAt: new Date().toISOString(),
      scheduledFor: slot,
    };
    createPending(completedInst, TEST_BASE);
    transition(completedInst.id, "pending", "completed", TEST_BASE);
    expect(locate(completedInst.id, TEST_BASE)?.state).toBe("completed");

    const sched = createScheduler(TEST_BASE, 100);
    sched.start();
    sched.stop();

    const pendingForSlot = listByState("pending", TEST_BASE).filter(
      (i) => i.taskName === "sched-completed-slot" && i.scheduledFor === slot,
    );
    expect(pendingForSlot.length).toBe(0);
  });

  it("T6: FAIL and WARNING verdicts are not schedulable", () => {
    writeEntry({ name: "sched-fail", schedule: "* * * * *", requiresDesktop: false, verdict: "FAIL" }, TEST_BASE);
    writeEntry({ name: "sched-warning", schedule: "* * * * *", requiresDesktop: false, verdict: "WARNING" }, TEST_BASE);

    const pendingBefore = listByState("pending", TEST_BASE).filter(
      (i) => i.taskName === "sched-fail" || i.taskName === "sched-warning",
    ).length;

    const sched = createScheduler(TEST_BASE, 100);
    sched.start();
    Bun.sleepSync(500);
    sched.stop();

    const pendingAfter = listByState("pending", TEST_BASE).filter(
      (i) => i.taskName === "sched-fail" || i.taskName === "sched-warning",
    ).length;
    expect(pendingAfter).toBe(pendingBefore);
  });
});

// ─── REST API ─────────────────────────────────────────────────────────────────

describe("REST API", () => {
  const port = 17717 + Math.floor(Math.random() * 1000);
  let server: ReturnType<typeof startServer>;

  beforeAll(() => {
    server = startServer(port, TEST_BASE);
  });

  afterAll(() => {
    server.stop();
  });

  function baseUrl() {
    return `http://localhost:${port}`;
  }

  it("POST /add_task registers a task and returns the entry", async () => {
    const res = await fetch(`${baseUrl()}/add_task`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "api-add", source: VALID_SOURCE }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("api-add");
    expect(body.verdict).toBe("UNAUDITED");
  });

  it("POST /add_task with missing fields → 400", async () => {
    const res = await fetch(`${baseUrl()}/add_task`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "api-bad" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("POST /add_task with invalid source → 400", async () => {
    const res = await fetch(`${baseUrl()}/add_task`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "api-bad-src", source: "no metadata here" }),
    });
    expect(res.status).toBe(400);
  });

  it("GET /list_tasks returns catalog", async () => {
    const res = await fetch(`${baseUrl()}/list_tasks`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    const names = body.map((t: { name: string }) => t.name);
    expect(names).toContain("api-add");
  });

  it("GET /get_task_status/<id> returns the instance with status", async () => {
    const inst = { id: crypto.randomUUID(), taskName: "api-status", createdAt: new Date().toISOString(), scheduledFor: new Date().toISOString() };
    createPending(inst, TEST_BASE);

    const res = await fetch(`${baseUrl()}/get_task_status/${inst.id}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(inst.id);
    expect(body.status).toBe("pending");
  });

  it("GET /get_task_status/<unknown> → 404", async () => {
    const res = await fetch(`${baseUrl()}/get_task_status/nonexistent-id`);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("unknown route → 404", async () => {
    const res = await fetch(`${baseUrl()}/unknown_route`);
    expect(res.status).toBe(404);
  });

  it("T2: rejects invalid cron schedule at ingestion", async () => {
    const badSource = `export const requiresDesktop = false;\nexport const schedule = "garbage not cron";\n`;
    const res = await fetch(`${baseUrl()}/add_task`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "bad-cron", source: badSource }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("invalid cron schedule");

    expect(existsSync(join(TEST_BASE, "scripts", "bad-cron.ts"))).toBe(false);
    expect(existsSync(join(TEST_BASE, "registered", "bad-cron.json"))).toBe(false);
  });

  it("T2: accepts valid cron schedule (regression guard)", async () => {
    const res = await fetch(`${baseUrl()}/add_task`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "good-cron", source: VALID_SOURCE }),
    });
    expect(res.status).toBe(200);
  });

  it("T4: rejects duplicate task name via REST", async () => {
    const first = await fetch(`${baseUrl()}/add_task`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "api-dup", source: VALID_SOURCE }),
    });
    expect(first.status).toBe(200);

    const originalScript = readFileSync(join(TEST_BASE, "scripts", "api-dup.ts"), "utf-8");

    const second = await fetch(`${baseUrl()}/add_task`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "api-dup", source: VALID_SOURCE.replace("*/5", "*/10") }),
    });
    expect(second.status).toBe(400);
    const body = await second.json();
    expect(body.error).toContain("already registered");

    const afterScript = readFileSync(join(TEST_BASE, "scripts", "api-dup.ts"), "utf-8");
    expect(afterScript).toBe(originalScript);
  });

  it("T5: POST /run_task and POST /i_wake return 404", async () => {
    const r1 = await fetch(`${baseUrl()}/run_task`, { method: "POST", body: "{}" });
    expect(r1.status).toBe(404);
    const r2 = await fetch(`${baseUrl()}/i_wake`, { method: "POST", body: "{}" });
    expect(r2.status).toBe(404);
  });

  it("C4: malformed JSON body → 400 JSON error", async () => {
    const res = await fetch(`${baseUrl()}/add_task`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not valid json",
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("invalid JSON body");
  });
});

// ─── Corrupt JSON Resilience ─────────────────────────────────────────────────

describe("corrupt JSON resilience", () => {
  it("T1: survives corrupt JSON in pending/ and registered/, valid entries still work", async () => {
    const base = join(tmpdir(), `orch-corrupt-${Date.now()}`);
    mkdirSync(base, { recursive: true });

    writeEntry({
      name: "corrupt-pass",
      schedule: "* * * * *",
      requiresDesktop: false,
      verdict: "PASS",
    }, base);

    ensureQueueDirs(base);
    writeFileSync(join(base, "queue", "pending", "broken.json"), "{ broken ]", "utf-8");
    writeFileSync(join(base, "registered", "broken.json"), "{ broken ]", "utf-8");

    const sched = createScheduler(base, 100);
    sched.start();
    Bun.sleepSync(300);
    sched.stop();

    const pending = listByState("pending", base);
    expect(pending.some((i) => i.taskName === "corrupt-pass")).toBe(true);

    const tasks = listTasks(base);
    expect(tasks.map((t) => t.name)).toContain("corrupt-pass");
    expect(tasks.map((t) => t.name)).not.toContain("broken");

    expect(locate("broken", base)).toBeNull();

    const cport = 17800 + Math.floor(Math.random() * 1000);
    const srv = startServer(cport, base);
    try {
      const listRes = await fetch(`http://localhost:${cport}/list_tasks`);
      expect(listRes.status).toBe(200);
      const listBody = await listRes.json();
      expect(Array.isArray(listBody)).toBe(true);

      const statusRes = await fetch(`http://localhost:${cport}/get_task_status/nonexistent-id`);
      expect(statusRes.status).toBe(404);
    } finally {
      srv.stop();
      rmSync(base, { recursive: true, force: true });
    }
  });
});