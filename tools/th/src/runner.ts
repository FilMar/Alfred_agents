import { openSync, writeSync, closeSync, writeFileSync, readFileSync, statSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import { spawn, spawnSync } from "node:child_process";
import { tmpdir, homedir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { insertRun, finishRun, type RunUsage } from "./db.js";
import {
  AuthStorage,
  createAgentSession,
  DefaultResourceLoader,
  getAgentDir,
  ModelRegistry,
  SessionManager,
} from "@earendil-works/pi-coding-agent";
import type { ThinkingLevel } from "@earendil-works/pi-agent-core";
import { getModel, getProviders } from "@earendil-works/pi-ai";
import type { KnownProvider, Usage } from "@earendil-works/pi-ai";
import { ensureLocalMember, loadMember, validateName } from "./members.js";

// ─── Sandbox (bwrap) ──────────────────────────────────────────────────────────

const SANDBOXED = "TH_SANDBOXED";

let _hasBwrap: boolean | null = null;
const hasBwrap = () =>
  _hasBwrap ?? (_hasBwrap = spawnSync("which", ["bwrap"], { stdio: "ignore" }).status === 0);

function bwrapArgs(): string[] {
  const home = homedir();
  return [
    "--ro-bind", "/", "/",
    "--proc", "/proc",
    "--dev", "/dev",
    "--bind", process.cwd(), process.cwd(),
    "--bind", `${home}/.pi`, `${home}/.pi`,
    "--bind", `${home}/.bun`, `${home}/.bun`,
    "--bind", "/tmp", "/tmp",
    "--setenv", "HOME", home,
    "--",
  ];
}

const warnNoBwrap = () =>
  process.stderr.write("warn: bwrap non disponibile — esecuzione SENZA sandbox\n");

/** Re-exec il processo corrente sotto bwrap. Non ritorna se bwrap è disponibile. */
export function ensureSandboxed(): void {
  if (process.env[SANDBOXED]) return;
  if (!hasBwrap()) {
    warnNoBwrap();
    return;
  }
  const r = spawnSync("bwrap", [...bwrapArgs(), ...process.argv], {
    stdio: "inherit",
    env: { ...process.env, [SANDBOXED]: "1" },
  });
  process.exit(r.status ?? 1);
}

export function spawnSandboxed(
  bin: string,
  args: string[],
  opts: Parameters<typeof spawn>[2],
): ReturnType<typeof spawn> {
  if (!hasBwrap()) {
    warnNoBwrap();
    return spawn(bin, args, opts);
  }
  return spawn("bwrap", [...bwrapArgs(), bin, ...args], {
    ...opts,
    env: { ...process.env, [SANDBOXED]: "1" },
  });
}

/** Esegue un binario arbitrario nel sandbox inoltrando stdio ed exit code.
 *  Senza bwrap rifiuta: chi chiama sandbox-exec vuole il sandbox, non un degrado silenzioso. */
export function sandboxExec(bin: string, args: string[]): Promise<number> {
  if (!hasBwrap()) {
    throw new Error("bwrap non trovato: sandbox-exec rifiuta di eseguire senza sandbox. Installa bubblewrap.");
  }
  return new Promise((resolve, reject) => {
    const child = spawnSandboxed(bin, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────

type JobPaths = { out: string; log: string; status: string; pid: string };
type AgentSession = Awaited<ReturnType<typeof createAgentSession>>["session"];
type IOHandles = { emit: (text: string) => void; close: () => void };

export type RunMemberOpts = {
  thinkingLevel?: string;
  modelStr?: string;
  timeoutSec?: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const THINKING_LEVELS: ThinkingLevel[] = ["off", "minimal", "low", "medium", "high", "xhigh"];
const LOG_RESULT_MAX = 500;

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + `… [+${str.length - max} chars]` : str;
}

/** Sum billed usage across every assistant message of a finished session.
 *  Input is cumulative per API call (you pay context on each), so summing
 *  reflects real billed usage rather than a single turn. */
function sumUsage(messages: AgentSession["messages"]): RunUsage {
  let inputTokens = 0;
  let outputTokens = 0;
  let costUsd = 0;
  for (const m of messages) {
    const u = (m as { usage?: Usage }).usage;
    if (!u) continue;
    inputTokens += (u.input ?? 0) + (u.cacheRead ?? 0) + (u.cacheWrite ?? 0);
    outputTokens += u.output ?? 0;
    costUsd += u.cost?.total ?? 0;
  }
  return { inputTokens, outputTokens, costUsd };
}

function createRegistry() {
  const authStorage = AuthStorage.create();
  return { authStorage, modelRegistry: ModelRegistry.create(authStorage) };
}

/** Strip ANSI escape codes and non-printable chars (keeps tab/LF/CR and printable ASCII/latin-1). */
export function sanitize(s: string): string {
  return s.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "").replace(/[^\x09\x0a\x0d\x20-\x7e\x80-\xff]/g, "");
}

// ─── Public utilities ─────────────────────────────────────────────────────────

export async function listAvailableModels(): Promise<Array<{ provider: string; id: string; name: string }>> {
  const { modelRegistry } = createRegistry();
  const available = await modelRegistry.getAvailable();
  return available.map((m) => ({ provider: m.provider, id: m.id, name: m.name }));
}

export function makeJobPaths(memberName: string): JobPaths {
  validateName(memberName);
  const base = join(tmpdir(), `th-${memberName}-${Date.now()}`);
  return { out: `${base}.out`, log: `${base}.log`, status: `${base}.status`, pid: `${base}.pid` };
}

export function spawnDetached(
  memberName: string,
  task: string,
  paths: JobPaths,
  opts: RunMemberOpts,
  execPath: string,
  runnerPath: string,
): number | undefined {
  writeFileSync(paths.status, "running");
  const child = spawnSandboxed(execPath, [
    runnerPath,
    memberName,
    task,
    JSON.stringify(paths),
    JSON.stringify(opts),
  ], { detached: true, stdio: "ignore" });
  child.unref();
  if (child.pid !== undefined) {
    try {
      writeFileSync(paths.pid, String(child.pid));
    } catch (e) {
      process.stderr.write(`warn: could not write .pid: ${e instanceof Error ? e.message : String(e)}\n`);
    }
  }
  return child.pid;
}

// ─── Session building ─────────────────────────────────────────────────────────

async function resolveModel(modelStr: string) {
  const [provider, ...rest] = modelStr.split("/");
  const modelId = rest.join("/");
  if (!provider || !modelId) throw new Error(`Formato model non valido: usa "provider/model-id" (es. anthropic/claude-opus-4-5)`);
  const knownProviders = getProviders();
  if (knownProviders.includes(provider as KnownProvider)) {
    const model = getModel(provider as KnownProvider, modelId as never);
    if (model) return model;
  }
  // Custom providers from models.json (e.g. ollama) live in the model
  // registry, not in the static provider list — fall back to it before
  // giving up on the model id.
  const { modelRegistry } = createRegistry();
  const available = await modelRegistry.getAvailable();
  const custom = available.find((m) => m.provider === provider && m.id === modelId);
  if (custom) return custom;
  throw new Error(`Model non trovato: "${modelStr}". Usa: th models`);
}

async function buildSession(
  memberName: string,
  opts: RunMemberOpts,
): Promise<{ session: AgentSession }> {
  if (opts.thinkingLevel && !THINKING_LEVELS.includes(opts.thinkingLevel as ThinkingLevel)) {
    throw new Error(`Thinking level non valido: "${opts.thinkingLevel}". Valori accettati: ${THINKING_LEVELS.join(", ")}`);
  }

  const model = opts.modelStr ? await resolveModel(opts.modelStr) : undefined;

  const autoInstantiated = ensureLocalMember(memberName);
  if (autoInstantiated) process.stderr.write(`info: istanziato "${memberName}" da globale in .th/members/\n`);
  const { member, systemPrompt } = loadMember(memberName);

  const loader = new DefaultResourceLoader({
    cwd: process.cwd(),
    agentDir: getAgentDir(),
    noExtensions: true,
    systemPromptOverride: () => systemPrompt,
  });
  await loader.reload();

  const { authStorage, modelRegistry } = createRegistry();
  const { session } = await createAgentSession({
    tools: member.tools,
    resourceLoader: loader,
    sessionManager: SessionManager.inMemory(),
    authStorage,
    modelRegistry,
    ...(model ? { model } : {}),
    ...(opts.thinkingLevel ? { thinkingLevel: opts.thinkingLevel as ThinkingLevel } : {}),
  });

  return { session };
}

// ─── I/O ──────────────────────────────────────────────────────────────────────

function attachIO(session: AgentSession, paths: JobPaths): IOHandles {
  const logFd = openSync(paths.log, "w");
  const outputFd = openSync(paths.out, "w");

  const log = (text: string) => writeSync(logFd, sanitize(text));
  const emit = (text: string) => {
    process.stdout.write(text);
    writeSync(outputFd, text);
  };

  session.subscribe((event) => {
    if (event.type === "message_update") {
      const e = event.assistantMessageEvent;
      if (e.type === "text_delta") emit(e.delta);
      else if (e.type === "thinking_delta") log(e.delta);
    } else if (event.type === "tool_execution_start") {
      log(`\n[tool:${event.toolName}] ${JSON.stringify(event.args)}\n`);
    } else if (event.type === "tool_execution_end") {
      const raw = event.isError ? `ERROR: ${JSON.stringify(event.result)}` : JSON.stringify(event.result);
      log(`[tool:${event.toolName}] → ${truncate(raw, LOG_RESULT_MAX)}\n`);
    }
  });

  process.stderr.write(`log: ${paths.log}\n`);
  process.stderr.write(`output: ${paths.out}\n`);

  return {
    emit,
    close: () => { closeSync(logFd); closeSync(outputFd); },
  };
}

// ─── Execution ────────────────────────────────────────────────────────────────

async function promptWithTimeout(session: AgentSession, task: string, timeoutSec: number): Promise<void> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout dopo ${timeoutSec}s`)), timeoutSec * 1000)
  );
  try {
    await Promise.race([session.prompt(task), timeoutPromise]);
  } catch (err) {
    await session.abort();
    throw err;
  }
}

async function executeSession(
  session: AgentSession,
  task: string,
  opts: { timeoutSec?: number; statusPath: string; runId: string; emit: (t: string) => void },
): Promise<void> {
  let runStatus: "done" | "error" | "timeout" = "error";
  try {
    if (opts.timeoutSec) {
      try {
        await promptWithTimeout(session, task, opts.timeoutSec);
      } catch (err) {
        if (err instanceof Error && err.message.startsWith("Timeout")) runStatus = "timeout";
        throw err;
      }
    } else {
      await session.prompt(task);
    }
    runStatus = "done";
    opts.emit("\n");
    writeFileSync(opts.statusPath, "done");
  } catch (err) {
    writeFileSync(opts.statusPath, `error: ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  } finally {
    finishRun(opts.runId, runStatus, sumUsage(session.messages));
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function runMember(
  memberName: string,
  task: string,
  paths: JobPaths,
  opts: RunMemberOpts = {},
): Promise<void> {
  const { session } = await buildSession(memberName, opts);

  const runId = randomUUID();
  insertRun({
    id: runId,
    member: memberName,
    task: task.slice(0, 300),
    started_at: new Date().toISOString(),
    status: "running",
    out_path: paths.out,
    log_path: paths.log,
  });

  const { emit, close } = attachIO(session, paths);
  try {
    await executeSession(session, task, { timeoutSec: opts.timeoutSec, statusPath: paths.status, runId, emit });
  } finally {
    close();
  }
}

// ─── Waiting on detached jobs ─────────────────────────────────────────────────

export type JobOutcome = { statusPath: string; status: string; ok: boolean };

const POLL_INTERVAL_MS = 2000;
export const OUT_STALE_MS = 60_000;

function isTerminal(status: string): boolean {
  return status === "done" || status.startsWith("error:") || status.startsWith("timeout");
}

function readStatus(path: string): string {
  try {
    return readFileSync(path, "utf8").trim();
  } catch {
    return "missing";
  }
}

function isPidAlive(pidPath: string): boolean {
  try {
    const pid = parseInt(readFileSync(pidPath, "utf8").trim(), 10);
    if (isNaN(pid)) return false;
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function outMtimeMs(outPath: string): number {
  try {
    return statSync(outPath).mtimeMs;
  } catch {
    return 0;
  }
}

function markCrashed(statusPath: string): void {
  try { writeFileSync(statusPath, "error: process died unexpectedly"); } catch { /* non-fatal */ }
}

function pathFromStatus(statusPath: string, ext: string): string {
  return statusPath.replace(/\.status$/, `.${ext}`);
}

type JobState = { mtime: number; lastChange: number };

export function checkStaleness(statusPath: string, state: JobState, now: number, staleMs = OUT_STALE_MS): void {
  const mtime = outMtimeMs(pathFromStatus(statusPath, "out"));
  if (mtime !== state.mtime) {
    state.mtime = mtime;
    state.lastChange = now;
  }
  if (now - state.lastChange > staleMs && !isPidAlive(pathFromStatus(statusPath, "pid"))) {
    markCrashed(statusPath);
  }
}

/**
 * Block until every detached job reaches a terminal status, or until the global
 * timeout elapses. Detects dead processes via PID liveness and .out mtime staleness.
 */
export async function waitForJobs(statusPaths: string[], timeoutSec = 600): Promise<JobOutcome[]> {
  const deadline = Date.now() + timeoutSec * 1000;
  const now0 = Date.now();
  const jobState = new Map<string, JobState>(
    statusPaths.map(p => [p, { mtime: outMtimeMs(pathFromStatus(p, "out")), lastChange: now0 }])
  );

  for (;;) {
    const now = Date.now();
    let allDone = true;
    for (const p of statusPaths) {
      if (isTerminal(readStatus(p))) continue;
      allDone = false;
      checkStaleness(p, jobState.get(p)!, now);
    }
    if (allDone) break;
    if (now >= deadline) break;
    await sleep(POLL_INTERVAL_MS);
  }

  return statusPaths.map((p) => {
    const status = readStatus(p);
    return { statusPath: p, status, ok: status === "done" };
  });
}
