#!/usr/bin/env bun
import { Command } from "commander";
import { basename, resolve } from "node:path";
import { findWikiByName, listWikis, registerWiki } from "./registry.js";
import { addStylePage, findWiki, getPage, getStylePage, initWiki, listPages, listStylePages, requireWiki, searchWiki, updateSection, updateStyleSection } from "./wiki.js";

// ─── Output helpers ───────────────────────────────────────────────────────────

function out(data: unknown): void {
  process.stdout.write(JSON.stringify(data, null, 2) + "\n");
}

function die(message: string): never {
  process.stderr.write(`Error: ${message}\n`);
  process.exit(1);
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

// ─── Programma ────────────────────────────────────────────────────────────────

const program = new Command();

program
  .name("tw")
  .description("CLI per la wiki locale di progetto — Third Wiki")
  .version("0.1.0");

// ─── init ─────────────────────────────────────────────────────────────────────

program
  .command("init")
  .description("Inizializza .wiki/ nel progetto corrente e registra la wiki globalmente")
  .option("--name <name>", "Nome della wiki nel registro (default: nome della directory)")
  .action((opts) => {
    const cwd = process.cwd();
    const name: string = opts.name ?? basename(cwd);
    try {
      const wikiDir = initWiki(cwd, name);
      const entry = registerWiki(name, wikiDir);
      out({ initialized: true, ...entry });
    } catch (err) {
      die(errorMessage(err));
    }
  });

// ─── register ─────────────────────────────────────────────────────────────────

program
  .command("register")
  .description("Registra la wiki locale nel registro globale (~/.pi/tw_registry.json)")
  .option("--name <name>", "Nome nel registro (default: nome della directory)")
  .action((opts) => {
    try {
      const wikiDir = requireWiki();
      const name: string = opts.name ?? basename(resolve(wikiDir, ".."));
      const entry = registerWiki(name, wikiDir);
      out(entry);
    } catch (err) {
      die(errorMessage(err));
    }
  });

// ─── wikis ────────────────────────────────────────────────────────────────────

program
  .command("wikis")
  .description("Lista tutte le wiki registrate globalmente")
  .action(() => {
    const wikis = listWikis();
    if (!wikis.length) die("Nessuna wiki registrata. Usa: tw init");
    out(wikis);
  });

// ─── page ─────────────────────────────────────────────────────────────────────

const page = new Command("page").description("Gestione pagine della wiki");

page
  .command("list")
  .description("Lista le pagine della wiki locale")
  .action(() => {
    try {
      const wikiDir = requireWiki();
      out(listPages(wikiDir));
    } catch (err) {
      die(errorMessage(err));
    }
  });

page
  .command("get <name>")
  .description("Legge una pagina (raw markdown)")
  .action((name: string) => {
    try {
      const wikiDir = requireWiki();
      const p = getPage(wikiDir, name);
      process.stdout.write(p.content);
    } catch (err) {
      die(errorMessage(err));
    }
  });

page
  .command("update <name>")
  .description("Aggiorna una sezione di una pagina (scrittura atomica)")
  .requiredOption("--section <section>", "Nome della sezione (senza ##)")
  .requiredOption("--content <content>", "Nuovo contenuto della sezione (markdown)")
  .action((name: string, opts) => {
    try {
      const wikiDir = requireWiki();
      updateSection(wikiDir, name, opts.section, opts.content);
      out({ updated: true, page: name, section: opts.section });
    } catch (err) {
      die(errorMessage(err));
    }
  });

program.addCommand(page);

// ─── style ────────────────────────────────────────────────────────────────────

const style = new Command("style").description("Gestione guide di stile e convenzioni del codice");

style
  .command("add <name>")
  .description("Crea una nuova entry di stile con template standard")
  .option("--desc <desc>", "Descrizione breve del pattern/convenzione", "")
  .action((name: string, opts) => {
    try {
      const wikiDir = requireWiki();
      addStylePage(wikiDir, name, opts.desc);
      out({ added: true, name });
    } catch (err) {
      die(errorMessage(err));
    }
  });

style
  .command("list")
  .description("Lista tutte le entry di stile")
  .action(() => {
    try {
      const wikiDir = requireWiki();
      const styles = listStylePages(wikiDir);
      if (!styles.length) die("Nessuna entry di stile.");
      out(styles);
    } catch (err) {
      die(errorMessage(err));
    }
  });

style
  .command("get <name>")
  .description("Legge una entry di stile")
  .action((name: string) => {
    try {
      const wikiDir = requireWiki();
      const p = getStylePage(wikiDir, name);
      process.stdout.write(p.content);
    } catch (err) {
      die(errorMessage(err));
    }
  });

style
  .command("update <name>")
  .description("Aggiorna una sezione di una entry di stile")
  .requiredOption("--section <section>", "Nome della sezione (senza ##)")
  .requiredOption("--content <content>", "Nuovo contenuto della sezione (markdown)")
  .action((name: string, opts) => {
    try {
      const wikiDir = requireWiki();
      updateStyleSection(wikiDir, name, opts.section, opts.content);
      out({ updated: true, name, section: opts.section });
    } catch (err) {
      die(errorMessage(err));
    }
  });

program.addCommand(style);

// ─── search ───────────────────────────────────────────────────────────────────

program
  .command("search <query>")
  .description("Cerca nella wiki (regex, case-insensitive)")
  .option("--global", "Cerca in tutte le wiki registrate (sola lettura)")
  .option("--wiki <name>", "Cerca in una wiki specifica del registro")
  .action((query: string, opts) => {
    try {
      if (opts.wiki) {
        const entry = findWikiByName(opts.wiki);
        if (!entry) die(`Wiki non trovata nel registro: "${opts.wiki}"`);
        const results = searchWiki(entry.path, query, entry.name);
        if (!results.length) die("Nessun risultato.");
        out(results);
        return;
      }

      if (opts.global) {
        const wikis = listWikis();
        if (!wikis.length) die("Nessuna wiki registrata.");
        const results = wikis.flatMap((w) => searchWiki(w.path, query, w.name));
        if (!results.length) die("Nessun risultato.");
        out(results);
        return;
      }

      const wikiDir = findWiki();
      if (!wikiDir) die("Nessuna wiki trovata. Usa --global per cercare in tutte.");
      const results = searchWiki(wikiDir, query);
      if (!results.length) die("Nessun risultato.");
      out(results);
    } catch (err) {
      die(errorMessage(err));
    }
  });

// ─── Parse ────────────────────────────────────────────────────────────────────

program.parseAsync(process.argv).catch((err) => {
  die(errorMessage(err));
});
