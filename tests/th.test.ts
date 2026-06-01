import { describe, it, expect, afterAll, beforeAll } from "bun:test";
import { mkdirSync, rmSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const TEST_TH_DB = "/tmp/th-test.db";
process.env.TH_DB_PATH = TEST_TH_DB;

const TEST_BASE = join(tmpdir(), `th-test-${Date.now()}`);
process.env.TH_MEMBERS_DIR = join(TEST_BASE, "local");
process.env.TH_TMP_MEMBERS_DIR = join(TEST_BASE, "tmp");
process.env.TH_GLOBAL_MEMBERS_DIR = join(TEST_BASE, "global");

const { insertRun, finishRun, getRun, listRuns } = await import("../tools/th/src/db.ts");
const { validateName, createMember, createMemberFrom, listMembers, promoteMember, ensureLocalMember, getMember } =
  await import("../tools/th/src/members.ts");

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

describe("member globals", () => {
  it("promote sposta locale → globale", () => {
    createMember("promo-test", "blue-core", "ruolo test", ["read"], []);
    promoteMember("promo-test");
    const groups = listMembers({ global: true });
    expect(groups.global.some(m => m.name === "promo-test")).toBe(true);
  });

  it("promote fallisce se globale esiste già senza --force", () => {
    createMember("promo-force", "blue-core", "ruolo", ["read"], []);
    promoteMember("promo-force");
    expect(() => promoteMember("promo-force")).toThrow(/esiste già/);
  });

  it("promote con --force sovrascrive", () => {
    createMember("promo-overwrite", "blue-core", "originale", ["read"], []);
    promoteMember("promo-overwrite");
    // crea nuovo locale con ruolo diverso e promuove con force
    const localPath = join(process.env.TH_MEMBERS_DIR!, "promo-overwrite.md");
    rmSync(localPath);
    createMember("promo-overwrite", "black-core", "aggiornato", ["read"], []);
    expect(() => promoteMember("promo-overwrite", true)).not.toThrow();
    expect(getMember("promo-overwrite").hat).toBe("black-core");
  });

  it("createMemberFrom crea locale da globale", () => {
    createMember("base-global", "yellow-core", "ruolo base", ["read"], []);
    promoteMember("base-global");
    createMemberFrom("local-from-global", "base-global");
    const groups = listMembers({ local: true });
    expect(groups.local.some(m => m.name === "local-from-global")).toBe(true);
  });

  it("createMemberFrom fallisce se globale non esiste", () => {
    expect(() => createMemberFrom("nessuno", "inesistente")).toThrow(/non trovato/);
  });

  it("ensureLocalMember non fa nulla se esiste già in locale", () => {
    createMember("already-local", "blue-core", "ruolo", ["read"], []);
    expect(ensureLocalMember("already-local")).toBe(false);
  });

  it("ensureLocalMember auto-istanzia da globale se manca in locale/tmp", () => {
    createMember("only-global", "blue-core", "ruolo", ["read"], []);
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
