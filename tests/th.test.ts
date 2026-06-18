import { describe, it, expect, afterAll, beforeAll } from "bun:test";
import { mkdirSync, rmSync, unlinkSync, writeFileSync, readFileSync, utimesSync } from "node:fs";
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
const { waitForJobs, sanitize, checkStaleness, makeJobPaths, OUT_STALE_MS } = await import("../tools/th/src/runner.ts");

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
  it("accetta lettere, cifre, trattino, underscore", () => {
    expect(() => validateName("mario")).not.toThrow();
    expect(() => validateName("mario-rossi")).not.toThrow();
    expect(() => validateName("mario_rossi")).not.toThrow();
    expect(() => validateName("Mario123")).not.toThrow();
  });

  it("rifiuta stringa vuota", () => {
    expect(() => validateName("")).toThrow();
  });

  it("rifiuta path traversal con slash", () => {
    expect(() => validateName("../etc/passwd")).toThrow();
    expect(() => validateName("a/b")).toThrow();
  });

  it("rifiuta backslash", () => {
    expect(() => validateName("a\\b")).toThrow();
  });

  it("rifiuta spazi", () => {
    expect(() => validateName("mario rossi")).toThrow();
  });

  it("rifiuta caratteri speciali", () => {
    expect(() => validateName("mario@rossi")).toThrow();
    expect(() => validateName("mario.rossi")).toThrow();
    expect(() => validateName("mario!")).toThrow();
  });
});

describe("run history", () => {
  it("insert e get per id completo", () => {
    const r = makeRun();
    insertRun(r);
    expect(getRun(r.id)).toMatchObject({ id: r.id, member: r.member, status: "running" });
  });

  it("get per prefisso id", () => {
    const r = makeRun();
    insertRun(r);
    expect(getRun(r.id.slice(0, 8))).toMatchObject({ id: r.id });
  });

  it("get su id inesistente → null", () => {
    expect(getRun("non-esiste")).toBeNull();
  });

  it("finishRun aggiorna status e finished_at", () => {
    const r = makeRun();
    insertRun(r);
    finishRun(r.id, "done");
    const result = getRun(r.id);
    expect(result?.status).toBe("done");
    expect(result?.finished_at).toBeDefined();
  });

  it("finishRun salva token e costo", () => {
    const r = makeRun();
    insertRun(r);
    finishRun(r.id, "done", { inputTokens: 1200, outputTokens: 340, costUsd: 0.0123 });
    const result = getRun(r.id);
    expect(result?.input_tokens).toBe(1200);
    expect(result?.output_tokens).toBe(340);
    expect(result?.cost_usd).toBeCloseTo(0.0123);
  });

  it("finishRun senza usage lascia token a undefined", () => {
    const r = makeRun();
    insertRun(r);
    finishRun(r.id, "done");
    expect(getRun(r.id)?.input_tokens).toBeUndefined();
  });

  it("listRuns ordine decrescente per started_at", () => {
    const r1 = makeRun({ started_at: "2024-01-01T00:00:00.000Z" });
    const r2 = makeRun({ started_at: "2024-01-02T00:00:00.000Z" });
    insertRun(r1);
    insertRun(r2);
    const ids = listRuns({ limit: 50 }).map(r => r.id);
    expect(ids.indexOf(r2.id)).toBeLessThan(ids.indexOf(r1.id));
  });

  it("listRuns filtra per membro", () => {
    const r = makeRun({ member: "membro-specifico" });
    insertRun(r);
    const results = listRuns({ member: "membro-specifico" });
    expect(results.every(x => x.member === "membro-specifico")).toBe(true);
  });
});

describe("waitForJobs", () => {
  it("ritorna ok=true per tutti i job done", async () => {
    const paths = [statusFile("a", "done"), statusFile("b", "done")];
    const outcomes = await waitForJobs(paths, 5);
    expect(outcomes.every(o => o.ok)).toBe(true);
  });

  it("non si appende su un job in errore e lo segna ok=false (regressione hang)", async () => {
    const paths = [statusFile("ok", "done"), statusFile("ko", "error: boom")];
    const outcomes = await waitForJobs(paths, 5);
    expect(outcomes[0]?.ok).toBe(true);
    expect(outcomes[1]?.ok).toBe(false);
    expect(outcomes[1]?.status).toBe("error: boom");
  });

  it("tratta lo stato timeout come terminale", async () => {
    const paths = [statusFile("t", "timeout")];
    const outcomes = await waitForJobs(paths, 5);
    expect(outcomes[0]?.ok).toBe(false);
  });

  it("capisce la transizione running → done", async () => {
    const p = statusFile("trans", "running");
    const waiting = waitForJobs([p], 10);
    writeFileSync(p, "done");
    const outcomes = await waiting;
    expect(outcomes[0]?.ok).toBe(true);
  });
});

describe("hat per riferimento", () => {
  it("risolve l'hat a runtime: modificarlo aggiorna il member, niente snapshot", () => {
    const hatsDir = join(TEST_BASE, "hats-ref");
    mkdirSync(hatsDir, { recursive: true });
    const prev = process.env.TH_HATS_DIR;
    process.env.TH_HATS_DIR = hatsDir;
    try {
      const hatPath = join(hatsDir, "ref-core.md");
      writeFileSync(hatPath, "HAT V1");
      createMember("ref-test", "ref-core", "ruolo di prova", ["read"]);

      // il file del member NON contiene il testo dell'hat: solo il riferimento
      const fileContent = readFileSync(join(process.env.TH_MEMBERS_DIR!, "ref-test.md"), "utf8");
      expect(fileContent).toContain("hat: ref-core");
      expect(fileContent).not.toContain("HAT V1");

      const v1 = loadMember("ref-test").systemPrompt;
      expect(v1).toContain("ruolo di prova");
      expect(v1).toContain("HAT V1");

      // l'hat cambia; il member non viene ricreato → loadMember riflette la nuova versione
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
  it("promote sposta locale → globale", () => {
    createMember("promo-test", "blue-core", "ruolo test", ["read"]);
    promoteMember("promo-test");
    const groups = listMembers({ global: true });
    expect(groups.global.some(m => m.name === "promo-test")).toBe(true);
  });

  it("promote fallisce se globale esiste già senza --force", () => {
    createMember("promo-force", "blue-core", "ruolo", ["read"]);
    promoteMember("promo-force");
    expect(() => promoteMember("promo-force")).toThrow(/esiste già/);
  });

  it("promote con --force sovrascrive", () => {
    createMember("promo-overwrite", "blue-core", "originale", ["read"]);
    promoteMember("promo-overwrite");
    // crea nuovo locale con ruolo diverso e promuove con force
    const localPath = join(process.env.TH_MEMBERS_DIR!, "promo-overwrite.md");
    rmSync(localPath);
    createMember("promo-overwrite", "black-core", "aggiornato", ["read"]);
    expect(() => promoteMember("promo-overwrite", true)).not.toThrow();
    expect(getMember("promo-overwrite").hat).toBe("black-core");
  });

  it("createMemberFrom crea locale da globale", () => {
    createMember("base-global", "yellow-core", "ruolo base", ["read"]);
    promoteMember("base-global");
    createMemberFrom("local-from-global", "base-global");
    const groups = listMembers({ local: true });
    expect(groups.local.some(m => m.name === "local-from-global")).toBe(true);
  });

  it("createMemberFrom fallisce se globale non esiste", () => {
    expect(() => createMemberFrom("nessuno", "inesistente")).toThrow(/non trovato/);
  });

  it("ensureLocalMember non fa nulla se esiste già in locale", () => {
    createMember("already-local", "blue-core", "ruolo", ["read"]);
    expect(ensureLocalMember("already-local")).toBe(false);
  });

  it("ensureLocalMember auto-istanzia da globale se manca in locale/tmp", () => {
    createMember("only-global", "blue-core", "ruolo", ["read"]);
    promoteMember("only-global");
    rmSync(join(process.env.TH_MEMBERS_DIR!, "only-global.md"));
    expect(ensureLocalMember("only-global")).toBe(true);
    // ora esiste in locale
    expect(ensureLocalMember("only-global")).toBe(false);
  });

  it("ensureLocalMember lancia se non trovato da nessuna parte", () => {
    expect(() => ensureLocalMember("non-esiste-davvero")).toThrow(/non trovato/);
  });

  it("listMembers senza filtri restituisce 3 gruppi", () => {
    const groups = listMembers();
    expect(groups).toHaveProperty("local");
    expect(groups).toHaveProperty("global");
    expect(groups).toHaveProperty("tmp");
  });

  it("listMembers --local non include globali o tmp", () => {
    const groups = listMembers({ local: true });
    expect(groups.global).toHaveLength(0);
    expect(groups.tmp).toHaveLength(0);
  });
});

describe("sanitize", () => {
  it("rimuove ANSI escape codes", () => {
    expect(sanitize("\x1b[31mrosso\x1b[0m")).toBe("rosso");
    expect(sanitize("\x1b[1;32mbold green\x1b[0m")).toBe("bold green");
  });

  it("rimuove caratteri di controllo (tranne tab/LF/CR)", () => {
    expect(sanitize("a\x01b\x02c")).toBe("abc");
    expect(sanitize("a\tb\nc\rd")).toBe("a\tb\nc\rd");
  });

  it("rimuove caratteri Unicode sopra U+00FF", () => {
    expect(sanitize("a→b")).toBe("ab");
  });

  it("non tocca testo ASCII printable", () => {
    const s = "hello world [tool:Read] result 42";
    expect(sanitize(s)).toBe(s);
  });
});

describe("makeJobPaths", () => {
  it("tutti i path condividono lo stesso base e hanno l'estensione corretta", () => {
    const paths = makeJobPaths("test-member");
    const base = paths.status.replace(/\.status$/, "");
    expect(paths.out).toBe(`${base}.out`);
    expect(paths.log).toBe(`${base}.log`);
    expect(paths.pid).toBe(`${base}.pid`);
  });
});

describe("checkStaleness (crash detection)", () => {
  function staleState(lastChangeMsAgo: number) {
    return { mtime: 0, lastChange: Date.now() - lastChangeMsAgo };
  }

  it("marca crashed se stale e PID morto", () => {
    const statusPath = join(TEST_BASE, "cs-dead.status");
    const pidPath = statusPath.replace(/\.status$/, ".pid");
    writeFileSync(statusPath, "running");
    writeFileSync(pidPath, "9999999");
    const state = staleState(OUT_STALE_MS + 1000);
    checkStaleness(statusPath, state, Date.now());
    expect(readFileSync(statusPath, "utf8")).toBe("error: process died unexpectedly");
  });

  it("NON marca crashed se stale ma PID ancora vivo", () => {
    const statusPath = join(TEST_BASE, "cs-alive.status");
    const pidPath = statusPath.replace(/\.status$/, ".pid");
    writeFileSync(statusPath, "running");
    writeFileSync(pidPath, String(process.pid));
    const state = staleState(OUT_STALE_MS + 1000);
    checkStaleness(statusPath, state, Date.now());
    expect(readFileSync(statusPath, "utf8")).toBe("running");
  });

  it("NON marca crashed se .out aggiornato di recente (non stale)", () => {
    const statusPath = join(TEST_BASE, "cs-fresh.status");
    const outPath = statusPath.replace(/\.status$/, ".out");
    const pidPath = statusPath.replace(/\.status$/, ".pid");
    writeFileSync(statusPath, "running");
    writeFileSync(outPath, "output fresco");
    writeFileSync(pidPath, "9999999");
    const state = { mtime: 0, lastChange: Date.now() };
    checkStaleness(statusPath, state, Date.now());
    expect(readFileSync(statusPath, "utf8")).toBe("running");
  });

  it("aggiorna lastChange quando mtime di .out cambia", () => {
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
