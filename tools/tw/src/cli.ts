#!/usr/bin/env bun
import { Command } from "commander";
import { basename, resolve } from "node:path";
import { findWikiByName, listWikis, registerWiki } from "./registry.js";
import { addStylePage, createPage, findWiki, getPage, getStylePage, initWiki, listPages, listStylePages, requireWiki, searchWiki, updateSection, updateStyleSection } from "./wiki.js";

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
  .description("CLI for local project wiki — Third Wiki")
  .version("0.1.0");

// ─── init ─────────────────────────────────────────────────────────────────────

program
  .command("init")
  .description("Initialize .wiki/ in the current project and register it globally")
  .option("--name <name>", "Wiki name in the registry (default: directory name)")
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
  .description("Register the local wiki in the global registry (~/.pi/tw_registry.json)")
  .option("--name <name>", "Registry name (default: directory name)")
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
  .description("List all globally registered wikis")
  .action(() => {
    const wikis = listWikis();
    if (!wikis.length) die("No wikis registered. Use: tw init");
    out(wikis);
  });

// ─── page ─────────────────────────────────────────────────────────────────────

const page = new Command("page").description("Wiki page management");

page
  .command("list")
  .description("List local wiki pages")
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
  .description("Read a page (raw markdown)")
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
  .description("Update a page section (atomic write)")
  .requiredOption("--section <section>", "Section name (without ##)")
  .requiredOption("--content <content>", "New section content (markdown)")
  .action((name: string, opts) => {
    try {
      const wikiDir = requireWiki();
      updateSection(wikiDir, name, opts.section, opts.content);
      out({ updated: true, page: name, section: opts.section });
    } catch (err) {
      die(errorMessage(err));
    }
  });

page
  .command("create <name>")
  .description("Create a new page in the local wiki")
  .option("--content <content>", "Initial page content", "")
  .action((name: string, opts) => {
    try {
      const wikiDir = requireWiki();
      createPage(wikiDir, name, opts.content);
      out({ created: true, page: name });
    } catch (err) {
      die(errorMessage(err));
    }
  });

program.addCommand(page);

// ─── style ────────────────────────────────────────────────────────────────────

const style = new Command("style").description("Style guide and code convention management");

style
  .command("add <name>")
  .description("Create a new style entry with standard template")
  .option("--desc <desc>", "Short description of the pattern/convention", "")
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
  .description("List all style entries")
  .action(() => {
    try {
      const wikiDir = requireWiki();
      const styles = listStylePages(wikiDir);
      if (!styles.length) die("No style entries.");
      out(styles);
    } catch (err) {
      die(errorMessage(err));
    }
  });

style
  .command("get <name>")
  .description("Read a style entry")
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
  .description("Update a section of a style entry")
  .requiredOption("--section <section>", "Section name (without ##)")
  .requiredOption("--content <content>", "New section content (markdown)")
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
  .description("Search the wiki (regex, case-insensitive)")
  .option("--global", "Search all registered wikis (read-only)")
  .option("--wiki <name>", "Search a specific wiki in the registry")
  .action((query: string, opts) => {
    try {
      if (opts.wiki) {
        const entry = findWikiByName(opts.wiki);
        if (!entry) die(`Wiki not found in registry: "${opts.wiki}"`);
        const results = searchWiki(entry.path, query, entry.name);
        if (!results.length) die("No results.");
        out(results);
        return;
      }

      if (opts.global) {
        const wikis = listWikis();
        if (!wikis.length) die("No wikis registered.");
        const results = wikis.flatMap((w) => searchWiki(w.path, query, w.name));
        if (!results.length) die("No results.");
        out(results);
        return;
      }

      const wikiDir = findWiki();
      if (!wikiDir) die("No wiki found. Use --global to search all.");
      const results = searchWiki(wikiDir, query);
      if (!results.length) die("No results.");
      out(results);
    } catch (err) {
      die(errorMessage(err));
    }
  });

// ─── Parse ────────────────────────────────────────────────────────────────────

program.parseAsync(process.argv).catch((err) => {
  die(errorMessage(err));
});
