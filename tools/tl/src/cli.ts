#!/usr/bin/env bun

import { Command } from "commander";

import { ContractError, errorMessage } from "../../tb/src/types.js";
import { API_PORT, serveApi } from "./api.js";
import * as client from "./client.js";
import { ingestAll, ingestSession, ingestTranscript } from "./ingest.js";
import { dayOf, sumBy } from "./types.js";
import type { Exchange } from "./types.js";

// ─── Output helpers ───────────────────────────────────────────────────────────

function out(data: unknown): void {
  process.stdout.write(JSON.stringify(data, null, 2) + "\n");
}

function die(message: string): never {
  process.stderr.write(`Error: ${message}\n`);
  process.exit(1);
}

// How many exchanges a sum reads before it is wrong to do this in the client.
const COST_LIMIT = 5_000;
const PENDING_LIMIT = 50;

const program = new Command();

program.name("tl").description("Third Log — the archive of work done").version("1.0.0");

// ─── ingest ───────────────────────────────────────────────────────────────────

program
  .command("ingest")
  .description("Read transcripts into the archive. Idempotent: the same run twice changes nothing")
  .option("--transcript <path>", "One transcript file")
  .option("--session <id>", "One session, found by id")
  .option("--all", "Every transcript on this machine")
  .option("--since <iso>", "With --all, only files changed at or after this time")
  .action(async (opts) => {
    const chosen = [opts.transcript, opts.session, opts.all].filter(Boolean).length;
    if (chosen !== 1) die("Use exactly one of --transcript, --session or --all.");

    try {
      if (opts.transcript) return out(await ingestTranscript(opts.transcript));
      if (opts.session) return out(await ingestSession(opts.session));
      return out(await ingestAll(opts.since));
    } catch (err) {
      die(errorMessage(err));
    }
  });

// ─── sessions ─────────────────────────────────────────────────────────────────

program
  .command("sessions")
  .description("List sessions, newest first")
  .option("--limit <n>", "How many", "20")
  .action(async (opts) => {
    try {
      out(await client.fetchSessions(parseInt(opts.limit, 10)));
    } catch (err) {
      die(errorMessage(err));
    }
  });

// ─── show ─────────────────────────────────────────────────────────────────────

program
  .command("show <id>")
  .description("One exchange with its full input and output")
  .action(async (id: string) => {
    try {
      const [exchange, contents] = await Promise.all([client.fetchExchange(id), client.fetchContents(id)]);
      out({ ...exchange, input: contents.input, output: contents.output });
    } catch (err) {
      die(errorMessage(err));
    }
  });

// ─── cost ─────────────────────────────────────────────────────────────────────

program
  .command("cost")
  .description("Sum tokens by session, day or model")
  .option("--by <field>", "session | day | model", "day")
  .option("--since <iso>", "Only exchanges at or after this time")
  .option("--session <id>", "Only this session")
  .option("--limit <n>", "Exchanges read before summing", String(COST_LIMIT))
  .action(async (opts) => {
    const key = costKey(opts.by);
    if (!key) die("--by must be session, day or model.");

    try {
      const exchanges = await client.fetchExchanges({
        since: opts.since,
        session: opts.session,
        limit: parseInt(opts.limit, 10),
      });
      out(sumBy(exchanges, key));
    } catch (err) {
      die(errorMessage(err));
    }
  });

function costKey(by: string): ((e: Exchange) => string) | null {
  if (by === "day") return dayOf;
  if (by === "session") return (e) => e.session;
  if (by === "model") return (e) => e.model ?? "unknown";
  return null;
}

// ─── pending ──────────────────────────────────────────────────────────────────

program
  .command("pending")
  .description("Exchanges never distilled — the distiller's queue")
  .option("--limit <n>", "How many", String(PENDING_LIMIT))
  .action(async (opts) => {
    try {
      out(await client.fetchExchanges({ distilled: false, limit: parseInt(opts.limit, 10) }));
    } catch (err) {
      die(errorMessage(err));
    }
  });

// ─── serve ────────────────────────────────────────────────────────────────────

program
  .command("serve")
  .description("Run the HTTP service. This is the command the Rasp runs")
  .option("--port <n>", "Port", String(API_PORT))
  .option("--db <path>", "SQLite file to serve")
  .action(async (opts) => {
    serveApi(parseInt(opts.port, 10), opts.db);
    process.stdout.write(`tl: http://localhost:${opts.port} (spec: /openapi.json)\n`);
    await new Promise(() => {}); // keep process alive
  });

// ─── Parse ───────────────────────────────────────────────────────────────────

program.parseAsync(process.argv).catch((err) => {
  if (err instanceof ContractError) die(`tl bug, please report: ${err.message}\n${err.stack ?? ""}`);
  die(errorMessage(err));
});
