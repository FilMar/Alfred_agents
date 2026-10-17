#!/usr/bin/env bun

import { Command } from "commander";

import { assert, ContractError } from "../../common/contract.js";
import { API_PORT, serveApi } from "./api.js";
import * as client from "./client.js";
import { ingestAll, ingestSession, ingestTranscript } from "./ingest.js";
import { dayOf, HARNESSES, sumBy, TIMESTAMP_SHAPE } from "./types.js";
import type { Exchange } from "./types.js";
import { die, errorMessage, out, outText } from "../../common/cli.js";
import { blocksOf } from "../../common/render.js";
import { episodeById, searchEpisodes } from "./episode_store.js";
import { DAY_SHAPE, episodeBlock } from "./episodes.js";

// ─── Output helpers ───────────────────────────────────────────────────────────

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
  .option("--refresh", "Send every exchange again, so a better parser reaches old rows")
  .action(async (opts) => {
    const chosen = [opts.transcript, opts.session, opts.all].filter(Boolean).length;
    if (chosen !== 1) die("Use exactly one of --transcript, --session or --all.");

    try {
      const refresh = opts.refresh ?? false;
      if (opts.transcript) return out(await ingestTranscript(opts.transcript, refresh));
      if (opts.session) return out(await ingestSession(opts.session, refresh));
      return out(await ingestAll(opts.since, refresh));
    } catch (err) {
      die(errorMessage(err));
    }
  });

// ─── sessions ─────────────────────────────────────────────────────────────────

program
  .command("sessions")
  .description("List sessions, newest first")
  .option("--limit <n>", "How many", "20")
  .option("--harness <name>", `Only one tool: ${HARNESSES.join(" or ")}`)
  .action(async (opts) => {
    if (opts.harness !== undefined && !(HARNESSES as readonly string[]).includes(opts.harness)) {
      die(`--harness must be ${HARNESSES.join(" or ")}.`);
    }
    try {
      out(await client.fetchSessions({ harness: opts.harness, limit: parseInt(opts.limit, 10) }));
    } catch (err) {
      die(errorMessage(err));
    }
  });

// ─── search ───────────────────────────────────────────────────────────────────

program
  .command("search <query>")
  .description("Search the episodes by meaning")
  .option("--limit <n>", "Maximum number of results", "10")
  .option("--min-score <n>", "Minimum score to keep a result", "0.30")
  .option("--since <day>", "Only episodes that end on or after this day (YYYY-MM-DD)")
  .option("--until <day>", "Only episodes that begin on or before this day (YYYY-MM-DD)")
  .option("--json", "Print the full results as JSON instead of text blocks")
  .action(async (query: string, opts) => {
    const limit = parseInt(opts.limit, 10);
    const minScore = parseFloat(opts.minScore);
    if (!Number.isInteger(limit) || limit < 1) die("--limit must be a positive integer.");
    if (!Number.isFinite(minScore)) die("--min-score must be a number.");
    for (const [flag, day] of [["--since", opts.since], ["--until", opts.until]] as const) {
      if (day !== undefined && !DAY_SHAPE.test(day)) die(`${flag} must be a day like 2026-09-30.`);
    }
    const period = { since: opts.since ?? null, until: opts.until ?? null };
    if (period.since !== null && period.until !== null && period.since > period.until) die("--since is after --until.");
    try {
      const hits = await searchEpisodes(query, { limit, minScore, period });
      if (opts.json) out(hits);
      else outText(blocksOf(hits.map((hit) => episodeBlock(hit.episode))));
    } catch (err) {
      die(errorMessage(err));
    }
  });

// ─── episode ──────────────────────────────────────────────────────────────────

program
  .command("episode <id>")
  .description("Print the whole episode as JSON. Accepts a full id or a unique prefix.")
  .action(async (id: string) => {
    try {
      out(await episodeById(id));
    } catch (err) {
      die(errorMessage(err));
    }
  });

// ─── show ─────────────────────────────────────────────────────────────────────

program
  .command("show <id>")
  .description("One exchange with its full input and output")
  .option("--tools", "Also the tool calls and their results, which are left out otherwise")
  .action(async (id: string, opts) => {
    try {
      const [exchange, contents] = await Promise.all([client.fetchExchange(id), client.fetchContents(id, opts.tools === true)]);
      out({ ...exchange, input: contents.input, output: contents.output, ...(contents.tools !== undefined && { tools: contents.tools }) });
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

// ─── extractions ──────────────────────────────────────────────────────────────

program
  .command("extractions")
  .description("Candidates the distiller wrote, with where each one dropped and its verdict")
  .option("--extractor <id>", "Only this extractor row")
  .option("--run <iso>", "Only this run")
  .option("--exchange <id>", "Only this exchange")
  .option("--kept", "Only the candidates no check or critic dropped")
  .action(async (opts) => {
    const extractor = opts.extractor === undefined ? undefined : parseInt(opts.extractor, 10);
    if (extractor !== undefined && !Number.isInteger(extractor)) die("--extractor must be an extractor row id.");
    try {
      out(await client.fetchExtractions({ extractor_id: extractor, run: opts.run, exchange_id: opts.exchange, kept: opts.kept ? true : undefined }));
    } catch (err) {
      die(errorMessage(err));
    }
  });

// ─── distilled ────────────────────────────────────────────────────────────────

program
  .command("distilled <ids...>")
  .description("Mark exchanges as distilled, so they leave the queue. Do it for every one read, notes or not")
  .action(async (ids: string[]) => {
    try {
      const at = new Date().toISOString();
      assert(TIMESTAMP_SHAPE.test(at), "tl distilled: timestamp is ISO-8601 UTC");
      for (const id of ids) await client.markDistilled(id, at);
      out({ distilled: ids.length, at });
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
