import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Hono } from "hono";
import { emptyBank } from "../src/bank/core.ts";
import { loadBank, listBanks, saveBank } from "../src/bank/store.ts";
import { buildApp } from "../src/server/app.ts";
import type { CockpitConfig } from "../src/server/state.ts";
import type { TurnDeps } from "../src/turn/pipeline.ts";

let root: string;
let cfg: CockpitConfig;
let app: Hono;

const deps: TurnDeps = {
  retrieve: async () => ({ tb: [], ti: [] }),
  runAgent: async () => ({ text: "fake reply", widgets: [], ledgerProposals: [] }),
  condense: async (s) => s,
};

const form = (fields: Record<string, string>) =>
  new Request("http://x", { method: "POST", body: new URLSearchParams(fields) });

// /turn streams: app.request() resolves once headers are ready, not once the body
// (and the session mutation it carries) is fully written. Drain a clone so callers
// that chain requests see up-to-date session state, while the original body stays
// readable for the caller's own assertions.
const post = async (path: string, fields: Record<string, string>) => {
  const res = await app.request(path, { method: "POST", body: new URLSearchParams(fields) });
  await res.clone().text();
  return res;
};

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "cockpit-app-"));
  cfg = { banksDir: join(root, "banks"), hatsDir: join(root, "hats"), port: 0 };
  await mkdir(cfg.hatsDir, { recursive: true });
  await writeFile(join(cfg.hatsDir, "black-core.md"), "hat text");
  app = buildApp(cfg, deps);
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("GET /", () => {
  test("serves the shell with the htmx wiring", async () => {
    const res = await app.request("/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("htmx");
    expect(html).toContain('id="turn-form"');
  });
});

describe("POST /turn", () => {
  test("a plain turn returns the fragment", async () => {
    const res = await post("/turn", { input: "hello" });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("fake reply");
  });

  test("session survives across requests: :new then :mem shows the new bank active", async () => {
    await post("/turn", { input: ":new work" });
    const res = await post("/turn", { input: ":mem" });
    const html = await res.text();
    expect(html).toContain("work");
  });

  test("missing input -> 400", async () => {
    const res = await post("/turn", {});
    expect(res.status).toBe(400);
  });
});

describe("POST /ledger/confirm", () => {
  test("appends the confirmed sentence to the active bank", async () => {
    const res = await post("/ledger/confirm", { text: "We chose Hono." });
    expect(res.status).toBe(200);
    const bank = await loadBank(cfg.banksDir, "main");
    expect(bank.ledger.map((e) => e.text)).toEqual(["We chose Hono."]);
  });
});

describe("POST /safe/add and /safe/remove", () => {
  test("adds then removes a write path, persisted", async () => {
    await post("/safe/add", { mode: "write", path: "essays/" });
    expect((await loadBank(cfg.banksDir, "main")).safe.write).toEqual(["essays/"]);
    await post("/safe/remove", { mode: "write", path: "essays/" });
    expect((await loadBank(cfg.banksDir, "main")).safe.write).toEqual([]);
  });

  test("adding twice does not duplicate", async () => {
    await post("/safe/add", { mode: "read", path: "/data" });
    await post("/safe/add", { mode: "read", path: "/data" });
    expect((await loadBank(cfg.banksDir, "main")).safe.read).toEqual(["/data"]);
  });
});

describe("POST /delete/confirm", () => {
  test("deletes the bank and falls back to main", async () => {
    await saveBank(cfg.banksDir, emptyBank("doomed"));
    await post("/turn", { input: ":mem doomed" });
    await post("/delete/confirm", { name: "doomed" });
    expect(await listBanks(cfg.banksDir)).not.toContain("doomed");
    const res = await post("/turn", { input: ":mem" });
    expect(await res.text()).toContain("main");
  });
});

describe("GET /memory and POST /memory", () => {
  test("round trip: read the raw bank, save an edited version", async () => {
    const res = await app.request("/memory");
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("Summary");
    await post("/memory", { raw: "## Summary\n\nhand-edited" });
    expect((await loadBank(cfg.banksDir, "main")).summary).toBe("hand-edited");
  });
});
