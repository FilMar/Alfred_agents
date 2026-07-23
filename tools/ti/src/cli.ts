#!/home/filrasp/.bun/bin/bun

import { Command } from "commander";
import { checkHealth, EMBED_MODEL } from "../../tb/src/infra.js";
import * as identity from "./identity.js";
import { serveApi, API_PORT } from "./api.js";
import { normalizeTags, errorMessage } from "./types.js";

// ─── Output helpers ───────────────────────────────────────────────────────────

function out(data: unknown): void {
  process.stdout.write(JSON.stringify(data, null, 2) + "\n");
}

function die(message: string): never {
  process.stderr.write(`Error: ${message}\n`);
  process.exit(1);
}

// ─── Health guard ─────────────────────────────────────────────────────────────

async function requireServices(opts: { needsEmbedding?: boolean } = {}): Promise<void> {
  const status = await checkHealth();
  const missing: string[] = [];

  if (!status.qdrant) missing.push("Qdrant");
  if (opts.needsEmbedding !== false) {
    if (!status.ollama) missing.push("Ollama");
    else if (!status.model) missing.push(`model ${EMBED_MODEL}`);
  }

  if (missing.length > 0) {
    die(`Services unavailable: ${missing.join(", ")}.\nStart services with: tb start`);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function collect(val: string, acc: string[]): string[] {
  acc.push(val);
  return acc;
}

// ─── Programma ────────────────────────────────────────────────────────────────

const program = new Command();

program
  .name("ti")
  .description("CLI for Third Identity — Context-Action Rules")
  .version("0.1.0");

program
  .command("add")
  .description("Embed a context (if) and associate it with an action (do)")
  .requiredOption("--if <string>", "Context/trigger")
  .requiredOption("--do <string>", "Action to perform")
  .option("--tags <tag>", "Tags (repeatable)", collect, [] as string[])
  .action(async (opts) => {
    await requireServices({ needsEmbedding: true });
    const entry = await identity.addEntry(opts.if, opts.do, normalizeTags(opts.tags));
    out(entry);
  });

program
  .command("search <query>")
  .description("Semantic search for context rules")
  .option("--limit <n>", "Maximum number of results", "10")
  .option("--tags <tag>", "Filter by tag (repeatable)", collect, [] as string[])
  .action(async (query: string, opts) => {
    await requireServices({ needsEmbedding: true });
    const results = await identity.searchEntries(query, {
      limit: parseInt(opts.limit, 10),
      tags: opts.tags.length ? normalizeTags(opts.tags) : undefined,
    });
    out(results);
  });

program
  .command("list")
  .description("List all identity rules")
  .option("--tags <tag>", "Filter by tag (repeatable)", collect, [] as string[])
  .action(async (opts) => {
    await requireServices({ needsEmbedding: false });
    const entries = await identity.listEntries(opts.tags.length ? normalizeTags(opts.tags) : undefined);
    out(entries);
  });

program
  .command("delete <id>")
  .description("Remove a rule by ID")
  .action(async (id: string) => {
    await requireServices({ needsEmbedding: false });
    await identity.deleteEntry(id);
    out({ id, deleted: true });
  });

program
  .command("append-do <id>")
  .description("Append an action to an existing rule")
  .requiredOption("--do <string>", "Action to append")
  .action(async (id: string, opts) => {
    await requireServices({ needsEmbedding: false });
    const entry = await identity.appendDo(id, opts.do);
    out(entry);
  });

program
  .command("serve")
  .description("Start the HTTP API (OpenAPI-compatible, for tool integrations)")
  .action(async () => {
    await requireServices({ needsEmbedding: false });
    serveApi();
    process.stdout.write(`API: http://localhost:${API_PORT} (spec: /openapi.json)\n`);
    await new Promise(() => {}); // keep process alive
  });

program.parseAsync(process.argv).catch((err) => {
  die(errorMessage(err));
});
