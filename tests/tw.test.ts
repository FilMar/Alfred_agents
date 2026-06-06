import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const TEST_BASE = join(tmpdir(), `tw-test-${Date.now()}`);
const WIKI_DIR = join(TEST_BASE, ".wiki");
const REGISTRY_PATH = join(TEST_BASE, "tw_registry.json");
process.env.TW_REGISTRY_PATH = REGISTRY_PATH;

const { initWiki, listPages, getPage, updateSection, addStylePage, listStylePages, getStylePage, updateStyleSection, searchWiki } =
  await import("../tools/tw/src/wiki.ts");
const { registerWiki, listWikis, findWikiByName } =
  await import("../tools/tw/src/registry.ts");

beforeAll(() => {
  mkdirSync(TEST_BASE, { recursive: true });
  initWiki(TEST_BASE, "test");
});

afterAll(() => {
  try { rmSync(TEST_BASE, { recursive: true, force: true }); } catch {}
});

// ─── Pages ────────────────────────────────────────────────────────────────────

describe("listPages", () => {
  it("restituisce le pagine create da init", () => {
    expect(listPages(WIKI_DIR)).toContain("index");
  });

  it("non include file nascosti o non-.md", () => {
    writeFileSync(join(WIKI_DIR, ".hidden.md"), "");
    writeFileSync(join(WIKI_DIR, "readme.txt"), "");
    const pages = listPages(WIKI_DIR);
    expect(pages).not.toContain(".hidden");
    expect(pages).not.toContain("readme.txt");
  });
});

describe("getPage", () => {
  it("legge il contenuto di una pagina esistente", () => {
    const page = getPage(WIKI_DIR, "index");
    expect(page.content).toContain("# Wiki");
  });

  it("lancia su pagina inesistente", () => {
    expect(() => getPage(WIKI_DIR, "non-esiste")).toThrow(/non trovata/);
  });
});

describe("updateSection", () => {
  it("crea la sezione se non esiste", () => {
    updateSection(WIKI_DIR, "index", "NuovaSezione", "contenuto test");
    expect(getPage(WIKI_DIR, "index").content).toContain("## NuovaSezione");
    expect(getPage(WIKI_DIR, "index").content).toContain("contenuto test");
  });

  it("aggiorna la sezione esistente senza toccare le altre", () => {
    updateSection(WIKI_DIR, "index", "NuovaSezione", "contenuto aggiornato");
    const content = getPage(WIKI_DIR, "index").content;
    expect(content).toContain("contenuto aggiornato");
    expect(content).not.toContain("contenuto test");
    expect(content).toContain("# Wiki");
  });
});

// ─── Style ────────────────────────────────────────────────────────────────────

describe("addStylePage", () => {
  it("crea una pagina style_ con il template standard", () => {
    addStylePage(WIKI_DIR, "error-handling", "Come gestiamo gli errori");
    const page = getStylePage(WIKI_DIR, "error-handling");
    expect(page.content).toContain("# Style: error-handling");
    expect(page.content).toContain("## Descrizione");
    expect(page.content).toContain("Come gestiamo gli errori");
    expect(page.content).toContain("## Come è scritto");
    expect(page.content).toContain("## Come estendere");
    expect(page.content).toContain("## Esempio");
  });

  it("lancia se il nome esiste già", () => {
    expect(() => addStylePage(WIKI_DIR, "error-handling", "dup")).toThrow(/già esistente/);
  });
});

describe("listStylePages", () => {
  it("elenca solo le pagine di stile senza prefisso", () => {
    addStylePage(WIKI_DIR, "naming", "Convenzioni di naming");
    const styles = listStylePages(WIKI_DIR);
    expect(styles).toContain("error-handling");
    expect(styles).toContain("naming");
    expect(styles).not.toContain("index");
  });
});

describe("updateStyleSection", () => {
  it("aggiorna una sezione di una style page", () => {
    updateStyleSection(WIKI_DIR, "naming", "Esempio", "```ts\nconst myVar = 1;\n```");
    const page = getStylePage(WIKI_DIR, "naming");
    expect(page.content).toContain("myVar");
  });
});

// ─── Search ──────────────────────────────────────────────────────────────────

describe("searchWiki", () => {
  it("trova righe che matchano la query (case-insensitive)", () => {
    writeFileSync(join(WIKI_DIR, "cerca.md"), "# Cerca\n\nQuesta riga ha parola speciale.\n");
    const results = searchWiki(WIKI_DIR, "parola speciale");
    expect(results.some((r) => r.page === "cerca")).toBe(true);
  });

  it("restituisce array vuoto se nessun match", () => {
    expect(searchWiki(WIKI_DIR, "xyznotfound99999")).toHaveLength(0);
  });

  it("il risultato contiene wiki, page, line, text", () => {
    const results = searchWiki(WIKI_DIR, "parola speciale", "mia-wiki");
    expect(results[0]).toMatchObject({ wiki: "mia-wiki", page: "cerca", line: expect.any(Number), text: expect.any(String) });
  });
});

// ─── Registry ─────────────────────────────────────────────────────────────────

describe("registerWiki", () => {
  it("aggiunge una voce al registro", () => {
    registerWiki("test", WIKI_DIR);
    expect(listWikis().some((w) => w.name === "test")).toBe(true);
  });

  it("aggiorna la voce esistente sullo stesso path", () => {
    registerWiki("test", WIKI_DIR);
    registerWiki("test-rinominato", WIKI_DIR);
    const wikis = listWikis();
    const entries = wikis.filter((w) => w.path === WIKI_DIR);
    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe("test-rinominato");
  });
});

describe("findWikiByName", () => {
  it("trova una wiki per nome", () => {
    registerWiki("cercabile", join(TEST_BASE, "altra"));
    const entry = findWikiByName("cercabile");
    expect(entry?.name).toBe("cercabile");
  });

  it("restituisce null se non trovata", () => {
    expect(findWikiByName("inesistente-xyz")).toBeNull();
  });
});
