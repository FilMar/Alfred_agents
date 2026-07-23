#!/usr/bin/env bun

import { Command } from "commander";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { checkHealth, EMBED_MODEL } from "./infra.js";
import { serveGraph, GRAPH_PORT } from "./graph/server.js";
import { serveApi, API_PORT } from "./api.js";
import { createNote, addRefs, changeKind, changeTags, searchNotes, browseNotes, randomNote, listNoteTags } from "./notes.js";
import type { NoteType, SearchOptions } from "./types.js";
import { NOTE_TYPES, isValidKind, normalizeTags, errorMessage } from "./types.js";

// ─── Compose path ─────────────────────────────────────────────────────────────

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const COMPOSE_FILE = resolve(__dirname, "../../../scripts/compose.qdrant.yml");

const QDRANT_POLL_RETRIES = 10;
const QDRANT_POLL_INTERVAL_MS = 1_000;

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

function validateKind(kind: string): asserts kind is NoteType {
  if (!isValidKind(kind)) {
    die(`invalid kind: "${kind}". Allowed values: ${NOTE_TYPES.join(", ")}`);
  }
}


// ─── Programma ────────────────────────────────────────────────────────────────

const program = new Command();

program
  .name("tb")
  .description("CLI for semantic memory — Third Brain")
  .version("0.1.0");

// ─── start ────────────────────────────────────────────────────────────────────

program
  .command("start")
  .description("Start Qdrant via Docker Compose and verify Ollama")
  .action(async () => {
    const result = spawnSync("docker", ["compose", "-f", COMPOSE_FILE, "up", "-d"], { stdio: "inherit" });
    if (result.status !== 0) die("docker compose up failed. Make sure Docker or Podman is running.");

    let qdrantUp = false;
    for (let i = 0; i < QDRANT_POLL_RETRIES; i++) {
      const status = await checkHealth();
      if (status.qdrant) { qdrantUp = true; break; }
      await new Promise((r) => setTimeout(r, QDRANT_POLL_INTERVAL_MS));
    }

    if (!qdrantUp) {
      process.stderr.write("Qdrant started but not yet reachable. Retry in a few seconds.\n");
      process.exit(1);
    }

    const final = await checkHealth();
    out({ qdrant: final.qdrant, ollama: final.ollama, model: final.model });

    if (!final.ollama) process.stderr.write("Ollama not reachable. Start it with: ollama serve\n");
    else if (!final.model) process.stderr.write(`Model missing. Download it with: ollama pull ${EMBED_MODEL}\n`);
  });

// ─── stop ─────────────────────────────────────────────────────────────────────

program
  .command("stop")
  .description("Stop Qdrant")
  .action(() => {
    const result = spawnSync("docker", ["compose", "-f", COMPOSE_FILE, "down"], { stdio: "inherit" });
    process.exit(result.status ?? 1);
  });

// ─── status ───────────────────────────────────────────────────────────────────

program
  .command("status")
  .description("Show Qdrant and Ollama status")
  .action(async () => {
    const status = await checkHealth();
    out(status);
    if (!status.qdrant || !status.ollama || !status.model) process.exit(1);
  });

// ─── save ─────────────────────────────────────────────────────────────────────

program
  .command("save")
  .description("Save an atomic idea to the Third Brain")
  .requiredOption("--what <text>", "Content: the atomic idea")
  .requiredOption("--why <text>", "Context: why this note was created")
  .option("--kind <kind>", "Semantic type (dato|protocollo|sintesi|attrito|configurazione|indice)", "dato")
  .option("--tags <tag>", "Tag (repeatable)", collect, [] as string[])
  .option("--source <uri>", "URI or reference to the original source")
  .action(async (opts) => {
    validateKind(opts.kind);
    await requireServices({ needsEmbedding: true });

    const note = await createNote({
      what: opts.what,
      why: opts.why,
      kind: opts.kind,
      tags: normalizeTags(opts.tags),
      source: opts.source,
    });

    out({ id: note.id });
  });

// ─── tags ─────────────────────────────────────────────────────────────────────

program
  .command("tags")
  .description("List tags in use, sorted by frequency")
  .action(async () => {
    await requireServices({ needsEmbedding: false });
    const tags = await listNoteTags();
    out(tags);
  });

// ─── random ───────────────────────────────────────────────────────────────────

program
  .command("random")
  .description("Return a random note from the Third Brain")
  .action(async () => {
    await requireServices({ needsEmbedding: false });
    const note = await randomNote();
    if (!note) die("No notes in the Third Brain.");
    out(note);
  });

// ─── search ───────────────────────────────────────────────────────────────────

program
  .command("search <query>")
  .description("Semantic search in the Third Brain")
  .option("--limit <n>", "Maximum number of results", "10")
  .option("--depth <n>", "Ref traversal depth (0=vector only, 1=default)", "1")
  .option("--hybrid", "Use hybrid retrieval (dense + sparse + RRF)")
  .option("--tags <tag>", "Filter by tag (repeatable)", collect, [] as string[])
  .option("--kind <kind>", "Filter by semantic type (repeatable)", collect, [] as string[])
  .option("--evidence-only", "Restringe ai tipi evidence-oriented")
  .option("--include-hubs", "Includi note di tipo indice nella ricerca")
  .action(async (query: string, opts) => {
    await requireServices({ needsEmbedding: true });

    const options: SearchOptions = {
      limit: parseInt(opts.limit, 10),
      depth: parseInt(opts.depth, 10),
      hybrid: opts.hybrid ?? false,
      tags: opts.tags.length ? normalizeTags(opts.tags) : undefined,
      kind: opts.kind.length ? (opts.kind as NoteType[]) : undefined,
      evidence_only: opts.evidenceOnly ?? false,
      include_hubs: opts.includeHubs ?? false,
    };

    const results = await searchNotes(query, options);
    out(results);
  });

// ─── update ───────────────────────────────────────────────────────────────────

program
  .command("update <id>")
  .description("Update mutable fields of a note")
  .option("--kind <kind>", "New semantic type")
  .option("--tags <tag>", "Set tags (replaces existing)", collect, [] as string[])
  .option("--add-ref <id:reason>", "Add a ref (repeatable, append-only)", collect, [] as string[])
  .action(async (id: string, opts) => {
    await requireServices({ needsEmbedding: false });

    let updated = false;

    if (opts.kind) {
      validateKind(opts.kind);
      try {
        await changeKind(id, opts.kind);
        updated = true;
      } catch (err) {
        die(errorMessage(err));
      }
    }

    if (opts.tags.length > 0) {
      try {
        await changeTags(id, normalizeTags(opts.tags));
        updated = true;
      } catch (err) {
        die(errorMessage(err));
      }
    }

    if (opts.addRef.length > 0) {
      const newRefs = opts.addRef.map((raw: string) => {
        const colonIdx = raw.indexOf(":");
        if (colonIdx === -1) die(`Invalid --add-ref format: "${raw}". Expected: <id:reason>`);
        return { id: raw.slice(0, colonIdx), reason: raw.slice(colonIdx + 1) };
      });

      try {
        await addRefs(id, newRefs);
        updated = true;
      } catch (err) {
        die(errorMessage(err));
      }
    }

    if (!updated) die("Nothing to update. Use --kind, --tags or --add-ref.");

    out({ id, updated: true });
  });

// ─── browse ───────────────────────────────────────────────────────────────────

program
  .command("browse")
  .description("Browse memory without a semantic query (scroll)")
  .option("--kind <kind>", "Filter by semantic type")
  .option("--since <date>", "Minimum ISO creation date (e.g. 2025-01-01)")
  .option("--limit <n>", "Maximum number of results", "20")
  .action(async (opts) => {
    await requireServices({ needsEmbedding: false });

    if (opts.kind) validateKind(opts.kind);

    const notes = await browseNotes({
      kind: opts.kind as NoteType | undefined,
      since: opts.since,
      limit: parseInt(opts.limit, 10),
    });

    out(notes);
  });

// ─── graph ────────────────────────────────────────────────────────────────────

program
  .command("graph")
  .description("Open the Third Brain graph in the browser")
  .action(async () => {
    await requireServices({ needsEmbedding: false });
    serveGraph();
    const url = `http://localhost:${GRAPH_PORT}`;
    process.stdout.write(`Graph: ${url}\n`);
    spawnSync("xdg-open", [url], { stdio: "ignore" });
    await new Promise(() => {}); // keep process alive
  });

// ─── serve ────────────────────────────────────────────────────────────────────

program
  .command("serve")
  .description("Start the HTTP API (OpenAPI-compatible, for tool integrations)")
  .action(async () => {
    await requireServices({ needsEmbedding: false });
    serveApi();
    process.stdout.write(`API: http://localhost:${API_PORT} (spec: /openapi.json)\n`);
    await new Promise(() => {}); // keep process alive
  });

// ─── Parse ───────────────────────────────────────────────────────────────────

program.parseAsync(process.argv).catch((err) => {
  die(errorMessage(err));
});
