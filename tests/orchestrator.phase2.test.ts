import { describe, it, expect, afterAll, beforeAll, beforeEach } from "bun:test";
import { mkdirSync, rmSync, writeFileSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// ─── Test Environment ─────────────────────────────────────────────────────────

const TEST_BASE = join(tmpdir(), `orch-p2-test-${Date.now()}`);
process.env.ORCH_DIR = TEST_BASE;

const { buildMagicPacket, sendWol } = await import("../tools/orchestrator/src/wol.js");
const { computeWakeAction, readWakeState, writeWakeState, clearWakeState } = await import("../tools/orchestrator/src/wake.js");
const { buildDispatchPlan } = await import("../tools/orchestrator/src/dispatch.js");
const { executeLocal, executeRemote, dispatchWake } = await import("../tools/orchestrator/src/executor.js");
const { recover, createPending, transition, ensureQueueDirs, listByState, locate } = await import("../tools/orchestrator/src/queue.js");
const { startServer } = await import("../tools/orchestrator/src/server.js");
const { createScheduler } = await import("../tools/orchestrator/src/scheduler.js");
const { writeEntry } = await import("../tools/orchestrator/src/catalog.js");
import type { RunInstance, RaspberryTask, WakeState, ExecutorDeps } from "../tools/orchestrator/src/types.js";

beforeAll(() => {
  mkdirSync(TEST_BASE, { recursive: true });
});

afterAll(() => {
  try { rmSync(TEST_BASE, { recursive: true, force: true }); } catch {}
});

beforeEach(() => {
  // Clean queue and catalog between tests
  const dirs = ["queue/pending", "queue/processing", "queue/completed", "queue/failed", "scripts", "registered"];
  for (const d of dirs) {
    const path = join(TEST_BASE, d);
    if (existsSync(path)) {
      rmSync(path, { recursive: true, force: true });
    }
  }
  ensureQueueDirs(TEST_BASE);
  // Clear wake.json
  try { rmSync(join(TEST_BASE, "wake.json"), { force: true }); } catch {}
});

// ─── WoL Tests ────────────────────────────────────────────────────────────────

describe("WoL", () => {
  it("buildMagicPacket produces 102 bytes with 6x0xFF and 16xMAC", () => {
    const mac = "aa:bb:cc:dd:ee:ff";
    const packet = buildMagicPacket(mac);
    expect(packet.length).toBe(102);
    for (let i = 0; i < 6; i++) expect(packet[i]).toBe(0xff);
    for (let group = 0; group < 16; group++) {
      const offset = 6 + group * 6;
      expect(packet[offset]).toBe(0xaa);
      expect(packet[offset + 1]).toBe(0xbb);
      expect(packet[offset + 2]).toBe(0xcc);
      expect(packet[offset + 3]).toBe(0xdd);
      expect(packet[offset + 4]).toBe(0xee);
      expect(packet[offset + 5]).toBe(0xff);
    }
  });

  it("buildMagicPacket accepts different MAC formats", () => {
    const p1 = buildMagicPacket("aa:bb:cc:dd:ee:ff");
    const p2 = buildMagicPacket("AA-BB-CC-DD-EE-FF");
    expect(p1).toEqual(p2);
  });

  it("buildMagicPacket throws on invalid MAC", () => {
    expect(() => buildMagicPacket("aa:bb:cc")).toThrow(/MAC/i);
    expect(() => buildMagicPacket("aa:bb:cc:dd:ee:gg")).toThrow(/MAC/i);
  });

  it("sendWol calls injectable udpSend", async () => {
    const udpSend = async (p: Uint8Array) => {
      expect(p.length).toBe(102);
    };
    await sendWol("aa:bb:cc:dd:ee:ff", { udpSend });
  });
});

// ─── Wake Logic Tests ──────────────────────────────────────────────────────────

describe("Wake Logic", () => {
  const now = new Date("2026-07-17T12:00:00Z");
  const bootTimeoutMin = 5;

  it("computeWakeAction: no state -> send-wol", () => {
    expect(computeWakeAction(null, now, bootTimeoutMin).action).toBe("send-wol");
  });

  it("computeWakeAction: WoL sent, still within boot timeout -> none", () => {
    const state: WakeState = {
      sentAt: new Date(now.getTime() - 60_000).toISOString(),
      attempts: 1,
      alerted: false,
    };
    expect(computeWakeAction(state, now, bootTimeoutMin).action).toBe("none");
  });

  it("computeWakeAction: boot timeout passed, attempts=1 -> retry-wol", () => {
    const state: WakeState = {
      sentAt: new Date(now.getTime() - (bootTimeoutMin + 1) * 60_000).toISOString(),
      attempts: 1,
      alerted: false,
    };
    expect(computeWakeAction(state, now, bootTimeoutMin).action).toBe("retry-wol");
  });

  it("computeWakeAction: boot timeout passed, attempts=2 -> alert", () => {
    const state: WakeState = {
      sentAt: new Date(now.getTime() - (bootTimeoutMin + 1) * 60_000).toISOString(),
      attempts: 2,
      alerted: false,
    };
    expect(computeWakeAction(state, now, bootTimeoutMin).action).toBe("alert");
  });

  it("computeWakeAction: alerted=true -> none", () => {
    const state: WakeState = {
      sentAt: new Date(now.getTime() - (bootTimeoutMin + 1) * 60_000).toISOString(),
      attempts: 2,
      alerted: true,
    };
    expect(computeWakeAction(state, now, bootTimeoutMin).action).toBe("none");
  });

  it("wake state persistence: read/write roundtrip", () => {
    const state: WakeState = { sentAt: now.toISOString(), attempts: 1, alerted: false };
    writeWakeState(state, TEST_BASE);
    expect(readWakeState(TEST_BASE)).toEqual(state);
  });

  it("wake state persistence: clear removes file", () => {
    writeWakeState({ sentAt: now.toISOString(), attempts: 1, alerted: false }, TEST_BASE);
    clearWakeState(TEST_BASE);
    expect(readWakeState(TEST_BASE)).toBeNull();
  });

  it("wake state persistence: missing file -> null", () => {
    expect(readWakeState(TEST_BASE)).toBeNull();
  });

  it("wake state persistence: corrupt JSON does not crash", () => {
    writeFileSync(join(TEST_BASE, "wake.json"), "{ invalid ]", "utf-8");
    expect(readWakeState(TEST_BASE)).toBeNull();
  });
});

// ─── Dispatch Planning Tests ─────────────────────────────────────────────────

describe("Dispatch Plan", () => {
  const host = "desktop.local";
  const tasks: RaspberryTask[] = [
    { name: "d1", schedule: "*", requiresDesktop: true, verdict: "PASS" },
    { name: "l1", schedule: "*", requiresDesktop: false, verdict: "PASS" },
  ];
  const instances: RunInstance[] = [
    { id: "inst-d1", taskName: "d1", createdAt: "...", scheduledFor: "..." },
    { id: "inst-l1", taskName: "l1", createdAt: "...", scheduledFor: "..." },
    { id: "inst-missing", taskName: "unknown", createdAt: "...", scheduledFor: "..." },
  ];

  it("buildDispatchPlan filters non-desktop and missing tasks", () => {
    const plan = buildDispatchPlan(instances, tasks, host, TEST_BASE);
    expect(plan.length).toBe(1);
    expect(plan[0].instanceId).toBe("inst-d1");
    expect(plan[0].scpArgv).toContain(join("scripts", "d1.ts"));
    expect(plan[0].sshArgv).toContain("th sandbox-exec -- bun run");
    expect(plan[0].sshArgv).toContain(host);
  });
});

// ─── Executor Tests ───────────────────────────────────────────────────────────

describe("Executor", () => {
  const deps: ExecutorDeps = {
    sendWol: async () => {},
    pingHost: async () => false,
    runCommand: async (argv) => {
      if (argv.includes("fail")) return { exitCode: 1 };
      return { exitCode: 0 };
    },
  };

  it("executeLocal transitions to completed on exit 0", async () => {
    const inst = { id: "loc-ok", taskName: "t1", createdAt: "...", scheduledFor: "..." };
    const task = { name: "t1", schedule: "*", requiresDesktop: false, verdict: "PASS" } as RaspberryTask;
    createPending(inst, TEST_BASE);
    
    await executeLocal(inst, task, { ...deps, runLocal: async () => ({ exitCode: 0 }) }, TEST_BASE);
    expect(locate(inst.id, TEST_BASE)?.state).toBe("completed");
  });

  it("executeLocal transitions to failed on exit 1", async () => {
    const inst = { id: "loc-fail", taskName: "t1-fail", createdAt: "...", scheduledFor: "..." };
    const task = { name: "t1-fail", schedule: "*", requiresDesktop: false, verdict: "PASS" } as RaspberryTask;
    createPending(inst, TEST_BASE);
    
    await executeLocal(inst, task, { ...deps, runLocal: async () => ({ exitCode: 1 }) }, TEST_BASE);
    expect(locate(inst.id, TEST_BASE)?.state).toBe("failed");
  });

  it("executeRemote transitions based on scp/ssh success", async () => {
    const planEntry = {
      instanceId: "rem-ok",
      scpArgv: ["scp", "src", "dst"],
      sshArgv: ["ssh", "host", "cmd"],
    };
    createPending({ id: "rem-ok", taskName: "t", createdAt: "...", scheduledFor: "..." }, TEST_BASE);
    
    await executeRemote(planEntry, deps, TEST_BASE);
    expect(locate("rem-ok", TEST_BASE)?.state).toBe("completed");
  });

  it("executeRemote fails if scp fails and does not run ssh", async () => {
    const planEntry = {
      instanceId: "rem-fail",
      scpArgv: ["scp", "fail"],
      sshArgv: ["ssh", "host", "cmd"],
    };
    createPending({ id: "rem-fail", taskName: "t", createdAt: "...", scheduledFor: "..." }, TEST_BASE);
    
    let sshCalled = false;
    const customDeps: ExecutorDeps = {
      sendWol: async () => {},
      pingHost: async () => false,
      runCommand: async (argv) => {
        if (argv[0] === "ssh") sshCalled = true;
        if (argv.includes("fail")) return { exitCode: 1 };
        return { exitCode: 0 };
      },
    };
    
    await executeRemote(planEntry, customDeps, TEST_BASE);
    expect(locate("rem-fail", TEST_BASE)?.state).toBe("failed");
    expect(sshCalled).toBe(false);
  });

  it("dispatchWake executes all due desktop tasks and skips FAIL verdict", async () => {
    // Setup 2 PASS desktop tasks and 1 FAIL desktop task
    writeEntry({ name: "dp-ok-1", schedule: "*", requiresDesktop: true, verdict: "PASS" }, TEST_BASE);
    writeEntry({ name: "dp-ok-2", schedule: "*", requiresDesktop: true, verdict: "PASS" }, TEST_BASE);
    writeEntry({ name: "dp-fail", schedule: "*", requiresDesktop: true, verdict: "FAIL" }, TEST_BASE);

    const inst1 = { id: "i1", taskName: "dp-ok-1", createdAt: "...", scheduledFor: "..." };
    const inst2 = { id: "i2", taskName: "dp-ok-2", createdAt: "...", scheduledFor: "..." };
    const inst3 = { id: "i3", taskName: "dp-fail", createdAt: "...", scheduledFor: "..." };
    createPending(inst1, TEST_BASE);
    createPending(inst2, TEST_BASE);
    createPending(inst3, TEST_BASE);

    await dispatchWake(deps, TEST_BASE);
    
    expect(locate("i1", TEST_BASE)?.state).toBe("completed");
    expect(locate("i2", TEST_BASE)?.state).toBe("completed");
    expect(locate("i3", TEST_BASE)?.state).toBe("pending"); // Should be skipped
  });
});

// ─── Scheduler Ping Reconciliation ────────────────────────────────────────────

describe("Scheduler Ping Reconciliation", () => {
  // Next run far outside the lead window, so only the pending instance matters.
  const farSchedule = "0 0 1 1 *";

  beforeAll(() => {
    process.env.DESKTOP_MAC = "aa:bb:cc:dd:ee:ff";
  });

  afterAll(() => {
    delete process.env.DESKTOP_MAC;
  });

  it("desktop up: pending desktop instance dispatched directly, no WoL sent", async () => {
    writeEntry({ name: "ping-up", schedule: farSchedule, requiresDesktop: true, verdict: "PASS" }, TEST_BASE);
    createPending({ id: "ping-up-i", taskName: "ping-up", createdAt: "...", scheduledFor: "..." }, TEST_BASE);

    let wolSent = false;
    const deps: ExecutorDeps = {
      sendWol: async () => { wolSent = true; },
      pingHost: async () => true,
      runCommand: async () => ({ exitCode: 0 }),
    };

    const sched = createScheduler(TEST_BASE, 60_000, deps);
    sched.start();
    const deadline = Date.now() + 3000;
    while (Date.now() < deadline && locate("ping-up-i", TEST_BASE)?.state !== "completed") {
      await Bun.sleep(50);
    }
    sched.stop();

    expect(locate("ping-up-i", TEST_BASE)?.state).toBe("completed");
    expect(wolSent).toBe(false);
    expect(existsSync(join(TEST_BASE, "wake.json"))).toBe(false);
  });

  it("desktop down: WoL sent, wake state written, instance stays pending", async () => {
    writeEntry({ name: "ping-down", schedule: farSchedule, requiresDesktop: true, verdict: "PASS" }, TEST_BASE);
    createPending({ id: "ping-down-i", taskName: "ping-down", createdAt: "...", scheduledFor: "..." }, TEST_BASE);

    let wolCount = 0;
    const deps: ExecutorDeps = {
      sendWol: async () => { wolCount++; },
      pingHost: async () => false,
      runCommand: async () => ({ exitCode: 0 }),
    };

    const sched = createScheduler(TEST_BASE, 60_000, deps);
    sched.start();
    const deadline = Date.now() + 3000;
    while (Date.now() < deadline && wolCount === 0) {
      await Bun.sleep(50);
    }
    sched.stop();

    expect(wolCount).toBe(1);
    expect(locate("ping-down-i", TEST_BASE)?.state).toBe("pending");
    expect(readWakeState(TEST_BASE)?.attempts).toBe(1);
  });
});

// ─── Queue Recovery Collision Guard ───────────────────────────────────────────

describe("Queue Recovery", () => {
  it("recover() does not overwrite pending files and leaves orphan in processing/", () => {
    const id = "collision-id";
    const inst = { id, taskName: "t", createdAt: "...", scheduledFor: "..." };
    
    // Setup: a file in processing/ and a file in pending/ with same ID
    ensureQueueDirs(TEST_BASE);
    writeFileSync(join(TEST_BASE, "queue", "processing", `${id}.json`), JSON.stringify(inst), "utf-8");
    writeFileSync(join(TEST_BASE, "queue", "pending", `${id}.json`), JSON.stringify(inst), "utf-8");
    
    recover(TEST_BASE);
    
    const pendingFiles = readdirSync(join(TEST_BASE, "queue", "pending"));
    const processingFiles = readdirSync(join(TEST_BASE, "queue", "processing"));

    expect(pendingFiles.length).toBe(1);
    expect(pendingFiles[0]).toBe(`${id}.json`);
    expect(processingFiles.length).toBe(1);
    expect(processingFiles[0]).toBe(`${id}.json`);
    
    // Ensure no timestamped recovery files were created
    expect(pendingFiles.some(f => f.includes(`${id}`) && f !== `${id}.json`)).toBe(false);
  });
});

// ─── Server API Tests ─────────────────────────────────────────────────────────

describe("Server API Phase 2", () => {
  const port = 18888 + Math.floor(Math.random() * 1000);
  let server: ReturnType<typeof startServer>;

  beforeAll(() => {
    server = startServer(port, TEST_BASE);
  });

  afterAll(() => {
    server.stop();
  });

  it("POST /i_wake returns 200 and triggers dispatch", async () => {
    // Mock a desktop task and instance
    writeEntry({ name: "api-wake-task", schedule: "*", requiresDesktop: true, verdict: "PASS" }, TEST_BASE);
    const inst = { id: "api-wake-inst", taskName: "api-wake-task", createdAt: "...", scheduledFor: "..." };
    createPending(inst, TEST_BASE);

    const res = await fetch(`http://localhost:${port}/i_wake`, { method: "POST", body: "{}" });
    expect(res.status).toBe(200);
    
    // Since dispatchWake is called, the instance should move to completed
    // (Note: in the real implementation, server.ts must be wired to call dispatchWake)
    expect(locate("api-wake-inst", TEST_BASE)?.state).toBe("completed");
  });

  it("POST /run_task still returns 404", async () => {
    const res = await fetch(`http://localhost:${port}/run_task`, { method: "POST", body: "{}" });
    expect(res.status).toBe(404);
  });
});
