#!/usr/bin/env bun

import { Command } from "commander";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { checkHealth, EMBED_MODEL } from "./infra.js";
import { serveApi, API_PORT } from "./api.js";
import { noteById, createNote, addRefs, changeKind, changeTags, deleteNote, mergeNotes, searchNotes, browseNotes, randomNote, listNoteTags, resolveNoteId, markArchived, clearArchived } from "./notes.js";
import { getByIds } from "./qdrant.js";
import { refineReport, COUNTERS_START, REFINE_NOTES_LIMIT } from "./refine.js";
import type { NoteType, SearchOptions, Link } from "./types.js";
import { ContractError } from "../../common/contract.js";
import { NOTE_TYPES, isValidKind } from "./types.js";
import { collect, die, errorMessage, out, outText, readGuide } from "../../common/cli.js";
import { blocksOf, noteBlock } from "../../common/render.js";
import { normalizeTags } from "../../common/tags.js";

// ─── Compose path ─────────────────────────────────────────────────────────────

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const COMPOSE_FILE = resolve(__dirname, "../../../scripts/compose.qdrant.yml");

const QDRANT_POLL_RETRIES = 10;
const QDRANT_POLL_INTERVAL_MS = 1_000;

// ─── Output helpers ───────────────────────────────────────────────────────────

/** Accepts a full id or a unique prefix. */
async function resolveOrDie(idOrPrefix: string): Promise<string> {
  try {
    return await resolveNoteId(idOrPrefix);
  } catch (err) {
    die(errorMessage(err));
  }
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
  .option("--exchange <id>", "Id of the tl exchange the note comes from")
  .action(async (opts) => {
    validateKind(opts.kind);
    await requireServices({ needsEmbedding: true });

    const note = await createNote({
      what: opts.what,
      why: opts.why,
      kind: opts.kind,
      tags: normalizeTags(opts.tags),
      source: opts.source,
      exchange: opts.exchange,
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
  .option("--min-score <n>", "Minimum score to keep a direct hit (never cuts related notes)")
  .option("--related-limit <n>", "Maximum related notes kept, best score first")
  .option("--no-hits", "Do not count this search as a hit on the returned notes")
  .option("--no-archived", "Leave out the archived notes, related ones included")
  .option("--json", "Print the full results as JSON instead of text blocks")
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
      min_score: opts.minScore !== undefined ? parseFloat(opts.minScore) : undefined,
      related_limit: opts.relatedLimit !== undefined ? parseInt(opts.relatedLimit, 10) : undefined,
      record_hits: opts.hits,
      exclude_archived: opts.archived === false,
    };

    const results = await searchNotes(query, options);
    if (opts.json) out(results);
    else outText(blocksOf(results.map((result) => noteBlock(result.note))));
  });

// ─── meta ─────────────────────────────────────────────────────────────────────

program
  .command("meta <id>")
  .description("Print the whole note as JSON. Accepts a full id or a unique prefix.")
  .action(async (id: string) => {
    await requireServices({ needsEmbedding: false });

    try {
      out(await noteById(id));
    } catch (err) {
      die(errorMessage(err));
    }
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

    const target = await resolveOrDie(id);
    let updated = false;

    if (opts.kind) {
      validateKind(opts.kind);
      try {
        await changeKind(target, opts.kind);
        updated = true;
      } catch (err) {
        die(errorMessage(err));
      }
    }

    if (opts.tags.length > 0) {
      try {
        await changeTags(target, normalizeTags(opts.tags));
        updated = true;
      } catch (err) {
        die(errorMessage(err));
      }
    }

    if (opts.addRef.length > 0) {
      const newRefs: Link[] = [];
      for (const raw of opts.addRef as string[]) {
        const colonIdx = raw.indexOf(":");
        if (colonIdx === -1) die(`Invalid --add-ref format: "${raw}". Expected: <id:reason>`);
        newRefs.push({ id: await resolveOrDie(raw.slice(0, colonIdx)), reason: raw.slice(colonIdx + 1) });
      }

      try {
        await addRefs(target, newRefs);
        updated = true;
      } catch (err) {
        die(errorMessage(err));
      }
    }

    if (!updated) die("Nothing to update. Use --kind, --tags or --add-ref.");

    out({ id: target, updated: true });
  });

// ─── delete ───────────────────────────────────────────────────────────────────

program
  .command("delete <id>")
  .description("Delete a note and every ref/backref pointing to it")
  .option("--yes", "Confirm the deletion (without it, the note is only shown)")
  .action(async (id: string, opts) => {
    await requireServices({ needsEmbedding: false });

    const target = await resolveOrDie(id);

    if (!opts.yes) {
      const found = await getByIds([target]);
      if (found.length === 0) die(`Note not found: ${target}`);
      out(found[0]);
      die("Re-run with --yes to delete this note.");
    }

    try {
      out(await deleteNote(target));
    } catch (err) {
      die(errorMessage(err));
    }
  });

program
  .command("merge <into> <drops...>")
  .description("Move the refs, backrefs, tags and hits of the drops onto <into>, then delete the drops")
  .action(async (into: string, drops: string[]) => {
    await requireServices({ needsEmbedding: false });

    const intoId = await resolveOrDie(into);
    const dropIds: string[] = [];
    for (const drop of drops) dropIds.push(await resolveOrDie(drop));
    if (dropIds.includes(intoId)) die("A note cannot be merged into itself.");
    if (new Set(dropIds).size !== dropIds.length) die("A note is given twice.");

    try {
      out(await mergeNotes(intoId, dropIds));
    } catch (err) {
      if (err instanceof ContractError) throw err;
      die(errorMessage(err));
    }
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

// ─── refine ───────────────────────────────────────────────────────────────────

program
  .command("refine")
  .description("Print the trust spread, the notes under the floor and the plan. Writes only with --apply.")
  .option("--apply", "Write archived_at on the notes to archive, and remove it from the notes to restore")
  .action(async (opts) => {
    await requireServices({ needsEmbedding: false });

    try {
      const notes = await browseNotes({ limit: REFINE_NOTES_LIMIT });
      const now = new Date();
      const report = refineReport(notes, now, COUNTERS_START);

      if (!opts.apply) {
        out(report);
        return;
      }

      await markArchived(report.plan.archive.map((entry) => entry.id), now);
      await clearArchived(report.plan.restore.map((entry) => entry.id));
      out({ ...report, applied: { archived: report.plan.archive.length, restored: report.plan.restore.length } });
    } catch (err) {
      die(errorMessage(err));
    }
  });

// ─── serve ────────────────────────────────────────────────────────────────────

program
  .command("guide")
  .description("Print the quality rules of a note")
  .action(() => {
    outText(readGuide(new URL("../guide.md", import.meta.url)));
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

// ─── Parse ───────────────────────────────────────────────────────────────────

program.parseAsync(process.argv).catch((err) => {
  if (err instanceof ContractError) die(`tb bug, please report: ${err.message}\n${err.stack ?? ""}`);
  die(errorMessage(err));
});
